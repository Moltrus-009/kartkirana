// No production imports or credentials. Run only against the explicit demo emulator.
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8189';
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createAccountDeletionService, verifyRecentPhone } = require('../services/accountDeletionService');
const { assertAccountAvailable } = require('../services/accountDeletionGuard');
const projectId = 'demo-kartkirana-deletion';
const app = initializeApp({projectId},'deletion-tests');
const db = getFirestore(app);
const authUsers = new Map(), files = new Set();
let failStorage=false, failAuth=false, authCalls=0;
const auth = {
  async getUser(uid) { if (!authUsers.has(uid)) throw Object.assign(new Error('missing'),{code:'auth/user-not-found'}); return authUsers.get(uid); },
  async deleteUser(uid) { if(failAuth)throw new Error('Auth unavailable'); authCalls++; if(!authUsers.delete(uid))throw Object.assign(new Error('missing'),{code:'auth/user-not-found'}); }
};
const bucket={async deleteFiles({prefix}){if(failStorage)throw new Error('Storage unavailable');for(const f of files)if(f.startsWith(prefix))files.delete(f);}};
const service=createAccountDeletionService({db,auth,bucket});
const claims=uid=>({uid,phone_number:'+919800000001',auth_time:Math.floor(Date.now()/1000),firebase:{sign_in_provider:'phone'}});
const review={obligationsCleared:true,retentionReviewed:true,evidenceReference:'TEST-RECONCILIATION-001'};
async function seed(uid,type,extras={}){
  authUsers.set(uid,{uid,customClaims:{}});
  const collection=type==='customer'?'users':type==='rider'?'riders':'merchants';
  await db.collection(collection).doc(uid).set({uid,phone:'+919800000001',role:type==='shopkeeper'?'owner':type,...extras});
  files.add(`${type==='rider'?'riders':'users'}/${uid}/profile.jpg`);
}
const request=(uid,type)=>service.request(claims(uid),type,{confirm:'DELETE'});
async function approveProcess(r){await service.review(r.id,'test-reviewer',review);await service.process(r.id);return (await db.collection('accountDeletionRequests').doc(r.id).get()).data();}
test.before(async()=>{
  const res=await fetch(`http://127.0.0.1:8189/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'});assert.equal(res.ok,true);
});
test.after(async()=>{await db.terminate();});
test('recent verified phone is mandatory; stale/custom/future tokens fail',()=>{
  verifyRecentPhone(claims('fresh'));
  for(const c of [{...claims('a'),auth_time:0},{...claims('b'),phone_number:null},{...claims('c'),firebase:{sign_in_provider:'custom'}},{...claims('d'),auth_time:Date.now()/1000+120}])assert.throws(()=>verifyRecentPhone(c));
});
test('reject UID/phone injection, wrong role, missing account and invalid type',async()=>{
  await seed('security','customer');
  await assert.rejects(()=>service.request(claims('security'),'customer',{confirm:'DELETE',uid:'victim'}),{statusCode:400});
  await assert.rejects(()=>service.request(claims('security'),'customer',{confirm:'DELETE',phoneNumber:'+91111'}),{statusCode:400});
  await assert.rejects(()=>request('security','rider'),{statusCode:404});
  await assert.rejects(()=>request('security','admin'),{statusCode:400});
});
test('concurrent duplicates create one durable request and no immediate deletion',async()=>{
  await seed('duplicates','customer');
  const results=await Promise.all([request('duplicates','customer'),request('duplicates','customer')]);
  assert.equal(results[0].id,results[1].id);assert.equal(results[0].status,'PENDING_REVIEW');assert(authUsers.has('duplicates'));
  assert.equal((await db.collection('accountDeletionRequests').doc(results[0].id).collection('audit').get()).size,1);
});
test('customer cleanup deletes profile/subcollections/files/auth, retains money and order totals',async()=>{
  await seed('customer-clean','customer',{addresses:[{address:'Private home'}],fcmToken:'secret'});
  await db.doc('complaints/customer-support').set({userId:'customer-clean',userType:'customer',status:'CLOSED',contactPhone:'private',userName:'Private Name',message:'Retained dispute evidence'});
  await db.doc('users/customer-clean/notifications/n').set({body:'Private'});
  await db.doc('orders/customer-order').set({userId:'customer-clean',status:'COMPLETED',total:400,deliveryAddress:{phone:'secret'},timeline:[{status:'COMPLETED',description:'private phone'}]});
  await db.doc('orders/customer-order/messages/m').set({text:'Private chat'});
  await db.doc('calls/customer-order/callerCandidates/c').set({candidate:'private'});
  await db.doc('payments/customer-money').set({userId:'customer-clean',status:'CAPTURED',amount:400,orderId:'customer-order'});
  await db.doc('reviews/customer-review').set({userId:'customer-clean',text:'Review'});
  await db.doc('routines/customer-routine').set({userId:'customer-clean',status:'ACTIVE'});
  await db.doc('routineExecutions/customer-execution').set({userId:'customer-clean',status:'UPCOMING'});
  await db.doc('sharedCarts/customer-share').set({creatorUserId:'customer-clean',items:[]});
  const r=await request('customer-clean','customer'), done=await approveProcess(r);
  assert.equal(done.status,'COMPLETED');assert.equal(done.authRetained,false);assert(!authUsers.has('customer-clean'));
  assert(!(await db.doc('users/customer-clean').get()).exists);assert((await db.collection('users/customer-clean/notifications').get()).empty);
  assert(!files.has('users/customer-clean/profile.jpg'));assert(!(await db.doc('reviews/customer-review').get()).exists);
  assert(!(await db.doc('routines/customer-routine').get()).exists);
  assert(!(await db.doc('routineExecutions/customer-execution').get()).exists);
  assert(!(await db.doc('sharedCarts/customer-share').get()).exists);
  const order=(await db.doc('orders/customer-order').get()).data();assert.equal(order.total,400);assert.equal(order.deliveryAddress,null);assert.equal(order.userId,'customer-clean');
  assert((await db.collection('orders/customer-order/messages').get()).empty);assert(!(await db.doc('calls/customer-order/callerCandidates/c').get()).exists);
  assert.equal((await db.doc('payments/customer-money').get()).data().amount,400);
  const support=(await db.doc('complaints/customer-support').get()).data();assert.equal(support.contactPhone,'');assert.equal(support.message,'Retained dispute evidence');
  const calls=authCalls;await service.process(r.id);assert.equal(authCalls,calls);
});
test('active orders/deliveries and unknown states fail closed without disabling account',async()=>{
  for(const [uid,type,status] of [['active-c','customer','PLACED'],['active-r','rider','OUT_FOR_DELIVERY'],['unknown','customer','NEW_UNKNOWN_STATUS']]){
    await seed(uid,type);await db.doc(`orders/${uid}`).set({[type==='rider'?'riderId':'userId']:uid,status});
    const r=await request(uid,type);assert.equal(r.status,'BLOCKED');assert(r.blockers.includes('ACTIVE_ORDER_OR_DELIVERY'));
    await assert.rejects(()=>service.review(r.id,'reviewer',review),{statusCode:409});assert(authUsers.has(uid));assert(!(await db.doc(`accountDeletionState/${uid}`).get()).exists);
  }
});
test('pending payout, uncollected COD and open shop cannot be approved',async()=>{
  await seed('pending-money','rider');await db.doc('payouts/pending-money').set({riderId:'pending-money',status:'PENDING'});
  assert((await request('pending-money','rider')).blockers.includes('UNRESOLVED_PAYOUT_REFUND_OR_DISPUTE'));
  await seed('cod','customer');await db.doc('payments/cod').set({userId:'cod',status:'COD_PENDING'});
  assert((await request('cod','customer')).blockers.includes('PAYMENT_RECONCILIATION_PENDING'));
  await seed('open-shop','shopkeeper',{shopId:'shop-open'});await db.doc('shops/shop-open').set({ownerId:'open-shop',isOpen:true});
  assert((await request('open-shop','shopkeeper')).blockers.includes('CLOSE_SHOP_FIRST'));
});
test('shopkeeper cleanup retains closed shop/catalog/history but removes owner contact',async()=>{
  await seed('merchant-clean','shopkeeper',{shopId:'shop-clean'});await db.doc('shops/shop-clean').set({ownerId:'merchant-clean',phone:'secret',status:'closed',isOpen:false});
  await db.doc('products/retained-product').set({shopId:'shop-clean',stock:5});
  const done=await approveProcess(await request('merchant-clean','shopkeeper'));assert.equal(done.status,'COMPLETED');
  const shop=(await db.doc('shops/shop-clean').get()).data();assert.equal(shop.phone,'');assert(shop.ownerId.startsWith('deleted_'));assert.equal(shop.isOpen,false);assert((await db.doc('products/retained-product').get()).exists);
});
test('rider cleanup preserves settlement joins and removes location/documents',async()=>{
  await seed('rider-clean','rider',{coords:{lat:1,lng:2},aadhaarUrl:'private'});files.add('riders/rider-clean/aadhaar.jpg');
  await db.doc('orders/rider-clean').set({riderId:'rider-clean',status:'DELIVERED',rider:{uid:'rider-clean',phone:'secret',coords:{lat:1,lng:2}}});
  const done=await approveProcess(await request('rider-clean','rider'));assert.equal(done.status,'COMPLETED');
  const order=(await db.doc('orders/rider-clean').get()).data();assert.equal(order.rider,null);assert.equal(order.riderId,'rider-clean');assert(!files.has('riders/rider-clean/aadhaar.jpg'));
});
test('multi-role deletion preserves other profiles, shared Auth and shared files',async()=>{
  await seed('multi','customer');await seed('multi','rider');await db.doc('users/multi/notifications/rider-notice').set({orderId:'rider-notice'});
  const done=await approveProcess(await request('multi','customer'));assert.equal(done.authRetained,true);assert(authUsers.has('multi'));assert((await db.doc('riders/multi').get()).exists);assert(files.has('users/multi/profile.jpg'));assert((await db.doc('users/multi/notifications/rider-notice').get()).exists);
  const last=await approveProcess(await request('multi','rider'));assert.equal(last.authRetained,false);assert(!authUsers.has('multi'));assert(!files.has('users/multi/profile.jpg'));
});
test('storage/Auth outage retains durable lock and retries after partial deletion',async()=>{
  await seed('retry','customer');const r=await request('retry','customer');await service.review(r.id,'reviewer',review);
  failStorage=true;await assert.rejects(()=>service.process(r.id));failStorage=false;
  assert.equal((await db.doc('accountDeletionState/retry').get()).data().processing,true);assert((await db.doc('users/retry').get()).exists);
  failAuth=true;await assert.rejects(()=>service.process(r.id));failAuth=false;
  assert(!(await db.doc('users/retry').get()).exists);assert.equal((await db.doc(`accountDeletionRequests/${r.id}`).get()).data().status,'PROCESSING');
  await service.process(r.id);assert.equal((await db.doc(`accountDeletionRequests/${r.id}`).get()).data().status,'COMPLETED');assert(!authUsers.has('retry'));
});
test('new order after review invalidates approval and prevents cleanup',async()=>{
  await seed('race','customer');const r=await request('race','customer');await service.review(r.id,'reviewer',review);
  await db.doc('orders/new-race').set({userId:'race',status:'PLACED'});await service.process(r.id);
  assert.equal((await db.doc(`accountDeletionRequests/${r.id}`).get()).data().status,'BLOCKED');assert(authUsers.has('race'));
});
test('order checkpoints survive interrupted cleanup without reprocessing completed targets',async()=>{
  await seed('checkpoint','customer');
  for(const id of ['checkpoint-a','checkpoint-b']) await db.doc(`orders/${id}`).set({userId:'checkpoint',status:'DELIVERED',deliveryAddress:{address:'Private'}});
  const r=await request('checkpoint','customer');await service.review(r.id,'reviewer',review);
  const original=db.recursiveDelete.bind(db);let calls=0;
  db.recursiveDelete=async(...args)=>{if(++calls===3)throw new Error('Injected chat cleanup outage');return original(...args);};
  try{await assert.rejects(()=>service.process(r.id));}finally{db.recursiveDelete=original;}
  const targets=await db.collection(`accountDeletionRequests/${r.id}/targets`).get();
  assert.equal(targets.docs.filter(d=>d.data().cleaned).length,1);
  const first=(await db.doc('orders/checkpoint-a').get()).updateTime.toMillis();
  await service.process(r.id);
  assert.equal((await db.doc('orders/checkpoint-a').get()).updateTime.toMillis(),first);
  assert.equal((await db.doc(`accountDeletionRequests/${r.id}`).get()).data().status,'COMPLETED');
});
test('transaction guard rejects locked and completed identities, preserves normal users',async()=>{
  await db.doc('accountDeletionState/locked').set({processing:true});await db.doc('accountDeletionState/role-deleted').set({customer:'COMPLETED'});
  await assert.rejects(()=>db.runTransaction(tx=>assertAccountAvailable(db,tx,'locked','rider')),{statusCode:409});
  await assert.rejects(()=>db.runTransaction(tx=>assertAccountAvailable(db,tx,'role-deleted','customer')),{statusCode:409});
  await db.runTransaction(tx=>assertAccountAvailable(db,tx,'role-deleted','rider'));
});
test('distributed per-identity limiter blocks repeated verification requests',async()=>{
  await seed('limited','customer');
  for(let i=0;i<20;i++)await service.status(claims('limited'),'customer');
  await assert.rejects(()=>service.status(claims('limited'),'customer'),{statusCode:429});
});

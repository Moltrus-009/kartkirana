// Emulator only. Configuration and gateway imports are replaced before loading services.
const assert=require('node:assert/strict');
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8189';
const {Firestore}=require('@google-cloud/firestore');
const projectId='demo-commerce-planning';
const db=new Firestore({projectId,host:'127.0.0.1:8189',ssl:false});
function replace(path,exports){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports};}
replace('../config/firebase',{db});
let gatewayCalls=0;
replace('../providers/razorpay/RazorpayProvider',{environment:'TEST',keyId:'rzp_test_emulator',createGatewayOrder:async()=>({id:`gateway_${++gatewayCalls}`})});
const Payment=require('../services/paymentService');
const Order=require('../services/orderService');
const {createRoutineService}=require('../services/routineService');
const {createSharedCartService}=require('../services/sharedCartService');
const {windowFor,indiaDate,addDays}=require('../services/planningCalendar');
const {occurrenceId}=require('../services/routineExecution');
const startDate=addDays(indiaDate(Date.now()),2);
const start=Date.parse(windowFor(startDate,'09-11').scheduledDeliveryStart);
let clock=Date.now();
const price=(items,shop,uid)=>Order.calculatePriceBreakdown(items,shop,null,0,'',uid);
const factory=()=>createRoutineService({db,now:()=>clock,price,checkout:(...args)=>Payment.initPayment(...args)});
const service=factory();
const address={id:'address1',name:'Home',details:'Test street',area:'Test area',city:'Test city',pinCode:'273001',lat:26.76,lng:83.37,isDefault:true};
const body={name:'Daily rice',startDate,slotId:'09-11',recurrenceType:'DAILY',paymentMethod:'cod',addressId:address.id,items:[{productId:'rice',quantity:2}]};
async function reset(){
  clock=Date.now();gatewayCalls=0;
  const response=await fetch(`http://127.0.0.1:8189/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'});assert.equal(response.ok,true);
  await db.doc('users/customer1').set({uid:'customer1',addresses:[address]});
  await db.doc('shops/shop1').set({name:'Test Shop',ownerId:'merchant1',status:'open',lat:26.76,lng:83.37,deliveryRadius:5});
  await db.doc('products/rice').set({name:'Rice',shopId:'shop1',price:100,stock:20,totalStock:20,reservedStock:0,status:'active',weight:'1 kg',brand:'Test'});
}
async function create(overrides={}){return service.save('customer1',{...body,...overrides},'fixture_idempotency_key_001');}
async function execution(r){return (await db.doc(`routineExecutions/${occurrenceId(r.id,r.nextScheduledFor)}`).get()).data();}
async function test(name,fn){await reset();await fn();console.log(`PASS ${name}`);}
(async()=>{
  await test('share: secure projection, expiry, idempotency conflict, current location matching',async()=>{
    const shares=createSharedCartService({db,now:()=>clock});
    const [a,b]=await Promise.all([shares.create('customer1',body,'share_idempotency_key_001'),shares.create('customer1',body,'share_idempotency_key_001')]);
    assert.equal(a.token,b.token);assert.match(a.token,/^[a-f0-9]{64}$/);
    const publicCart=await shares.read(a.token);assert.equal(publicCart.creatorUserId,undefined);assert.equal(publicCart.items[0].phone,undefined);
    assert.equal((await shares.match(a.token,address)).shops[0].availableCount,1);
    assert.equal((await shares.match(a.token,{lat:10,lng:70})).shops.length,0);
    await assert.rejects(shares.create('customer1',{items:[{productId:'rice',quantity:3}]},'share_idempotency_key_001'));
    clock+=8*86400000;await assert.rejects(shares.read(a.token));
  });
  await test('concurrent workers and replay create one COD order and one inventory deduction',async()=>{
    const r=await create();clock=start-40*60000;
    await Promise.all([service.sweep(),factory().sweep()]);
    const e=await execution(r);assert.equal(e.status,'ORDER_CREATED');
    assert.equal((await db.collection('orders').get()).size,1);
    assert.equal((await db.doc('products/rice').get()).data().stock,18);
    assert.equal((await db.collection('payments').get()).size,1);assert.equal(gatewayCalls,0);
    const replay=await Payment.initPayment('customer1','shop1',body.items,address,null,0,'',windowFor(startDate,'09-11'),'','cod',{executionId:occurrenceId(r.id,r.nextScheduledFor)});
    assert.equal(replay.orderId,e.generatedOrderId);
    await service.sweep();assert.equal((await db.doc('products/rice').get()).data().stock,18);
    assert.equal((await db.collection('notificationQueue').get()).size,3);
  });
  await test('online occurrence remains pending until explicit checkout, then reserves once',async()=>{
    const r=await create({paymentMethod:'online'});clock=start-40*60000;await service.sweep();
    const id=occurrenceId(r.id,r.nextScheduledFor);assert.equal((await execution(r)).status,'AWAITING_CONFIRMATION');assert.equal(gatewayCalls,0);
    const p=await service.checkoutContext('customer1',id,{shopId:'shop1',items:body.items,deliveryAddress:address,amount:205});
    await Payment.initPayment('customer1','shop1',p.items,p.address,null,0,'',p.schedule,'','razorpay',p.context);
    assert.equal((await execution(r)).status,'ORDER_CREATED');assert.equal(gatewayCalls,1);
    assert.equal((await db.doc('products/rice').get()).data().reservedStock,2);
    await assert.rejects(service.plan('other-user',id));
  });
  await test('price increase over allowed limit asks for confirmation and does not charge',async()=>{
    const r=await create();await db.doc('products/rice').update({price:150});clock=start-40*60000;await service.sweep();
    assert.equal((await execution(r)).status,'AWAITING_CONFIRMATION');assert.equal((await db.collection('orders').get()).size,0);
  });
  await test('removed address fails safely without consuming inventory',async()=>{
    const r=await create();await db.doc('users/customer1').update({addresses:[]});clock=start-40*60000;await service.sweep();
    assert.equal((await execution(r)).reason,'ADDRESS_REMOVED');assert.equal((await db.collection('orders').get()).size,0);
  });
  await test('insufficient stock never creates a partial routine order',async()=>{
    const r=await create();await db.doc('products/rice').update({stock:1,totalStock:1});clock=start-40*60000;await service.sweep();
    assert.equal((await execution(r)).reason,'ITEM_UNAVAILABLE');assert.equal((await db.collection('orders').get()).size,0);
  });
  await test('authorized exact merchant fallback uses one shop and requires no medicine substitution',async()=>{
    const r=await create({merchantFallback:'AUTO_EXACT'});
    await db.doc('shops/shop2').set({name:'Nearby Shop',ownerId:'merchant2',status:'open',lat:26.761,lng:83.37,deliveryRadius:5});
    const product=(await db.doc('products/rice').get()).data();await db.doc('products/rice2').set({...product,shopId:'shop2'});
    await db.doc('shops/shop1').update({status:'closed'});clock=start-40*60000;await service.sweep();
    const e=await execution(r);assert.equal(e.status,'ORDER_CREATED');const order=(await db.doc(`orders/${e.generatedOrderId}`).get()).data();assert.equal(order.shopId,'shop2');assert.equal(order.items[0].productId,'rice2');
    assert.equal((await db.doc('products/rice').get()).data().stock,20);
  });
  await test('ask-first merchant fallback does not create an automatic order',async()=>{
    const r=await create({merchantFallback:'ASK'});
    await db.doc('shops/shop2').set({name:'Nearby Shop',ownerId:'merchant2',status:'open',lat:26.761,lng:83.37});
    await db.doc('products/rice2').set({...(await db.doc('products/rice').get()).data(),shopId:'shop2'});
    await db.doc('shops/shop1').update({status:'closed'});clock=start-40*60000;await service.sweep();
    assert.equal((await execution(r)).reason,'MERCHANT_CONFIRMATION_REQUIRED');assert.equal((await db.collection('orders').get()).size,0);
  });
  await test('expired window records failure and never backfills an immediate order',async()=>{
    const r=await create();clock=start+3*3600000;await service.sweep();
    assert.equal((await execution(r)).reason,'WINDOW_EXPIRED');assert.equal((await db.collection('orders').get()).size,0);
  });
  await test('advance notice is sent once and expired worker leases recover',async()=>{
    const r=await create();clock=start-20*3600000;await service.sweep();await service.sweep();
    assert.equal((await db.collection('notificationQueue').get()).size,1);
    const id=occurrenceId(r.id,r.nextScheduledFor);
    await db.doc(`routineExecutions/${id}`).update({status:'PROCESSING',leaseToken:'crashed-worker',leaseUntil:new Date(start-50*60000).toISOString()});
    clock=start-40*60000;await service.sweep();assert.equal((await execution(r)).status,'ORDER_CREATED');
  });
  await test('pause, resume, skip, cancellation and ownership controls',async()=>{
    const r=await create();await assert.rejects(service.action('attacker',r.id,{action:'CANCEL'}));
    await service.action('customer1',r.id,{action:'PAUSE'});clock=start-40*60000;await service.sweep();assert.equal((await db.collection('orders').get()).size,0);
    clock=Date.now();await service.action('customer1',r.id,{action:'RESUME'});await service.action('customer1',r.id,{action:'SKIP'});
    assert.equal((await execution(r)).status,'SKIPPED');
    await service.action('customer1',r.id,{action:'CANCEL'});clock=start+86400000;await service.sweep();assert.equal((await db.collection('orders').get()).size,0);
  });
  await test('cancellation races cannot commit an old planned occurrence',async()=>{
    const r=await create({paymentMethod:'online'});clock=start-40*60000;await service.sweep();
    const p=await service.checkoutContext('customer1',occurrenceId(r.id,r.nextScheduledFor),{shopId:'shop1',items:body.items,deliveryAddress:address,amount:205});
    await service.action('customer1',r.id,{action:'CANCEL'});
    await assert.rejects(Payment.initPayment('customer1','shop1',p.items,p.address,null,0,'',p.schedule,'','cod',p.context));
    assert.equal((await db.collection('orders').get()).size,0);assert.equal((await db.doc('products/rice').get()).data().stock,20);
  });
  await test('account deletion lock prevents routine and share creation and execution',async()=>{
    const r=await create();await db.doc('accountDeletionState/customer1').set({processing:true});clock=start-40*60000;await service.sweep();
    assert.equal((await db.collection('orders').get()).size,0);
    await assert.rejects(createSharedCartService({db}).create('customer1',body,'deletion_share_key_001'));
    await assert.rejects(service.action('customer1',r.id,{action:'RESUME'}));
  });
  console.log('All commerce emulator integration scenarios passed.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.terminate());

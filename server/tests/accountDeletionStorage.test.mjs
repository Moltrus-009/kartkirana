import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc} from 'firebase/firestore';
import {ref,uploadBytes,getMetadata} from 'firebase/storage';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getStorage} from 'firebase-admin/storage';
process.env.FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9199';
const adminApp=initializeApp({projectId:'demo-deletion-integration',storageBucket:'demo-deletion-integration.appspot.com'},'storage-deletion-test');
const env=await initializeTestEnvironment({projectId:'demo-deletion-integration',firestore:{host:'127.0.0.1',port:8181,rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')},storage:{host:'127.0.0.1',port:9199,rules:await readFile(new URL('../../storage.rules',import.meta.url),'utf8')}});
try{
 await env.clearFirestore();await env.clearStorage();
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),'shops','shop'),{ownerId:'merchant'});
  await setDoc(doc(ctx.firestore(),'orders','order'),{shopId:'shop',userId:'customer',riderId:'rider'});
 });
 await getStorage(adminApp).bucket().file('orders/order/invoice.pdf').save(Buffer.from('test'),{metadata:{contentType:'application/pdf'}});
 for(const uid of ['customer','rider','merchant']) {
  console.log(`Checking retained invoice access: ${uid}`);
  await assertSucceeds(getMetadata(ref(env.authenticatedContext(uid).storage('gs://demo-deletion-integration.appspot.com'),'orders/order/invoice.pdf')));
 }
 await assertFails(getMetadata(ref(env.authenticatedContext('stranger').storage('gs://demo-deletion-integration.appspot.com'),'orders/order/invoice.pdf')));
 const rider=env.authenticatedContext('rider').storage('gs://demo-deletion-integration.appspot.com');
 await assertSucceeds(uploadBytes(ref(rider,'riders/rider/license.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),'accountDeletionState','rider'),{processing:true});
  await setDoc(doc(ctx.firestore(),'accountDeletionState','customer'),{customer:'COMPLETED'});
  await setDoc(doc(ctx.firestore(),'accountDeletionState','merchant'),{shopkeeper:'COMPLETED'});
  await setDoc(doc(ctx.firestore(),'shops','shop'),{ownerId:'deleted_alias'});
 });
 await assertFails(uploadBytes(ref(rider,'riders/rider/another.jpg'),new Uint8Array([1]),{contentType:'image/jpeg'}));
 await assertFails(getMetadata(ref(rider,'orders/order/invoice.pdf')));
 await assertFails(getMetadata(ref(env.authenticatedContext('customer').storage('gs://demo-deletion-integration.appspot.com'),'orders/order/invoice.pdf')));
 await assertFails(getMetadata(ref(env.authenticatedContext('merchant').storage('gs://demo-deletion-integration.appspot.com'),'orders/order/invoice.pdf')));
 await assertFails(uploadBytes(ref(env.authenticatedContext('merchant',{shopId:'shop'}).storage('gs://demo-deletion-integration.appspot.com'),'shops/shop/logo.png'),new Uint8Array([1]),{contentType:'image/png'}));
 console.log('PASS: Storage locks, role tombstones, stale shop claims, normal order participant reads within two-document limit');
}finally{await env.cleanup();await deleteApp(adminApp);}

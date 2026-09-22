import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,Timestamp} from 'firebase/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8189');
const env=await initializeTestEnvironment({projectId:'demo-commerce-rules',firestore:{host:'127.0.0.1',port:8189,rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')}});
try{
  await env.clearFirestore();
  const client=env.authenticatedContext('customer').firestore(),anon=env.unauthenticatedContext().firestore();
  for(const collection of ['sharedCarts','routines','routineExecutions','planningRateLimits']){
    await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),collection,'test'),{userId:'customer',creatorUserId:'customer'}));
    await assertFails(getDoc(doc(client,collection,'test')));await assertFails(getDoc(doc(anon,collection,'test')));
    await assertFails(setDoc(doc(client,collection,'forged'),{userId:'customer',status:'ORDER_CREATED'}));
  }
  await env.withSecurityRulesDisabled(async c=>{
    const d=c.firestore();await setDoc(doc(d,'riders','rider'),{uid:'rider',role:'rider',documentStatus:'verified',online:true,status:'online'});
    await setDoc(doc(d,'orders','future'),{userId:'customer',shopId:'shop',status:'SHOP_ACCEPTED',riderId:null,currentRiderId:'rider',dispatchNotBefore:Timestamp.fromMillis(Date.now()+3600000)});
    await setDoc(doc(d,'orders','due'),{userId:'customer',shopId:'shop',status:'SHOP_ACCEPTED',riderId:null,currentRiderId:'rider',dispatchNotBefore:Timestamp.fromMillis(Date.now()-3600000)});
  });
  const rider=env.authenticatedContext('rider').firestore();
  const assignment={status:'RIDER_ASSIGNED',riderId:'rider',currentRiderId:'rider'};
  await assertFails(updateDoc(doc(rider,'orders','future'),assignment));
  await assertSucceeds(updateDoc(doc(rider,'orders','due'),assignment));
  console.log('PASS server-only planning data, forged mutations, early rider acceptance denied, due acceptance allowed');
}finally{await env.cleanup();}

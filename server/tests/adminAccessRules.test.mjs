import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import assert from 'node:assert/strict';
const env = await initializeTestEnvironment({ projectId:'demo-admin-access', firestore:{host:'127.0.0.1',port:8189,rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')} });
try {
  await env.withSecurityRulesDisabled(async c => {
    const db=c.firestore();
    await setDoc(doc(db,'shops','shop-test'),{ownerId:'merchant-test',status:'closed'});
    await setDoc(doc(db,'merchants','merchant-test'),{uid:'merchant-test',role:'owner',shopId:null,accountStatus:'pending'});
    await setDoc(doc(db,'riders','rider-test'),{uid:'rider-test',documentStatus:'pending',status:'offline'});
  });
  for (const phone of ['+919580184045','+918604519629']) {
    const db=env.authenticatedContext(`admin-${phone}`,{phone_number:phone,admin:true,role:'super_admin'}).firestore();
    await assertSucceeds(setDoc(doc(db,'coupons','TEST'),{code:'TEST',type:'percentage',value:10,status:'active'}));
    const batch=writeBatch(db);
    batch.update(doc(db,'shops','shop-test'),{verificationStep:'approved',status:'open',isOpen:true});
    batch.update(doc(db,'merchants','merchant-test'),{shopId:'shop-test',accountStatus:'active'});
    await assertSucceeds(batch.commit());
    await assertSucceeds(updateDoc(doc(db,'riders','rider-test'),{verificationStatus:'approved',documentStatus:'verified'}));
    assert.equal((await getDoc(doc(db,'riders','rider-test'))).data().documentStatus,'verified');
  }
  for (const claims of [{phone_number:'+919800000001',admin:true,role:'super_admin'},{phone_number:'+919580184045'}]) {
    const db=env.authenticatedContext('outsider',claims).firestore();
    await assertFails(setDoc(doc(db,'coupons','UNAUTHORISED'),{value:100}));
    await assertFails(updateDoc(doc(db,'riders','rider-test'),{documentStatus:'verified'}));
    await assertFails(updateDoc(doc(db,'shops','shop-test'),{verificationStep:'approved'}));
  }
  console.log('PASS: both authorised admins can create coupons and approve shops/riders; other numbers and missing claims are denied.');
} finally {await env.cleanup();}

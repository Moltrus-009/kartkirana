import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,updateDoc,onSnapshot,getDoc,collection} from 'firebase/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8181');
const env=await initializeTestEnvironment({projectId:'demo-rider-approval',firestore:{host:'127.0.0.1',port:8181,rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')}});
const unsub=[];
const observe=(target,predicate)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Live approval update timed out')),10000);unsub.push(onSnapshot(target,s=>{if(predicate(s)){clearTimeout(timer);resolve(s);}},reject));});
try{
 const rider=env.authenticatedContext('rider-test',{phone_number:'+919800000001'}).firestore();
 const admin=env.authenticatedContext('admin-test',{phone_number:'+919580184045',admin:true,role:'super_admin'}).firestore();
 const appeared=observe(collection(admin,'riders'),s=>s.docs.some(d=>d.id==='rider-test'&&d.data().documentStatus==='pending'));
 await assertSucceeds(setDoc(doc(rider,'riders','rider-test'),{uid:'rider-test',phone:'+919800000001',role:'rider',fullName:'Test Rider',documentStatus:'pending',status:'offline',createdAt:new Date().toISOString()}));
 await appeared;
 await assertSucceeds(updateDoc(doc(rider,'riders','rider-test'),{dlUrl:'https://example.test/license',aadhaarUrl:'https://example.test/id',rcUrl:'https://example.test/rc'}));
 await assertFails(updateDoc(doc(rider,'riders','rider-test'),{online:true,status:'online'}));
 await assertFails(updateDoc(doc(rider,'riders','rider-test'),{documentStatus:'verified',verificationStatus:'approved'}));
 const approved=observe(doc(rider,'riders','rider-test'),s=>s.data()?.documentStatus==='verified');
 await assertSucceeds(updateDoc(doc(admin,'riders','rider-test'),{verificationStatus:'approved',documentStatus:'verified'}));
 await approved;
 await assertSucceeds(updateDoc(doc(rider,'riders','rider-test'),{online:true,status:'online',updatedAt:new Date().toISOString(),coords:{lat:26.76,lng:83.37}}));
 assert.equal((await getDoc(doc(admin,'riders','rider-test'))).data().online,true);
 console.log('PASS: new rider appears live in admin, approval reaches signed-in rider, rider goes online without re-login');
}finally{unsub.forEach(fn=>fn());await env.cleanup();}

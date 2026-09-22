import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc} from 'firebase/firestore';
assert.equal(process.env.FIRESTORE_EMULATOR_HOST,'127.0.0.1:8189');
const env=await initializeTestEnvironment({projectId:'demo-deletion-rules',firestore:{host:'127.0.0.1',port:8189,rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')}});
try {
 await env.clearFirestore();
 const uid='deletion-user', phone='+919800000001';
 const client=env.authenticatedContext(uid,{phone_number:phone}).firestore();
 const anon=env.unauthenticatedContext().firestore();
 const profile={uid,role:'customer',name:'Test',phone,email:'',profileImage:'',addresses:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastLogin:new Date().toISOString()};
 await assertSucceeds(setDoc(doc(client,'users',uid),profile));
 await assertFails(setDoc(doc(client,'accountDeletionState',uid),{processing:false}));
 await assertFails(setDoc(doc(client,'accountDeletionRequests','forged'),{uid,verified:true,status:'APPROVED'}));
 await assertFails(getDoc(doc(anon,'accountDeletionState',uid)));
 await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),'accountDeletionState',uid),{processing:true});
 });
 await assertFails(updateDoc(doc(client,'users',uid),{name:'Race'}));
 await assertFails(getDoc(doc(client,'users',uid)));
 await assertSucceeds(getDoc(doc(client,'accountDeletionState',uid)));
 await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),'accountDeletionState',uid),{processing:false,customer:'COMPLETED'});
 });
 await assertFails(setDoc(doc(client,'users',uid),profile));
 await assertSucceeds(setDoc(doc(client,'merchants',uid),{uid,role:'owner',phone,fullName:'Preserved role',shopId:null,accountStatus:'pending',createdAt:new Date().toISOString(),lastLogin:new Date().toISOString()}));
 await env.withSecurityRulesDisabled(async ctx=>{
   await setDoc(doc(ctx.firestore(),'accountDeletionState',uid),{processing:false,authDeleted:true});
 });
 await assertFails(updateDoc(doc(client,'merchants',uid),{fullName:'Stale token'}));
 console.log('PASS: deletion state is server-only; lock, role tombstone, shared role and stale-token protections');
}finally{await env.cleanup();}

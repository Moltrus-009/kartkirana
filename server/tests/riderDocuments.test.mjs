import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {ref,uploadBytes,getMetadata} from 'firebase/storage';
assert.equal(process.env.FIREBASE_STORAGE_EMULATOR_HOST,'127.0.0.1:9199');
const env=await initializeTestEnvironment({projectId:'demo-rider-documents',storage:{host:'127.0.0.1',port:9199,rules:await readFile(new URL('../../storage.rules',import.meta.url),'utf8')}});
try {
 const owner=env.authenticatedContext('rider-a').storage();
 const other=env.authenticatedContext('rider-b').storage();
 const anon=env.unauthenticatedContext().storage();
 const admin=env.authenticatedContext('admin',{phone_number:'+919580184045',admin:true}).storage();
 const path='riders/rider-a/driving-license.jpg';
 await assertSucceeds(uploadBytes(ref(owner,path),new Uint8Array([1,2,3]),{contentType:'application/pdf'}));
 await assertSucceeds(getMetadata(ref(owner,path)));
 await assertSucceeds(getMetadata(ref(admin,path)));
 await assertFails(getMetadata(ref(other,path)));
 await assertFails(getMetadata(ref(anon,path)));
 await assertFails(uploadBytes(ref(other,path),new Uint8Array([1]),{contentType:'image/jpeg'}));
 await assertFails(uploadBytes(ref(owner,'riders/rider-a/bad.html'),new Uint8Array([1]),{contentType:'text/html'}));
 await assertFails(uploadBytes(ref(owner,'riders/rider-a/large.jpg'),new Uint8Array(10*1024*1024),{contentType:'image/jpeg'}));
 console.log('PASS: rider document uploads, owner/admin reads, cross-user/anonymous access blocked, type and size limits enforced');
} finally {await env.cleanup();}

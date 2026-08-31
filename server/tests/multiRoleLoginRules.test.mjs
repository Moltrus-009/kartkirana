import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const rules = await readFile(resolve(here, '../../firestore.rules'), 'utf8');
const environment = await initializeTestEnvironment({
  projectId: 'kartkirana-multi-role-login-test',
  firestore: { rules }
});

const uid = 'multi_role_user';
const otherUid = 'other_user';
const legacyMerchantUid = 'legacy_merchant_user';
const legacyRiderUid = 'legacy_rider_user';
const phone = '+919800000001';
const now = new Date().toISOString();

try {
  const database = environment.authenticatedContext(uid, { phone_number: phone }).firestore();

  await assertSucceeds(setDoc(doc(database, 'users', uid), {
    uid,
    role: 'customer',
    name: 'Multi Role Customer',
    phone,
    email: '',
    profileImage: '',
    addresses: [],
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
  }));

  await assertSucceeds(setDoc(doc(database, 'merchants', uid), {
    uid,
    fullName: 'Multi Role Shopkeeper',
    phone,
    role: 'owner',
    shopId: null,
    accountStatus: 'pending',
    createdAt: now,
    lastLogin: now,
  }));

  await assertSucceeds(setDoc(doc(database, 'riders', uid), {
    uid,
    fullName: 'Multi Role Rider',
    email: '',
    phone,
    role: 'rider',
    vehicleType: 'Bike',
    vehicleNumber: '',
    rating: 0,
    totalDeliveries: 0,
    todayDeliveries: 0,
    todayEarnings: 0,
    acceptanceRate: 100,
    documentStatus: 'pending',
    status: 'offline',
    coords: { lat: 0, lng: 0 },
    createdAt: now,
    lastLogin: now,
  }));

  await assertFails(updateDoc(doc(database, 'merchants', uid), { accountStatus: 'active' }));
  await assertFails(setDoc(doc(database, 'users', otherUid), {
    uid: otherUid,
    role: 'customer',
    name: 'Forged Customer',
    phone,
    email: '',
    profileImage: '',
    addresses: [],
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
  }));

  const legacyMerchantPhone = '+919800000002';
  await environment.withSecurityRulesDisabled(async context => {
    const adminDatabase = context.firestore();
    await setDoc(doc(adminDatabase, 'users', legacyMerchantUid), {
      uid: legacyMerchantUid,
      role: 'owner',
      fullName: 'Legacy Merchant',
      phone: legacyMerchantPhone,
      shopId: null,
    });
    await setDoc(doc(adminDatabase, 'merchants', legacyMerchantUid), {
      uid: legacyMerchantUid,
      role: 'owner',
      fullName: 'Legacy Merchant',
      phone: legacyMerchantPhone,
      shopId: null,
      accountStatus: 'pending',
      createdAt: now,
      lastLogin: now,
    });
  });
  const legacyMerchantDatabase = environment.authenticatedContext(legacyMerchantUid, {
    phone_number: legacyMerchantPhone
  }).firestore();
  await assertSucceeds(setDoc(doc(legacyMerchantDatabase, 'users', legacyMerchantUid), {
    uid: legacyMerchantUid,
    role: 'customer',
    name: 'Legacy Merchant Customer',
    phone: legacyMerchantPhone,
    email: '',
    profileImage: '',
    addresses: [],
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
  }));

  const legacyRiderPhone = '+919800000003';
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'riders', legacyRiderUid), {
      uid: legacyRiderUid,
      online: false,
      coords: { lat: 0, lng: 0 },
      updatedAt: now,
    });
  });
  const legacyRiderDatabase = environment.authenticatedContext(legacyRiderUid, {
    phone_number: legacyRiderPhone
  }).firestore();
  await assertSucceeds(setDoc(doc(legacyRiderDatabase, 'riders', legacyRiderUid), {
    uid: legacyRiderUid,
    fullName: 'Legacy Rider',
    email: '',
    phone: legacyRiderPhone,
    role: 'rider',
    vehicleType: 'Bike',
    vehicleNumber: '',
    rating: 0,
    totalDeliveries: 0,
    todayDeliveries: 0,
    todayEarnings: 0,
    acceptanceRate: 100,
    documentStatus: 'pending',
    status: 'offline',
    coords: { lat: 0, lng: 0 },
    createdAt: now,
    lastLogin: now,
  }), { merge: true });

  console.log('Multi-role login rules test passed.');
} finally {
  await environment.cleanup();
}

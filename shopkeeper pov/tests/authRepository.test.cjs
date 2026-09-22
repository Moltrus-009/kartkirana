const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real repository with SDK boundaries mocked; no SMS is sent.
function setup(platform) {
  const calls = [];
  const records = new Map();
  const state = { failSend: false, failCode: false };
  const user = { uid: 'merchant-test', phoneNumber: '+919800000001' };
  const auth = {};
  const confirm = async code => {
    calls.push(['confirm', code]);
    if (state.failCode) throw { code: 'auth/invalid-verification-code' };
    return { user };
  };
  const modules = {
    '@capacitor/core': { Capacitor: { getPlatform: () => platform } },
    '../../lib/nativePhoneAuth': { NativePhoneAuth: { sendVerificationCode: async options => {
      calls.push(['native', options.phoneNumber]);
      if (state.failSend) throw { code: 'auth/app-not-authorized' };
      return { verificationId: 'session' };
    } } },
    '../firebase/firebase': { auth, db: {} },
    'firebase/auth': {
      signInWithPhoneNumber: async (_auth, phone, verifier) => {
        assert.equal(_auth, auth);
        calls.push(['web', phone, verifier]);
        return { confirm };
      },
      PhoneAuthProvider: { credential: (id, code) => ({ id, code }) },
      signInWithCredential: async (_auth, credential) => {
        assert.equal(_auth, auth);
        assert.equal(credential.id, 'session');
        return confirm(credential.code);
      },
      signOut: async () => calls.push(['logout']),
    },
    'firebase/firestore': {
      doc: (_db, collection, id) => `${collection}/${id}`,
      getDoc: async key => ({ exists: () => records.has(key), data: () => records.get(key) }),
      setDoc: async (key, value, options) => records.set(key, options?.merge ? { ...records.get(key), ...value } : value),
    },
    '../../core/errors/errors': { mapFirebaseError: error => error.code || error.message },
    '../../core/logger/logger': { logger: { info() {}, error() {} } },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/infrastructure/repositories/authRepository.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => {
    assert.ok(modules[name], `Unexpected dependency: ${name}`);
    return modules[name];
  } });
  return { repo: exports.authRepository, calls, records, state };
}

test('Android sends natively and signs into JS Firebase before creating a merchant', async () => {
  const { repo, calls, records } = setup('android');
  assert.equal((await repo.triggerOTP('9800000001')).success, true);
  assert.deepEqual(calls, [['native', '+919800000001']]);
  const result = await repo.verifyOTP('9800000001', '123456');
  assert.equal(result.success, true);
  assert.equal(records.get('merchants/merchant-test').role, 'owner');
  assert.equal(records.has('users/merchant-test'), false);
  assert.equal((await repo.verifyOTP('9800000001', '123456')).success, false);
});

test('Browser retains reCAPTCHA and browser confirmation', async () => {
  const { repo, calls } = setup('web');
  const verifier = {};
  assert.equal((await repo.triggerOTP('9800000001', verifier)).success, true);
  assert.deepEqual(calls, [['web', '+919800000001', verifier]]);
  assert.equal((await repo.verifyOTP('9800000001', '123456')).success, true);
});

test('Failed new OTP request invalidates the previous session', async () => {
  const { repo, state } = setup('android');
  await repo.triggerOTP('9800000001');
  state.failSend = true;
  assert.equal((await repo.triggerOTP('9800000001')).error, 'auth/app-not-authorized');
  assert.equal((await repo.verifyOTP('9800000001', '123456')).success, false);
});

test('Incorrect OTP can be retried and customer profile remains separate', async () => {
  const { repo, state, records } = setup('android');
  records.set('users/merchant-test', { role: 'customer', name: 'Customer' });
  await repo.triggerOTP('9800000001');
  state.failCode = true;
  assert.equal((await repo.verifyOTP('9800000001', '000000')).error, 'auth/invalid-verification-code');
  state.failCode = false;
  assert.equal((await repo.verifyOTP('9800000001', '123456')).success, true);
  assert.equal(records.get('users/merchant-test').role, 'customer');
});

test('Existing employee retains role and shop after native login', async () => {
  const { repo, records } = setup('android');
  records.set('merchants/merchant-test', { role: 'employee', shopId: 'shop-1' });
  await repo.triggerOTP('9800000001');
  const result = await repo.verifyOTP('9800000001', '123456');
  assert.equal(result.user.role, 'employee');
  assert.equal(result.user.shopId, 'shop-1');
});

test('Logout clears pending verification', async () => {
  const { repo } = setup('android');
  await repo.triggerOTP('9800000001');
  await repo.logout();
  assert.equal((await repo.verifyOTP('9800000001', '123456')).success, false);
});

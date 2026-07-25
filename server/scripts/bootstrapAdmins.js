const { auth } = require('../config/firebase');

const targetPhones = ['+919580184045', '+918604519629'];

async function bootstrap() {
  console.log('🚀 Starting Programmatic Super Admin Bootstrap Script...');
  
  if (!auth) {
    console.error('❌ Firebase Auth service is not initialized. Check your credentials.');
    process.exit(1);
  }

  for (const phone of targetPhones) {
    try {
      const cleanPhone = phone.replace(/\s+/g, '');
      console.log(`\n🔍 Searching user profile by phone number: "${cleanPhone}"...`);
      let userRecord;
      try {
        userRecord = await auth.getUserByPhoneNumber(cleanPhone);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`👤 Auth user not found. Programmatically creating record for phone: "${cleanPhone}"...`);
          userRecord = await auth.createUser({
            phoneNumber: cleanPhone
          });
        } else {
          throw err;
        }
      }

      console.log(`✅ User profile active: UID: ${userRecord.uid}`);
      
      // Assign Firebase Custom Claims
      const currentClaims = userRecord.customClaims || {};
      if (currentClaims.admin === true && currentClaims.role === 'super_admin') {
        console.log(`ℹ️ User already has active Super Admin claims. Skipping update.`);
      } else {
        console.log(`⚙️ Applying Custom Claims { admin: true, role: "super_admin" }...`);
        await auth.setCustomUserClaims(userRecord.uid, {
          admin: true,
          role: 'super_admin'
        });

        // Re-fetch user record to verify claims
        const updatedUser = await auth.getUser(userRecord.uid);
        if (updatedUser.customClaims?.admin === true && updatedUser.customClaims?.role === 'super_admin') {
          console.log(`🎉 VERIFICATION SUCCESS: Custom claims successfully written on Auth for UID: ${updatedUser.uid}`);
        } else {
          console.error(`❌ VERIFICATION FAILURE: Claims checks failed for UID: ${userRecord.uid}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to bootstrap phone ${phone}:`, error.message);
    }
  }

  console.log('\n🏁 Bootstrap process complete.');
}

bootstrap();

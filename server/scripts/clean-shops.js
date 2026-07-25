require('dotenv').config();
const { db, auth } = require('../config/firebase');

async function cleanData() {
  console.log('Starting data wipe for shops, products, and shopkeepers...');
  
  try {
    // 1. Delete all shops
    console.log('Deleting shops...');
    const shopsSnapshot = await db.collection('shops').get();
    for (const doc of shopsSnapshot.docs) {
      await doc.ref.delete();
      console.log(`Deleted shop: ${doc.id}`);
    }
    
    // 2. Delete all products
    console.log('Deleting products...');
    const productsSnapshot = await db.collection('products').get();
    for (const doc of productsSnapshot.docs) {
      await doc.ref.delete();
      console.log(`Deleted product: ${doc.id}`);
    }

    // 3. Delete shopkeeper users
    console.log('Deleting shopkeeper users...');
    const usersSnapshot = await db.collection('users').where('role', '==', 'owner').get();
    for (const doc of usersSnapshot.docs) {
      const uid = doc.id;
      // Delete from Firestore
      await doc.ref.delete();
      console.log(`Deleted user document: ${uid}`);
      
      // Attempt to delete from Auth as well
      try {
        if (auth && auth.deleteUser) {
           await auth.deleteUser(uid);
           console.log(`Deleted user from Auth: ${uid}`);
        }
      } catch (err) {
        console.warn(`Could not delete user from Auth (might not exist): ${uid}`, err.message);
      }
    }
    
    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanData();

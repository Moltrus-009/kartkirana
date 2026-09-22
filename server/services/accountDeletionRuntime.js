const { db, auth } = require('../config/firebase');
const { getStorage } = require('firebase-admin/storage');
const { createAccountDeletionService } = require('./accountDeletionService');
// Must be the existing app bucket, never inferred from an uploaded URL.
module.exports = createAccountDeletionService({ db, auth, bucket: {
  async deleteFiles(options) {
    const bucketName = process.env.ACCOUNT_DELETION_STORAGE_BUCKET;
    if (!bucketName) throw new Error('ACCOUNT_DELETION_STORAGE_BUCKET must name the existing Firebase bucket.');
    await getStorage().bucket(bucketName).deleteFiles(options);
  }
} });

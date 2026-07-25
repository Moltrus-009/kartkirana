const crypto = require('crypto');
const { db } = require('../config/firebase');

class InvoiceService {
  async generateInvoiceMetadata(orderId, userId = 'system') {
    const invoiceNumber = `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const invoiceId = `inv_${crypto.randomBytes(6).toString('hex')}`;
    
    const invoiceDoc = {
      invoiceId,
      invoiceNumber,
      orderId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false,
      schemaVersion: 1,
      downloadUrl: `https://api.kartkirana.com/v1/invoices/download/${invoiceId}`
    };

    if (db) {
      await db.collection('invoices').doc(invoiceId).set(invoiceDoc);
      await db.collection('orders').doc(orderId).update({ invoiceNumber, invoiceId });
    }

    console.log(`[INVOICE SERVICE] Generated invoice ${invoiceNumber} for order ${orderId}`);
    return invoiceDoc;
  }
}

module.exports = new InvoiceService();

/**
 * M-2 fix: server-side rating aggregation.
 *
 * NOT YET DEPLOYED — this is a starting point, not a finished pipeline. No
 * Cloud Functions existed in the original archive, and firestore.rules now
 * explicitly blocks a rider's own client from writing `rating` or
 * `acceptanceRate` on their own /riders/{uid} document (see the `riders`
 * match block), which closes the client-side half of M-2 immediately on
 * deploy. This function is the server-side half: it's what should actually
 * compute and write that trusted value once a customer rating is submitted.
 *
 * Assumes ratings are submitted by the Customer app (not in this archive)
 * to a subcollection at riders/{riderId}/ratings/{ratingId} with at least
 * `{ stars: number (1-5), orderId: string, createdAt: string }`. Adjust the
 * path/shape to match whatever the Customer app actually writes.
 *
 * To deploy: `npm install firebase-functions firebase-admin` in this
 * functions/ directory, then `firebase deploy --only functions`. Neither
 * step has been run in this environment (no network access here).
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

exports.aggregateRiderRating = onDocumentCreated(
  'riders/{riderId}/ratings/{ratingId}',
  async (event) => {
    const { riderId } = event.params;
    const snapshot = event.data;
    if (!snapshot) return;

    const { stars } = snapshot.data();
    if (typeof stars !== 'number' || stars < 1 || stars > 5) {
      console.warn(`Ignoring invalid rating for rider ${riderId}:`, stars);
      return;
    }

    const db = getFirestore();
    const riderRef = db.doc(`riders/${riderId}`);

    // Running-average update via a transaction, so concurrent rating
    // submissions can't race and silently drop each other's contribution.
    await db.runTransaction(async (tx) => {
      const riderSnap = await tx.get(riderRef);
      const prevRating = riderSnap.exists ? (riderSnap.data().rating ?? 5) : 5;
      const prevCount = riderSnap.exists ? (riderSnap.data().ratingCount ?? 0) : 0;

      const newCount = prevCount + 1;
      const newRating = (prevRating * prevCount + stars) / newCount;

      tx.set(
        riderRef,
        {
          rating: Math.round(newRating * 10) / 10,
          ratingCount: newCount,
          lastRatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });
  }
);

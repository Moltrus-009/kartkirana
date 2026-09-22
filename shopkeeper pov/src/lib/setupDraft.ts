// IndexedDB preserves File objects as well as form fields across WebView restarts.
const databaseName = 'kartkirana-merchant-setup';
export const pendingSetupKey = (uid: string) => `merchant-setup:${uid}`;
function openDrafts(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readSetupDraft<T>(uid: string): Promise<T | undefined> {
  const db = await openDrafts();
  try { return await new Promise<T | undefined>((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get(uid);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }); } finally { db.close(); }
}
let writes: Promise<void> = Promise.resolve();
export function saveSetupDraft(uid: string, draft: unknown): Promise<void> {
  writes = writes.catch(() => {}).then(async () => {
    const db = await openDrafts();
    try { await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put(draft, uid);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }); } finally { db.close(); }
  });
  return writes;
}
export async function clearSetupDraft(uid: string): Promise<void> {
  await writes.catch(() => {});
  const db = await openDrafts();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite');
    transaction.objectStore('drafts').delete(uid);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }); } finally { db.close(); }
  localStorage.removeItem(pendingSetupKey(uid));
}

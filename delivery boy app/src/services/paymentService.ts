import { auth } from '../lib/firebase';
import { API_BASE_URL } from '../lib/apiConfig';
import { getSecureAppCheckToken } from './appCheckService';

export async function collectCodPayment(orderId: string): Promise<{ collected: boolean; alreadyCollected: boolean; amount: number }> {
  const user = auth?.currentUser;
  if (!user) throw new Error('Your rider session has expired. Please sign in again.');
  const [idToken, appCheckToken] = await Promise.all([
    user.getIdToken(true),
    getSecureAppCheckToken(false)
  ]);
  const response = await fetch(`${API_BASE_URL}/v1/payments/cod/collect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'X-Firebase-AppCheck': appCheckToken
    },
    body: JSON.stringify({ orderId })
  });
  const rawBody = await response.text();
  if (!response.ok) {
    let message = rawBody || 'COD payment could not be recorded.';
    try {
      const payload = JSON.parse(rawBody) as { message?: string; error?: { message?: string } };
      message = payload.message || payload.error?.message || message;
    } catch {
      // The backend can return plain text for infrastructure-level failures.
    }
    throw new Error(message);
  }
  return JSON.parse(rawBody);
}

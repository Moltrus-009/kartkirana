import { auth } from '../infrastructure/firebase/firebase';
import { getSecureAppCheckToken } from './appCheckService';
import { getApiUrl } from '../config/api';
export async function planningRequest<T>(path: string, body?: unknown, authenticated = true, key?: string): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authenticated) {
        if (!auth?.currentUser)
            throw new Error('Please sign in to continue.');
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
            const [token, appCheck] = await Promise.race([
                Promise.all([auth.currentUser.getIdToken(), getSecureAppCheckToken()]),
                new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Account verification timed out. Please try again.')), 10000); })
            ]);
            headers.Authorization = `Bearer ${token}`;
            headers['X-Firebase-AppCheck'] = appCheck;
        }
        finally {
            if (timeout)
                clearTimeout(timeout);
        }
    }
    if (key)
        headers['Idempotency-Key'] = key;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(getApiUrl(`/v1${path}`), { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal });
        const result = await response.json();
        if (!response.ok)
            throw new Error(result.message || result.error?.message || 'Please try again.');
        return result as T;
    }
    catch (error) {
        if (!navigator.onLine)
            throw new Error('You are offline. Reconnect and try again.');
        if (error instanceof DOMException && error.name === 'AbortError')
            throw new Error('The request timed out. Please retry; saved requests will not be duplicated.');
        if (error instanceof TypeError)
            throw new Error('Unable to reach KartKirana. Check your connection and try again.');
        throw error;
    }
    finally {
        window.clearTimeout(timer);
    }
}

const key = 'kartkirana.sharedCartReturn';
export function rememberSharedCart(path: string) {
    if (/^\/shared-cart\/[a-f0-9]{64}$/.test(path))
        sessionStorage.setItem(key, path);
}
export function loginDestination() {
    const path = sessionStorage.getItem(key) || '';
    return /^\/shared-cart\/[a-f0-9]{64}$/.test(path) ? path : '/';
}
export function clearSharedCartReturn() { sessionStorage.removeItem(key); }

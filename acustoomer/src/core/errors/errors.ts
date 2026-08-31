export function mapFirebaseError(error: unknown): string {
  const value = error as { code?: unknown; message?: unknown } | null;
  const code = typeof value?.code === 'string' ? value.code : '';
  const message = typeof value?.message === 'string' ? value.message : '';

  switch (code) {
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Enter a valid phone number.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please try again later.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'The OTP has expired. Request a new one.';
    case 'auth/invalid-verification-code':
      return 'The OTP is incorrect. Please try again.';
    case 'auth/network-request-failed':
    case 'unavailable':
      return 'Check your internet connection and try again.';
    case 'auth/captcha-check-failed':
    case 'auth/missing-app-credential':
    case 'auth/invalid-app-credential':
    case 'auth/app-not-authorized':
      return 'App verification failed. Refresh the page and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is temporarily unavailable. Please contact support.';
    case 'auth/user-disabled':
      return 'This account is disabled. Please contact support.';
    case 'auth/web-storage-unsupported':
      return 'Sign-in storage is blocked in this browser. Enable site storage and try again.';
    case 'auth/cancelled-popup-request':
    case 'auth/popup-closed-by-user':
      return 'Verification was cancelled. Please try again.';
    case 'permission-denied':
      return 'Your profile could not be accessed. Please sign in again or contact support.';
  }

  if (/offline|network connection|failed to fetch/i.test(message)) {
    return 'Check your internet connection and try again.';
  }
  if (/timed out/i.test(message)) {
    return 'Verification timed out. Check your connection and try again.';
  }
  if (/no active verification session/i.test(message)) {
    return 'Request a new OTP before trying again.';
  }
  if (/partner account|correct Kart Kirana partner app|correct app/i.test(message)) {
    return message;
  }

  return 'We could not complete sign-in. Please try again.';
}

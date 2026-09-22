export function mapFirebaseError(error: any): string {
  const code = error?.code || error?.message || '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'The phone number entered is invalid. Please double-check.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many request attempts. Please try again later.';
    case 'auth/code-expired':
    case 'auth/session-expired':
      return 'The OTP verification code has expired. Resend a new OTP.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP code entered. Please try again.';
    case 'auth/app-not-authorized':
    case 'auth/invalid-app-credential':
    case 'auth/missing-app-credential':
    case 'auth/invalid-cert-hash':
      return 'App verification failed. Please contact Kart Kirana support.';
    case 'auth/network-request-failed':
      return 'Check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is unavailable. Please contact Kart Kirana support.';
    case 'permission-denied':
      return 'Access Denied. Insufficient database permissions.';
    case 'unavailable':
      return 'Network connection is offline. Operating in cache mode.';
    default:
      return error?.message || 'An unexpected database error occurred. Please try again.';
  }
}

export function mapFirebaseError(error: any): string {
  const code = error?.code || error?.message || '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'The phone number entered is invalid. Please double-check.';
    case 'auth/too-many-requests':
      return 'Too many request attempts. Please try again later.';
    case 'auth/code-expired':
      return 'The OTP verification code has expired. Resend a new OTP.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP code entered. Please try again.';
    case 'permission-denied':
      return 'Access Denied. Insufficient database permissions.';
    case 'unavailable':
      return 'Network connection is offline. Operating in cache mode.';
    default:
      return error?.message || 'An unexpected database error occurred. Please try again.';
  }
}

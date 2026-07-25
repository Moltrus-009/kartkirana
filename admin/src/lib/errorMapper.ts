export function mapFirebaseError(err: any): string {
  if (!err) return 'An unknown error occurred.';
  
  const code = err.code || (err.message && err.message.includes('auth/') ? err.message : '');

  if (!code) {
    return err.message || 'A database error occurred. Please try again.';
  }

  switch (code) {
    // Phone Auth
    case 'auth/code-expired':
      return 'The verification code has expired. Please request a new one.';
    case 'auth/invalid-verification-code':
      return 'Incorrect OTP code entered. Please verify and try again.';
    case 'auth/session-expired':
      return 'The verification session has expired. Please resend the OTP code.';
    case 'auth/too-many-requests':
      return 'Too many request attempts detected. Access blocked temporarily. Try again later.';
    case 'auth/network-request-failed':
      return 'Network connection lost. Please check your internet connection and retry.';
    case 'auth/invalid-app-credential':
      return 'App verification failed. Please try again or access via localhost.';
    case 'auth/missing-verification-id':
      return 'Invalid verification session id. Please re-trigger phone signup.';
    case 'auth/missing-verification-code':
      return 'Please enter the verification OTP code sent to your phone.';
    
    // Core Auth
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support for help.';
    case 'auth/operation-not-allowed':
      return 'Phone authentication is not enabled. Contact administrator.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid phone number (including country code, e.g., +91).';
    
    // Firestore / Offline
    case 'unavailable':
    case 'firestore/unavailable':
      return 'Database service is currently offline. Operations queued for auto-retry.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Access Denied. You do not have permissions to perform this action.';
    
    // Storage
    case 'storage/unauthorized':
      return 'Storage upload failed. Access unauthorized.';
    case 'storage/canceled':
      return 'Upload cancelled by user.';
    
    default:
      return err.message || 'An error occurred during verification. Please try again.';
  }
}

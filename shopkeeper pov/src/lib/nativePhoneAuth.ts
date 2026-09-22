import { registerPlugin } from '@capacitor/core';

interface SendVerificationCodeOptions {
  phoneNumber: string;
  resend?: boolean;
}

interface SendVerificationCodeResult {
  verificationId: string;
}

interface NativePhoneAuthPlugin {
  sendVerificationCode(options: SendVerificationCodeOptions): Promise<SendVerificationCodeResult>;
}

export const NativePhoneAuth = registerPlugin<NativePhoneAuthPlugin>('NativePhoneAuth');

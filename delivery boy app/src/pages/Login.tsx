import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Bike, ShieldCheck, ArrowRight } from 'lucide-react';
import { auth, hasValidConfig } from '../lib/firebase';
import { recaptchaManager } from '../lib/recaptchaManager';

interface LoginProps {
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onOpenTerms, onOpenPrivacy }) => {
  const { sendOTP, verifyOTP, loading } = useApp();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<number | null>(null);

  // OTP resend countdown timer
  useEffect(() => {
    if (step === 'otp' && resendTimer > 0) {
      timerRef.current = window.setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, resendTimer]);

  // Cleanup recaptcha verifier on unmount
  useEffect(() => {
    return () => {
      recaptchaManager.clear();
    };
  }, []);

  const createRecaptchaVerifier = () => {
    if (!hasValidConfig || !auth) return null;
    const verifier = recaptchaManager.setup(auth, 'recaptcha-container');
    if (!verifier) setError('Security verification could not be initialized. Refresh the app and try again.');
    return verifier;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (phoneNumber.trim().length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    // Firebase phone auth requires an E.164 number.  A space between the
    // country code and mobile number makes otherwise valid Indian numbers
    // fail before an OTP can be sent.
    const formattedPhone = `+91${phoneNumber.trim()}`;

    const verifier = createRecaptchaVerifier();
    if (hasValidConfig && auth && !verifier) return;

    setSubmitting(true);
    try {
      const res = await sendOTP(formattedPhone, verifier);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setStep('otp');
        setResendTimer(60);
        setInfo(res.message);
      } else {
        setError(res.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (otpCode.trim().length !== 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }

    // Generic designation instead of mock name fallback
    const defaultName = fullName.trim() || 'Rider Partner';
    if (!confirmationResult) {
      setError('The OTP session has expired. Please request a new code.');
      setStep('phone');
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyOTP(confirmationResult, otpCode.trim(), defaultName);
      if (!res.success) setError(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setOtpCode('');
    setError(null);
    setResendTimer(60);
    const formattedPhone = `+91${phoneNumber.trim()}`;

    const verifier = createRecaptchaVerifier();
    if (hasValidConfig && auth && !verifier) return;

    setSubmitting(true);
    try {
      const res = await sendOTP(formattedPhone, verifier);
      if (res.success) {
        setConfirmationResult(res.confirmationResult);
        setInfo('OTP code resent successfully!');
      } else {
        setError(res.message);
        setResendTimer(0);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtpCode('');
    setConfirmationResult(null);
    setInfo(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-[100dvh] flex flex-col justify-center px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2rem)] animate-fade-in text-left">
      <div className="space-y-8 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-md">
        
        {/* App Logo branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 bg-primary-light rounded-2xl flex items-center justify-center text-primary glow-primary border border-primary/20 transition-all duration-300">
            <Bike className="h-9 w-9 animate-float" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center justify-center gap-1">
              <span>Kart Kirana</span>
              <span className="text-[10px] bg-secondary text-slate-900 font-bold px-1.5 py-0.5 rounded-sm">PARTNER</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold leading-relaxed">
              Logistics dashboard for Kart Kirana delivery partners.
            </p>
          </div>
        </div>

        {/* Error / Success Banners */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-955/10 border border-rose-200/50 dark:border-rose-950/20 text-rose-605 dark:text-rose-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {info && (
          <div className="bg-emerald-50 dark:bg-emerald-955/10 border border-emerald-250/50 dark:border-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
            {info}
          </div>
        )}

        {step === 'phone' ? (
          // Phone form
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Full Name (Registration)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary focus:outline-hidden dark:text-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Rider Phone Number
              </label>
              <div className="relative flex">
                <span className="bg-slate-100 dark:bg-zinc-800 border-y border-l border-slate-200 dark:border-zinc-800 rounded-l-xl px-3.5 flex items-center text-xs font-extrabold text-slate-500 dark:text-zinc-400">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-850 rounded-r-xl px-4 py-3.5 text-xs font-bold focus:ring-1 focus:ring-primary focus:border-primary focus:outline-hidden dark:text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || submitting}
              className="w-full py-3.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{submitting ? 'Sending OTP...' : 'Send OTP Code'}</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </button>

            {/* Dev-only mock helper block. import.meta.env.DEV is statically replaced
                at build time, so this entire block (including the bypass button) is
                dead-code-eliminated from any production/`vite build` bundle. It can
                never be present in a distributed APK. */}
            {import.meta.env.DEV && (
              <>
                <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/30 dark:border-transparent p-4 rounded-xl space-y-1.5">
                  <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center space-x-1">
                    <span>⚡ DEV-ONLY MOCK TESTING BYPASS</span>
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold leading-relaxed">
                    Visible only in local `vite dev` builds. The SMS OTP code is bypassed
                    to <span className="font-extrabold text-slate-700 dark:text-zinc-300">123456</span> in local mock mode.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={async () => {
                      // Explicitly enter the development-only local data
                      // mode before constructing a mock confirmation result.
                      // Without this, a mock confirmation can accidentally
                      // attempt a real Firestore write without Firebase auth.
                      localStorage.setItem('hs_bypass_active', 'true');
                      const mockConfirm = { mock: true, phoneNumber: '+919999911111' };
                      const inputName = fullName.trim() || 'Rider Partner';
                      const res = await verifyOTP(mockConfirm, '123456', inputName);
                      if (!res.success) {
                        setError(res.message);
                      }
                    }}
                    className="text-[10px] text-slate-500 hover:text-primary font-extrabold uppercase tracking-widest cursor-pointer transition-colors"
                  >
                    ⚡ Quick Dev Login Bypass (Test Rider) — DEV BUILD ONLY
                  </button>
                </div>
              </>
            )}
          </form>
        ) : (
          // OTP code form
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Enter 6-Digit OTP Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter OTP verification code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-805 rounded-xl px-4 py-3.5 text-center text-sm font-mono font-black focus:ring-1 focus:ring-primary focus:border-primary focus:outline-hidden tracking-widest dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || submitting}
              className="w-full py-3.5 bg-success hover:bg-success-hover text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{submitting ? 'Verifying...' : 'Verify & Login'}</span>
              <ShieldCheck className="h-4.5 w-4.5" />
            </button>

            {/* Countdown timers */}
            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-slate-400">
              <button 
                type="button" 
                onClick={handleChangeNumber}
                className="hover:text-primary transition cursor-pointer"
              >
                Change Number
              </button>
              
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || submitting}
                className={`${resendTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-primary hover:underline cursor-pointer'}`}
              >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP Code'}
              </button>
            </div>
          </form>
        )}

        <div id="recaptcha-container"></div>

        <div className="text-[10px] text-slate-400 font-semibold text-center mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800">
          By logging in, you agree to our{' '}
          <button type="button" onClick={onOpenTerms} className="text-primary hover:underline font-bold cursor-pointer">
            Rider Terms
          </button>{' '}
          &{' '}
          <button type="button" onClick={onOpenPrivacy} className="text-primary hover:underline font-bold cursor-pointer">
            Privacy Policy
          </button>
        </div>
      </div>
    </div>
  );
};

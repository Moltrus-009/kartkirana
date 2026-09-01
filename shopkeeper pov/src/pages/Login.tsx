import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../core/store/useAppStore';
import { auth } from '../infrastructure/firebase/firebase';
import { recaptchaManager } from '../lib/recaptchaManager';
import { useLanguage } from '../context/LanguageContext';

function setupRecaptcha(containerId: string) {
  if (!auth) return null;
  return recaptchaManager.setup(auth, containerId);
}

import { Smartphone, CheckCircle, ShieldAlert, KeyRound, Languages } from 'lucide-react';
import { hasValidConfig } from '../infrastructure/firebase/firebase';

export default function Login() {
  const { triggerOTP, verifyOTP, loading } = useAppStore();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'details' | 'verify'>('details'); // details -> verify
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const showDevelopmentTestControls = import.meta.env.DEV && new URLSearchParams(window.location.search).has('show-dev-controls');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first OTP digit input when entering verification step
  useEffect(() => {
    if (step === 'verify') {
      const timer = setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  useEffect(() => () => recaptchaManager.clear(), []);

  const handleOtpDigitChange = (index: number, val: string) => {
    const newVal = val.replace(/\D/g, '').slice(-1); // keep only last character if multiple typed
    const newDigits = [...otpDigits];
    newDigits[index] = newVal;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (newVal && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText.length === 6) {
      const newDigits = pastedText.split('');
      setOtpDigits(newDigits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(null);

    if (!phone || phone.length < 10) {
      setError(t('error_invalid_phone'));
      return;
    }

    if (!hasValidConfig) {
      setError(t('error_signin_not_configured'));
      return;
    }

    const verifier = setupRecaptcha('recaptcha-container');
    if (!verifier) {
      setError(t('error_security_init'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await triggerOTP(phone, verifier);
      if (res.success) {
        setSuccess(t('otp_sent', { phone: `+91 ${phone}` }));
        setStep('verify');
      } else {
        setError(res.error || t('error_send_otp'));
        await recaptchaManager.reset();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_sms'));
      await recaptchaManager.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(null);

    const mergedOtp = otpDigits.join('');
    if (mergedOtp.length !== 6) {
      setError(t('error_full_otp'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyOTP(phone, mergedOtp);
      if (res.success) {
        setSuccess(t('login_success'));
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      } else {
        setError(res.error || t('error_invalid_otp'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error_verification'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 transition-all duration-300">
      <div className="w-full max-w-md bg-white border border-slate-100/80 rounded-3xl p-8 shadow-lg shadow-slate-200/50 relative overflow-hidden transition-all duration-300">
        <button type="button" onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')} className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 shadow-sm" aria-label={t('change_language')}><Languages className="h-3.5 w-3.5" />{language === 'en' ? 'हिन्दी' : 'English'}</button>
        
        {/* Decorative Ambient Blur Lights */}
        <div className="absolute -top-20 -left-20 w-44 h-44 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        {/* reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        <div className="text-center relative z-10">
          {/* Animated floating portal icon */}
          <img src="/logo.jpeg" alt="Kart Kirana Shopkeeper Partner" className="w-28 h-28 rounded-2xl object-contain mx-auto shadow-lg shadow-blue-500/20 mb-5 animate-float" />
          
          <h1 className="text-2xl font-black text-slate-800 leading-tight">
            {t('login_title')}
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1.5 mb-6">
            {t('login_subtitle')}
          </p>

          {/* Authentication service status */}
          {!hasValidConfig ? (
            <div className="mb-6 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-left flex flex-col gap-2 relative">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{t('signin_unavailable')}</h4>
                  <p className="text-[10px] leading-normal font-bold opacity-80">
                    {t('signin_unavailable_desc')}
                  </p>
                </div>
              </div>
              {showDevelopmentTestControls && step === 'details' && (
                <button
                  type="button"
                  onClick={() => undefined}
                  className="mt-1 self-start px-3 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-800 font-black uppercase text-[9px] rounded-lg tracking-wider transition cursor-pointer"
                >
                  ⚡ Autofill Test Credentials
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl text-left flex items-start gap-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{t('firebase_online')}</h4>
                <p className="text-[10px] leading-tight font-bold opacity-80">
                  {t('firebase_online_desc')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-black text-left animate-shake">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-black text-left">
              {success}
            </div>
          )}

          {step === 'details' ? (
            <form onSubmit={handleSendOTP} className="space-y-4 text-left page-transition">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                  {t('owner_mobile')}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="99999 99999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full pl-16 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none transition font-semibold tracking-wider"
                  />
                  <div className="absolute left-3.5 top-3.5 text-xs font-black text-slate-400 flex items-center gap-1">
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    <span>+91</span>
                  </div>
                </div>
              </div>
 
              <button
                type="submit"
                disabled={loading || submitting}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl uppercase tracking-wider shadow-lg shadow-blue-500/10 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? t('requesting_code') : t('request_code')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5 text-left page-transition">
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block text-center">
                  {t('enter_otp')}
                </label>
                
                {/* Segmented OTP digit inputs */}
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-lg font-black bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    />
                  ))}
                </div>
                
                <p className="text-[10px] text-slate-400 font-bold mt-1 text-center">
                  {t('sms_sent_to', { phone: `+91 ${phone}` })}
                </p>
              </div>
 
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep('details'); setError(null); setSuccess(null); setOtpDigits(['', '', '', '', '', '']); }}
                  className="w-1/3 py-3 border border-slate-200 hover:bg-slate-50 text-[10px] font-black uppercase rounded-xl transition cursor-pointer text-center text-slate-500"
                >
                  {t('back')}
                </button>
                <button
                  type="submit"
                  disabled={loading || submitting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl tracking-wider shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {submitting ? t('verifying') : t('verify_continue')}
                </button>
              </div>
            </form>
          )}

          <div className="text-[10px] text-slate-400 font-semibold text-center mt-6 pt-4 border-t border-slate-100">
            {t('login_agreement')}{' '}
            <button type="button" onClick={() => navigate('/terms')} className="text-primary hover:underline font-bold cursor-pointer">
              {t('merchant_terms')}
            </button>{' '}
            {t('and')}{' '}
            <button type="button" onClick={() => navigate('/privacy')} className="text-primary hover:underline font-bold cursor-pointer">
              {t('privacy_policy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft, MapPin, Bell, Shield, Check, ChevronRight } from 'lucide-react';
import { Logo } from '../components/ui/Logo';
import { useLanguage } from '../context/LanguageContext';
import { recaptchaManager } from '../services/recaptchaManager';
import { mapFirebaseError } from '../core/errors/errors';

type AuthStep = 
  | 'language'
  | 'welcome' 
  | 'phone' 
  | 'verifying' 
  | 'otp' 
  | 'profile_setup'
  | 'success' 
  | 'location' 
  | 'notifications';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { sendOTPCode, verifyOTPCode, error, clearError, user, loading: authLoading, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [step, setStep] = useState<AuthStep>('language');
  const [phoneNumber, setPhoneNumber] = useState('');
  const countryCode = '+91';
  const [phoneError, setPhoneError] = useState('');
  
  // OTP states
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(30);
  const [isResendActive, setIsResendActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // First time profile setup states
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileError, setProfileError] = useState('');

  const otpInputsRef = useRef<HTMLInputElement[]>([]);
  const isVerifying = isLoading || authLoading;

  const handleSelectLanguage = (lang: 'en' | 'hi') => {
    setLanguage(lang);
    setStep('welcome');
  };

  // Accept typing, autofill, and pasted Indian numbers such as +91 98765 43210.
  const normalizePhoneNumber = (val: string) => {
    let num = val.replace(/\D/g, '');
    if (num.length === 12 && num.startsWith('91')) num = num.slice(2);
    return num.slice(0, 10);
  };

  // Format phone number to "XXXXX XXXXX" for readability.
  const formatPhoneNumber = (val: string) => {
    const num = normalizePhoneNumber(val);
    if (num.length <= 5) return num;
    return `${num.slice(0, 5)} ${num.slice(5)}`;
  };

  // Check persisted permissions and user authentication
  useEffect(() => {
    if (user) {
      const locationPrompted = localStorage.getItem('location_permission_prompted') === 'true';
      const notificationPrompted = localStorage.getItem('notification_permission_prompted') === 'true';

      if (user.name === 'New Customer' || !user.name || user.name.trim() === '') {
        setStep('profile_setup');
      } else if (!locationPrompted) {
        setStep('location');
      } else if (!notificationPrompted) {
        setStep('notifications');
      } else {
        // Returning customers always start on Home, even when a cart is saved.
        navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  // Resend Timer Countdown
  useEffect(() => {
    let countdown: any;
    if (step === 'otp' && timer > 0) {
      countdown = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsResendActive(true);
    }
    return () => clearInterval(countdown);
  }, [timer, step]);

  // Clean up reCAPTCHA verifier widget on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      recaptchaManager.clear();
    };
  }, []);

  // Phone submission handler
  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;
    clearError();
    setPhoneError('');

    const numOnly = phoneNumber.replace(/\D/g, '');
    if (numOnly.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setStep('verifying');
    const fullPhone = `${countryCode}${numOnly}`;
    const containerId = 'recaptcha-container';
    
    try {
      const success = await sendOTPCode(fullPhone, containerId);
      if (success) {
        setStep('otp');
        setTimer(60);
        setIsResendActive(false);
        setOtpValues(Array(6).fill(''));
      } else {
        setStep('phone');
      }
    } catch (err: any) {
      setStep('phone');
      if (import.meta.env.DEV) console.error(err);
    }
  };

  // OTP verification handler
  const handleOTPVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying) return;
    clearError();
    setOtpError('');

    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      setOtpError('Please enter all 6 digits of the OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await verifyOTPCode(otpCode);
      setIsLoading(false);
      if (success) {
        setStep('success');
      }
    } catch (err) {
      setIsLoading(false);
      if (import.meta.env.DEV) console.error(err);
    }
  };

  const handleResendOTP = async () => {
    if (!isResendActive || isVerifying) return;
    clearError();
    setIsLoading(true);
    const numOnly = phoneNumber.replace(/\D/g, '');
    const fullPhone = `${countryCode}${numOnly}`;
    try {
      const success = await sendOTPCode(fullPhone, 'recaptcha-container');
      setIsLoading(false);
      if (success) {
        setTimer(60);
        setIsResendActive(false);
        setOtpValues(Array(6).fill(''));
      }
    } catch (err) {
      setIsLoading(false);
      if (import.meta.env.DEV) console.error(err);
    }
  };

  // Profile setup submission
  const handleProfileSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }
    setIsLoading(true);
    setProfileError('');
    try {
      await updateUser({ name: profileName.trim(), email: profileEmail.trim() });
      setIsLoading(false);
      
      const locationPrompted = localStorage.getItem('location_permission_prompted') === 'true';
      const notificationPrompted = localStorage.getItem('notification_permission_prompted') === 'true';

      if (!locationPrompted) {
        setStep('location');
      } else if (!notificationPrompted) {
        setStep('notifications');
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setIsLoading(false);
      setProfileError(mapFirebaseError(err));
    }
  };

  // Focus shifting logic for OTP inputs
  const handleOtpChange = (index: number, val: string) => {
    if (isVerifying) return;

    const numeric = val.replace(/\D/g, '');
    if (!numeric && val !== '') return;

    const updated = [...otpValues];
    updated[index] = numeric.slice(-1);
    setOtpValues(updated);

    // Shift focus forward
    if (numeric && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto verify if completed
    const fullCode = updated.join('');
    if (fullCode.length === 6) {
      setIsLoading(true);
      setTimeout(() => {
        verifyOTPCode(fullCode).then(success => {
          setIsLoading(false);
          if (success) {
            setStep('success');
          }
        }).catch(() => {
          setIsLoading(false);
        });
      }, 50);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isVerifying) {
      e.preventDefault();
      return;
    }

    if (e.key === 'Backspace') {
      const updated = [...otpValues];
      if (!updated[index] && index > 0) {
        updated[index - 1] = '';
        setOtpValues(updated);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        updated[index] = '';
        setOtpValues(updated);
      }
    }
  };

  // Geolocation request handler
  const handleRequestLocation = async () => {
    localStorage.setItem('location_permission_prompted', 'true');
    if (navigator.geolocation) {
      // Continue immediately; AddressProvider saves the granted position automatically.
      navigator.geolocation.getCurrentPosition(
        () => {
          if (import.meta.env.DEV) console.log('Location permission granted.');
        },
        (error) => {
          if (import.meta.env.DEV) console.warn('Location permission denied:', error);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
    setStep('notifications');
  };

  // Notification request handler
  const handleRequestNotifications = async () => {
    localStorage.setItem('notification_permission_prompted', 'true');
    if ('Notification' in window) {
      try {
        await Notification.requestPermission();
      } catch (err) {
        if (import.meta.env.DEV) console.warn('Notification permission error:', err);
      }
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center overflow-hidden transition-colors duration-200">
      
      {/* Invisible Recaptcha Node */}
      <div id="recaptcha-container"></div>

      {/* Floating Language Selector */}
      <div className="absolute top-4 right-4 z-55 flex items-center gap-1 bg-white/10 backdrop-blur-md dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/80 rounded-2xl p-1 shadow-md">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer
            ${language === 'en'
              ? 'bg-[#0B74E8] text-white shadow-sm font-extrabold'
              : 'text-gray-650 hover:text-gray-900 dark:hover:text-gray-250'
            }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage('hi')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer
            ${language === 'hi'
              ? 'bg-[#0B74E8] text-white shadow-sm font-extrabold'
              : 'text-gray-650 hover:text-gray-900 dark:hover:text-gray-250'
            }`}
        >
          हिन्दी
        </button>
      </div>

      <AnimatePresence mode="wait">
        
        {/* STEP 0: LANGUAGE SELECTION */}
        {step === 'language' && (
          <motion.div
            key="language"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 w-full h-full bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col justify-between p-6 select-none z-50 text-left animate-fade-in"
          >
            {/* Background decorative bubbles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute h-64 w-64 rounded-full bg-blue-500/10 blur-xl animate-floating-bubble-1 -top-10 -left-10" />
              <div className="absolute h-56 w-56 rounded-full bg-[#36B6F4]/15 blur-xl animate-floating-bubble-2 bottom-12 -right-12" />
            </div>

            <div className="my-auto flex flex-col gap-6 w-full max-w-sm mx-auto z-10">
              {/* App Logo */}
              <div className="flex justify-center mb-6">
                <Logo size="lg" showText={true} textColor="text-[#1565C0] dark:text-white" />
              </div>

              {/* Title instructions */}
              <div className="text-center">
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  Select your language
                </h2>
                <h3 className="text-base font-extrabold text-[#1565C0] dark:text-blue-400 mt-1">
                  अपनी पसंदीदा भाषा चुनें
                </h3>
              </div>

              {/* Selection cards */}
              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => handleSelectLanguage('en')}
                  className="p-5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] hover:border-[#1565C0] dark:hover:border-blue-500 hover:bg-blue-50/30 transition-all rounded-3xl cursor-pointer flex items-center justify-between group active:scale-[0.98] shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-black tracking-wide text-[#1565C0] dark:bg-blue-500/10 dark:text-blue-300">EN</span>
                    <div className="text-left">
                      <span className="block font-black text-sm text-gray-800 dark:text-white group-hover:text-[#1565C0] dark:group-hover:text-blue-400">English</span>
                      <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400">Everything in English language</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#1565C0] dark:group-hover:text-emerald-450" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectLanguage('hi')}
                  className="p-5 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] hover:border-[#1565C0] dark:hover:border-blue-500 hover:bg-blue-50/30 transition-all rounded-3xl cursor-pointer flex items-center justify-between group active:scale-[0.98] shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-black text-[#1565C0] dark:bg-blue-500/10 dark:text-blue-300">हिं</span>
                    <div className="text-left">
                      <span className="block font-black text-sm text-gray-800 dark:text-white group-hover:text-[#1565C0] dark:group-hover:text-blue-400">हिन्दी (Hindi)</span>
                      <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400">सभी चीजें हिन्दी भाषा में देखें</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#1565C0] dark:group-hover:text-emerald-450" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 1: WELCOME SCREEN */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 w-full h-full bg-welcome-gradient flex flex-col justify-between p-6 select-none z-40"
          >
            {/* Floating Background Bubbles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute h-56 w-56 rounded-full bg-white/20 blur-xl animate-floating-bubble-1 top-12 -left-12" />
              <div className="absolute h-72 w-72 rounded-full bg-white/10 blur-xl animate-floating-bubble-2 bottom-36 -right-16" />
              <div className="absolute h-44 w-44 rounded-full bg-white/15 blur-lg animate-floating-bubble-3 top-1/2 left-1/3" />
            </div>

            <div />

            {/* Logo and Tagline Container */}
            <div className="flex flex-col items-center text-center z-10 my-auto">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: 'spring' }}
                className="mb-8"
              >
                <Logo size="xl" showText={true} textColor="text-white" />
              </motion.div>

              <motion.p
                initial={{ y: 2, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-base font-extrabold text-white/95 max-w-[280px] leading-relaxed tracking-wide drop-shadow-sm uppercase"
              >
                {t('welcome_tagline')}
              </motion.p>
            </div>

            {/* Bottom Button dock */}
            <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-6 z-10 pb-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setStep('phone')}
                className="w-full py-4.5 bg-white text-blue-700 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-black/10 transition-all hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {t('continue_phone')}
              </motion.button>
              
              <p className="text-[10px] font-bold text-white/80 leading-normal max-w-xs text-center">
                {t('privacy_policy')}
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 2: PHONE NUMBER LOGIN */}
        {step === 'phone' && (
          <motion.form
            key="phone"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              handlePhoneSubmit();
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="w-full max-w-sm px-6 flex flex-col justify-between min-h-screen py-8 text-left z-40"
          >
            {/* Header info */}
            <div>
              <div className="flex justify-between items-center mt-4 mb-6">
                <button 
                  type="button"
                  onClick={() => setStep('welcome')} 
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-650 dark:text-gray-250 hover:text-[#0B74E8] transition-colors cursor-pointer animate-fade-in-up"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-1 bg-blue-500/10 dark:bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase text-blue-600 dark:text-blue-300 tracking-wider">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Secure Login</span>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white animate-fade-in-up">
                  {t('phone_title')}
                </h2>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1.5 leading-relaxed">
                  {t('phone_sub')}
                </p>
              </div>

              {/* Error banner */}
              {(phoneError || error) && (
                <div className="p-3.5 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-950/40 text-red-650 dark:text-red-400 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{phoneError || error}</span>
                </div>
              )}

              {/* Form Input fields */}
              <div className="flex gap-2.5 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                <span className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-sm font-black text-gray-800 dark:text-gray-200">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="Enter 10 digit number"
                  value={phoneNumber}
                  onChange={(e) => {
                    const cleanVal = normalizePhoneNumber(e.target.value);
                    setPhoneNumber(formatPhoneNumber(cleanVal));
                    if (phoneError) setPhoneError('');
                  }}
                  className="flex-1 bg-transparent py-2 px-1 text-base font-black text-gray-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-600"
                  autoFocus
                />
              </div>
            </div>

            {/* Bottom trigger button; Android provides the numeric keypad. */}
            <div className="flex flex-col gap-5 mt-auto">
              {/* Continue CTA */}
              <Button
                type="submit"
                disabled={phoneNumber.replace(/\D/g, '').length !== 10 || isVerifying}
                fullWidth
                className="py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
              >
                {t('send_otp')}
              </Button>
              <div className="text-[10px] text-slate-400 font-semibold text-center mt-3">
                By continuing, you agree to our{' '}
                <button type="button" onClick={() => navigate('/terms')} className="text-blue-500 hover:underline font-bold cursor-pointer">
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => navigate('/privacy')} className="text-blue-500 hover:underline font-bold cursor-pointer">
                  Privacy Policy
                </button>
              </div>
            </div>
          </motion.form>
        )}

        {/* STEP 3: LOADING/VERIFYING TRANSITION */}
        {step === 'verifying' && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center select-none z-50"
          >
            <div className="absolute h-48 w-48 rounded-full border border-blue-500/20 animate-ripple-glow pointer-events-none" />
            <div className="absolute h-64 w-64 rounded-full border border-blue-500/10 animate-ripple-glow pointer-events-none" style={{ animationDelay: '0.6s' }} />

            <div className="flex flex-col items-center justify-center z-10 animate-logo-pulse">
              <Logo size="lg" showText={false} />
            </div>

            <div className="absolute bottom-24 flex flex-col items-center gap-3.5 w-60 z-10">
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-gradient-wave rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-[10px] font-black tracking-[0.25em] text-blue-500 uppercase">
                Verifying your number...
              </span>
            </div>
          </motion.div>
        )}

        {/* STEP 4: OTP INPUT CODE */}
        {step === 'otp' && (
          <motion.form
            key="otp"
            onSubmit={(e) => {
              e.preventDefault();
              handleOTPVerify();
            }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="w-full max-w-sm px-6 flex flex-col justify-between min-h-screen py-8 text-left z-40"
          >
            <div>
              <div className="flex items-center gap-3 mt-4 mb-6">
                <button 
                  type="button"
                  onClick={() => setStep('phone')} 
                  className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-gray-650 dark:text-gray-250 hover:text-[#0B74E8] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Change Mobile Number</span>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white animate-fade-in-up">
                  {t('otp_title')}
                </h2>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1.5 leading-relaxed">
                  {t('otp_sub')} ({countryCode} {phoneNumber.slice(0, 2)}******{phoneNumber.slice(-2)})
                </p>
              </div>

              {/* Error banner */}
              {(otpError || error) && (
                <div className="p-3.5 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-950/40 text-red-655 dark:text-red-450 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{otpError || error}</span>
                </div>
              )}

              {/* 6 digits input array */}
              <div className="flex justify-between gap-2.5 mt-2">
                {otpValues.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { otpInputsRef.current[index] = el as HTMLInputElement; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    disabled={isVerifying}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(index, e)}
                    className="w-12 h-14 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 text-center font-black text-xl text-gray-950 dark:text-white outline-none focus:border-[#0B74E8] focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50"
                  />
                ))}
              </div>
            </div>

            {/* Bottom Actions Timer Resend */}
            <div className="flex flex-col gap-4 mt-auto">
              
              <div className="flex items-center justify-between text-xs font-bold text-gray-650 dark:text-gray-300">
                <span>
                  {timer > 0 ? `${t('resend_in')} 0:${timer < 10 ? '0' : ''}${timer}` : ""}
                </span>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={!isResendActive || isLoading}
                  className={`font-black uppercase tracking-wider transition-colors cursor-pointer text-[10px]
                    ${isResendActive 
                      ? 'text-[#0B74E8] hover:text-blue-700'
                      : 'text-gray-300 dark:text-gray-800 cursor-not-allowed'
                    }`}
                >
                  {t('resend_code')}
                </button>
              </div>

              {/* Continue verify CTA */}
              <Button
                type="submit"
                disabled={otpValues.join('').length !== 6 || isVerifying}
                fullWidth
                className="py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 active:scale-95"
              >
                {t('verify_code')}
              </Button>
            </div>
          </motion.form>
        )}

        {/* STEP 4.5: PROFILE SETUP FOR FIRST-TIME USERS */}
        {step === 'profile_setup' && (
          <motion.form
            key="profile_setup"
            onSubmit={handleProfileSetupSubmit}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            className="w-full max-w-sm px-6 flex flex-col justify-between min-h-screen py-8 text-left z-40 animate-fade-in"
          >
            <div>
              <div className="mb-6 mt-12 text-left">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white animate-fade-in-up">
                  Set Up Your Profile
                </h2>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-1.5 leading-relaxed">
                  Enter your details below to create your account for the first time.
                </p>
              </div>

              {/* Error banner */}
              {profileError && (
                <div className="p-3.5 mb-5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-950/40 text-red-650 dark:text-red-400 text-xs font-semibold flex items-start gap-2.5 animate-shake">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Inputs */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-black uppercase text-[#1565C0] dark:text-[#1E88E5] px-1 tracking-wider">
                    Full Name (Required)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-gray-950 dark:text-white outline-none focus:border-[#0B74E8] focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[10px] font-black uppercase text-[#1565C0] dark:text-[#1E88E5] px-1 tracking-wider">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold text-gray-950 dark:text-white outline-none focus:border-[#0B74E8] focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="w-full mt-auto">
              <Button
                type="submit"
                disabled={!profileName.trim() || isVerifying}
                fullWidth
                className="py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 bg-gradient-to-br from-[#1E88E5] to-[#1565C0]"
              >
                Create Account
              </Button>
            </div>
          </motion.form>
        )}

        {/* STEP 5: SUCCESS CHECKMARK PULSE */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => {
              setTimeout(() => {
                const locationPrompted = localStorage.getItem('location_permission_prompted') === 'true';
                const notificationPrompted = localStorage.getItem('notification_permission_prompted') === 'true';

                if (!user || user.name === 'New Customer' || !user.name || user.name.trim() === '') {
                  setStep('profile_setup');
                } else if (!locationPrompted) {
                  setStep('location');
                } else if (!notificationPrompted) {
                  setStep('notifications');
                } else {
                  navigate('/', { replace: true });
                }
              }, 300);
            }}
            className="fixed inset-0 w-full h-full bg-slate-950 flex flex-col items-center justify-center select-none z-50"
          >
            <div className="absolute h-56 w-56 rounded-full bg-blue-500/5 blur-xl pointer-events-none animate-pulse" />
            
            <div className="flex flex-col items-center gap-6 z-10">
              <div className="h-20 w-20 rounded-full bg-[#0B74E8] text-white flex items-center justify-center shadow-lg shadow-blue-500/20 animate-checkmark-grow">
                <Check className="h-10 w-10 stroke-[3.5]" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Login Successful</h3>
                <span className="text-xs font-bold text-gray-500 block mt-1">Directing you in a moment...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 6: LOCATION PERMISSION */}
        {step === 'location' && (
          <motion.div
            key="location"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm px-6 flex flex-col justify-between min-h-screen py-8 text-left z-40"
          >
            <div />

            <div className="flex flex-col items-center text-center my-auto">
              <div className="relative h-24 w-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/10 shadow-inner">
                <div className="absolute inset-0.5 rounded-full border border-dashed border-blue-500/30 animate-spin" style={{ animationDuration: '8s' }} />
                <MapPin className="h-11 w-11 text-[#0B74E8] animate-bounce" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Enable Location Access
              </h2>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-2 leading-relaxed max-w-xs">
                We need your device location to fulfill rapid grocery checkout.
              </p>

              <div className="w-full mt-8 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 text-left shadow-sm">
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5">🏪</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-none">Find Nearby Stores</h4>
                    <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 mt-1 block">Connect to local bakery, dairy, and medical stores near you.</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5">⏱️</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-none">Calculate Live Delivery</h4>
                    <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 mt-1 block">Estimate accurate delivery times based on rider distance.</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5">📦</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-none">Ensure Stock Availability</h4>
                    <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 mt-1 block">Check live inventories of products near your doorstep.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={handleRequestLocation}
                fullWidth
                className="py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 active:scale-95"
              >
                Allow Location Access
              </Button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('location_permission_prompted', 'true');
                  setStep('notifications');
                }}
                className="py-3.5 text-center text-xs font-black text-gray-400 hover:text-blue-500 uppercase tracking-widest cursor-pointer transition-colors"
              >
                Not Now
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 7: NOTIFICATION PERMISSION */}
        {step === 'notifications' && (
          <motion.div
            key="notifications"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm px-6 flex flex-col justify-between min-h-screen py-8 text-left z-40"
          >
            <div />

            <div className="flex flex-col items-center text-center my-auto">
              <div className="relative h-24 w-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-8 border border-blue-500/10 shadow-inner">
                <div className="absolute inset-0.5 rounded-full border border-[#0B74E8]/20 animate-ping" style={{ animationDuration: '2.5s' }} />
                <Bell className="h-11 w-11 text-[#0B74E8]" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Enable Notifications
              </h2>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mt-2 leading-relaxed max-w-xs">
                Stay updated with critical alerts for your order lifecycle.
              </p>

              <div className="w-full mt-8 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-4 text-left shadow-sm">
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5">🔔</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-none">Rider Status Updates</h4>
                    <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 mt-1 block">Get notified when rider accepts, packs, or arrives at your gate.</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5">🏷️</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-none">Exclusive Discount Codes</h4>
                    <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 mt-1 block">Be the first to claim limited 50% discount codes and free deliveries.</span>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="mt-0.5">⏰</span>
                  <div>
                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100 leading-none">Pre-order Schedule Alerts</h4>
                    <span className="text-[10px] font-bold text-gray-650 dark:text-gray-300 mt-1 block">Receive reminders before your pre-ordered items are prepared.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={handleRequestNotifications}
                fullWidth
                className="py-4.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 active:scale-95"
              >
                Allow Notifications
              </Button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('notification_permission_prompted', 'true');
                  navigate('/', { replace: true });
                }}
                className="py-3.5 text-center text-xs font-black text-gray-400 hover:text-blue-500 uppercase tracking-widest cursor-pointer transition-colors"
              >
                Not Now
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

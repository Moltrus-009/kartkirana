import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { ShieldAlert, Send, KeyRound } from 'lucide-react';

export default function Login() {
  const { sendOTP, verifyOTP } = useAdmin();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendOTP(phoneNumber, 'recaptcha-container');
      setConfirmationResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP code. Ensure phone number format is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !confirmationResult) return;
    setLoading(true);
    setError('');
    try {
      await verifyOTP(confirmationResult, otpCode);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetVerification = () => {
    setConfirmationResult(null);
    setOtpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 p-4 select-none relative overflow-hidden">
      
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />

      {/* Recaptcha hidden widget anchor */}
      <div id="recaptcha-container" className="hidden">
        <div id="recaptcha-widget"></div>
      </div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-8 rounded-[32px] shadow-2xl relative z-10 space-y-6">
        
        {/* Shield Logo */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-4">
            Kart Kirana Admin
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Authorized admin panel control center
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs font-semibold text-left">
            {error}
          </div>
        )}

        {!confirmationResult ? (
          /* Phone OTP Send Form */
          <form onSubmit={handleSendOTP} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Enter Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+91 99999 88888"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-slate-950 font-black py-4 rounded-2xl cursor-pointer text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  Send OTP Code <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* OTP Verification Form */
          <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                Enter 6-digit Code
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors font-semibold tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-slate-950 font-black py-4 rounded-2xl cursor-pointer text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>
                  Verify & Enter <KeyRound className="h-3.5 w-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={resetVerification}
              disabled={loading}
              className="w-full text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Use a different number
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

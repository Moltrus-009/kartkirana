import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/ui/Logo';

export const Splash: React.FC = () => {
  const navigate = useNavigate();
  const { user, onboardingCompleted } = useAuth();
  const [progress, setProgress] = useState(0);

  // Animate progress bar from 0 to 100
  useEffect(() => {
    const duration = 500; // 0.5 seconds
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  // Handle page redirect when progress completes
  useEffect(() => {
    if (progress >= 100) {
      const redirectTimer = setTimeout(() => {
        if (!onboardingCompleted) {
          navigate('/onboarding', { replace: true });
        } else if (user) {
          navigate('/', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 300); // short delay after loading completes
      return () => clearTimeout(redirectTimer);
    }
  }, [progress, navigate, user, onboardingCompleted]);

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden select-none z-50">
      
      {/* Slow Moving Animated Radial Gradient Background */}
      <motion.div
        animate={{
          background: [
            'radial-gradient(circle at 30% 30%, #161616 0%, #0B0B0B 100%)',
            'radial-gradient(circle at 70% 60%, #1f2a18 0%, #0B0B0B 100%)',
            'radial-gradient(circle at 30% 30%, #161616 0%, #0B0B0B 100%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 z-0"
      />

      {/* Floating Glowing Particles / Soft Dots */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#0B74E8]"
            style={{
              width: Math.random() * 6 + 3,
              height: Math.random() * 6 + 3,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: 'blur(1px)',
            }}
            animate={{
              y: [0, -60, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 5 + Math.random() * 5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * i,
            }}
          />
        ))}
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        
        {/* Animated Ripple Circles Behind Logo */}
        <div className="absolute h-64 w-64 rounded-full border border-[#0B74E8]/20 animate-ripple-glow pointer-events-none" />
        <div className="absolute h-80 w-80 rounded-full border border-[#36B6F4]/10 animate-ripple-glow pointer-events-none" style={{ animationDelay: '0.8s' }} />

        {/* Scaled/Fading Brand Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.05, 1], opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative flex flex-col items-center justify-center animate-logo-pulse"
        >
          {/* Logo with explicit text color override */}
          <Logo size="xl" showText={true} textColor="text-white" />
        </motion.div>
      </div>

      {/* Premium Linear Progress Bar Loader */}
      <div className="absolute bottom-24 z-10 flex flex-col items-center gap-3.5 w-60">
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/85">
          <div
            className="h-full bg-gradient-to-r from-[#0758C7] via-[#0B74E8] to-[#36B6F4] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] font-black tracking-[0.3em] text-[#0B74E8] uppercase">
          Delivering In Minutes
        </span>
      </div>

      {/* Bottom Gradient Wave Animation */}
      <div className="absolute bottom-0 left-0 right-0 h-2.5 z-10 animate-gradient-wave" />
    </div>
  );
};

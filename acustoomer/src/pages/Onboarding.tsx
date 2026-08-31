import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, Zap, Store, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

interface Slide {
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
  color: string;
}

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    {
      title: 'Hyperlocal Deliveries in 10 Mins',
      description: 'Get fresh groceries, daily essentials, and quick snacks delivered from nearby shops straight to your doorstep.',
      image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
      icon: <Zap className="h-6 w-6 text-white" />,
      color: 'from-[#0758C7] to-[#0B74E8]'
    },
    {
      title: 'Multiple Category Shops Connected',
      description: 'Why just food? Shop stationery, electronics, medicines, sports gear, fashion, and hardware from verified local merchants.',
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      icon: <Store className="h-6 w-6 text-white" />,
      color: 'from-[#0B74E8] to-[#36B6F4]'
    },
    {
      title: 'Interactive Preorders & Live Tracking',
      description: 'Schedule orders, book preorder slots for seasonal produce, and track your delivery rider in real-time with zero anxiety.',
      image: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=600&q=80',
      icon: <Compass className="h-6 w-6 text-white" />,
      color: 'from-[#0B74E8] to-[#FFC928]'
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    completeOnboarding();
    navigate('/login');
  };

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-6 transition-colors duration-250">
      
      {/* Skip Button Header */}
      <div className="flex justify-end pt-4">
        {currentSlide < slides.length - 1 && (
          <button
            onClick={handleFinish}
            className="text-sm font-black text-gray-400 hover:text-[#0B74E8] transition-colors cursor-pointer"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide Illustration & Info */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto my-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center"
          >
            {/* Image Card */}
            <div className="relative aspect-square w-full max-w-[280px] rounded-3xl overflow-hidden shadow-2xl mb-8 border border-slate-200 dark:border-slate-800">
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
              <div className={`absolute bottom-4 left-4 p-3.5 rounded-2xl bg-gradient-to-br ${slide.color} shadow-lg shadow-black/10`}>
                {slide.icon}
              </div>
            </div>

            {/* Content text */}
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-gray-900 leading-tight">
                {slide.title}
              </h2>
              <p className="text-sm font-medium text-gray-600 mt-4 leading-relaxed">
                {slide.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="pb-8 max-w-sm mx-auto w-full flex items-center justify-between">
        {/* Pagination Dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300
                ${idx === currentSlide 
                  ? 'w-6 bg-[#0B74E8]'
                  : 'w-2 bg-[#2D2D2D]'
                }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button
          onClick={handleNext}
          className="rounded-2xl flex items-center gap-1 shadow-lg"
          variant={currentSlide === slides.length - 1 ? 'primary' : 'outline'}
        >
          {currentSlide === slides.length - 1 ? (
            <>
              Get Started
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

    </div>
  );
};

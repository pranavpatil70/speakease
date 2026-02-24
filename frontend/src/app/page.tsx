'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress } from '@/lib/progressState';

/**
 * Welcome Screen
 * Simple, encouraging entry point to the app
 */
export default function WelcomePage() {
  const router = useRouter();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    setStreak(getProgress().streak.current);
  }, []);

  const handleStart = () => {
    router.push('/mode-select');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Logo/Icon */}
      <div className="mb-8 animate-bounce-gentle">
        <div className="w-24 h-24 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
          <svg 
            className="w-12 h-12 text-white" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
        </div>
      </div>

      {/* Streak badge — only shown after at least one practice session */}
      {streak > 0 && (
        <div className="flex items-center gap-2 bg-warm-100 border border-warm-300 rounded-full px-4 py-2 mb-4 animate-fade-in">
          <span role="img" aria-label="fire">🔥</span>
          <span className="text-warm-800 font-semibold text-sm">{streak}-day streak</span>
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-800 text-center mb-4 animate-fade-in">
        SpeakEase
      </h1>

      {/* Tagline */}
      <p className="text-xl text-gray-600 text-center mb-12 max-w-md animate-slide-up">
        Practice English by speaking
      </p>

      {/* Encouraging message */}
      <p className="text-gray-500 text-center mb-8 max-w-sm animate-slide-up" style={{ animationDelay: '0.1s' }}>
        A safe space to build your confidence, one conversation at a time.
      </p>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="ripple bg-primary-500 hover:bg-primary-600 text-white text-xl font-semibold 
                   py-4 px-12 rounded-full shadow-lg hover:shadow-xl 
                   transform hover:scale-105 transition-all duration-300
                   focus:outline-none focus:ring-4 focus:ring-primary-300
                   animate-slide-up"
        style={{ animationDelay: '0.2s' }}
      >
        Let's Start
      </button>

      {/* Footer note */}
      <p className="text-sm text-gray-400 mt-16 text-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
        No login required • Your practice stays private
      </p>

      {/* Progress shortcut for returning users */}
      {streak > 0 && (
        <button
          onClick={() => router.push('/progress')}
          className="mt-3 text-sm text-primary-500 hover:text-primary-700 underline underline-offset-2 transition-colors animate-fade-in"
          style={{ animationDelay: '0.5s' }}
        >
          View my progress
        </button>
      )}
    </div>
  );
}

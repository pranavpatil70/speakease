'use client';

import { useState, useCallback } from 'react';

interface MicButtonProps {
  isRecording: boolean;
  isDisabled?: boolean;
  isAISpeaking?: boolean;
  onPress: () => void;
  onRelease: () => void;
  size?: 'normal' | 'large';
}

/**
 * Push-to-talk microphone button
 * Big, prominent, and easy to use
 */
export function MicButton({ 
  isRecording, 
  isDisabled = false, 
  isAISpeaking = false,
  onPress, 
  onRelease,
  size = 'large'
}: MicButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = useCallback(() => {
    if (isDisabled || isAISpeaking) return;
    setIsPressed(true);
    onPress();
  }, [isDisabled, isAISpeaking, onPress]);

  const handlePressEnd = useCallback(() => {
    if (isPressed) {
      setIsPressed(false);
      onRelease();
    }
  }, [isPressed, onRelease]);

  const sizeClasses = size === 'large' 
    ? 'w-28 h-28 md:w-32 md:h-32' 
    : 'w-20 h-20 md:w-24 md:h-24';

  const iconSize = size === 'large' ? 'w-12 h-12' : 'w-8 h-8';

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when recording */}
      {isRecording && (
        <>
          <div className="absolute rounded-full bg-red-400/30 pulse-ring" 
               style={{ width: '150%', height: '150%' }} />
          <div className="absolute rounded-full bg-red-400/20 pulse-ring" 
               style={{ width: '180%', height: '180%', animationDelay: '0.3s' }} />
        </>
      )}

      {/* AI speaking indicator ring */}
      {isAISpeaking && (
        <div className="absolute rounded-full border-4 border-primary-400 animate-ping"
             style={{ width: '120%', height: '120%' }} />
      )}

      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        disabled={isDisabled}
        className={`
          ${sizeClasses}
          rounded-full
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-4
          ${isDisabled 
            ? 'bg-gray-300 cursor-not-allowed' 
            : isRecording 
              ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' 
              : isAISpeaking
                ? 'bg-primary-400 cursor-wait'
                : 'bg-primary-500 hover:bg-primary-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
          }
          ${isRecording ? 'focus:ring-red-300' : 'focus:ring-primary-300'}
        `}
        aria-label={isRecording ? 'Recording... Release to stop' : 'Hold to speak'}
      >
        {isRecording ? (
          // Recording icon (pause bars)
          <div className="flex gap-1">
            <div className="w-2 h-8 bg-white rounded" />
            <div className="w-2 h-8 bg-white rounded" />
          </div>
        ) : (
          // Microphone icon
          <svg 
            className={`${iconSize} text-white`} 
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
        )}
      </button>
    </div>
  );
}

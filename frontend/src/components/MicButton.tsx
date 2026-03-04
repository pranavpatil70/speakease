'use client';

import { useCallback } from 'react';

interface MicButtonProps {
  isMicOn: boolean;
  isDisabled?: boolean;
  isAISpeaking?: boolean;
  onToggle: () => void;
  size?: 'normal' | 'large';
}

/**
 * Toggle microphone button — click once to unmute, click again to mute.
 * Works like Zoom/Google Meet: the realtime VAD detects speech automatically.
 */
export function MicButton({
  isMicOn,
  isDisabled = false,
  isAISpeaking = false,
  onToggle,
  size = 'large'
}: MicButtonProps) {
  const handleClick = useCallback(() => {
    if (isDisabled) return;
    onToggle();
  }, [isDisabled, onToggle]);

  const sizeClasses = size === 'large'
    ? 'w-28 h-28 md:w-32 md:h-32'
    : 'w-20 h-20 md:w-24 md:h-24';

  const iconSize = size === 'large' ? 'w-12 h-12' : 'w-8 h-8';

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring when mic is on (streaming audio) */}
      {isMicOn && (
        <>
          <div className="absolute rounded-full bg-green-400/25 pulse-ring"
               style={{ width: '150%', height: '150%' }} />
          <div className="absolute rounded-full bg-green-400/15 pulse-ring"
               style={{ width: '180%', height: '180%', animationDelay: '0.3s' }} />
        </>
      )}

      {/* AI speaking indicator ring */}
      {isAISpeaking && (
        <div className="absolute rounded-full border-4 border-primary-400 animate-ping"
             style={{ width: '120%', height: '120%' }} />
      )}

      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          ${sizeClasses}
          rounded-full
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-4
          select-none
          ${isDisabled
            ? 'bg-gray-300 cursor-not-allowed'
            : isMicOn
              ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/40 scale-105'
              : 'bg-gray-500 hover:bg-gray-600 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
          }
          ${isMicOn ? 'focus:ring-green-300' : 'focus:ring-gray-300'}
        `}
        aria-label={isMicOn ? 'Microphone on — click to mute' : 'Microphone muted — click to unmute'}
        title={isMicOn ? 'Click to mute' : 'Click to unmute'}
      >
        {isMicOn ? (
          // Active mic icon
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
        ) : (
          // Muted mic icon (mic with slash)
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
            <line
              x1="3"
              y1="3"
              x2="21"
              y2="21"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

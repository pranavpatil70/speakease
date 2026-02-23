'use client';

interface WaveAnimationProps {
  isActive: boolean;
  variant?: 'user' | 'ai';
  className?: string;
}

/**
 * Audio wave animation for visual feedback
 * Shows when user or AI is speaking
 */
export function WaveAnimation({ 
  isActive, 
  variant = 'ai',
  className = '' 
}: WaveAnimationProps) {
  const barCount = 5;
  const baseColor = variant === 'ai' ? 'bg-primary-500' : 'bg-red-400';
  const inactiveColor = 'bg-gray-300';

  return (
    <div className={`flex items-center justify-center gap-1 h-12 ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`
            w-1.5 rounded-full transition-all duration-300
            ${isActive ? baseColor : inactiveColor}
            ${isActive ? 'wave-bar' : 'h-4'}
          `}
          style={{
            height: isActive ? undefined : '16px',
            animationDelay: isActive ? `${i * 0.1}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Circular pulse animation for AI speaking indicator
 */
export function PulseIndicator({ 
  isActive, 
  label = 'AI',
  className = '' 
}: { 
  isActive: boolean; 
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative">
        {/* Pulse rings */}
        {isActive && (
          <>
            <div className="absolute inset-0 rounded-full bg-primary-400/30 animate-ping" />
            <div 
              className="absolute inset-0 rounded-full bg-primary-400/20 animate-ping" 
              style={{ animationDelay: '0.3s' }} 
            />
          </>
        )}
        
        {/* Main circle */}
        <div 
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isActive 
              ? 'bg-primary-500 shadow-lg shadow-primary-500/30' 
              : 'bg-gray-200'
            }
          `}
        >
          {isActive ? (
            <WaveAnimation isActive={true} variant="ai" />
          ) : (
            <svg 
              className="w-8 h-8 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          )}
        </div>
      </div>
      
      <span className={`text-sm font-medium ${isActive ? 'text-primary-600' : 'text-gray-400'}`}>
        {isActive ? `${label} is speaking...` : label}
      </span>
    </div>
  );
}

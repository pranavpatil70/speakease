'use client';

import { useRouter } from 'next/navigation';

/**
 * Mode Selection Screen
 * Choose between Casual Talk, Office English, or Interview Mode
 */

interface ModeCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  delay: string;
}

function ModeCard({ title, description, icon, onClick, color, delay }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`ripple w-full p-6 rounded-2xl shadow-md hover:shadow-lg 
                  transform hover:scale-102 transition-all duration-300
                  text-left ${color} animate-slide-up`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-14 h-14 rounded-full bg-white/80 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </button>
  );
}

export default function ModeSelectPage() {
  const router = useRouter();

  const modes = [
    {
      id: 'casual',
      title: 'Casual Talk',
      description: 'Have a friendly chat with AI. No pressure, no judgment. Just practice speaking naturally.',
      color: 'bg-gradient-to-br from-primary-50 to-primary-100 hover:from-primary-100 hover:to-primary-200',
      icon: (
        <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'office',
      title: 'Office English',
      description: 'Practice professional communication. Learn workplace phrases and sound confident.',
      color: 'bg-gradient-to-br from-sage-50 to-sage-100 hover:from-sage-100 hover:to-sage-200',
      icon: (
        <svg className="w-7 h-7 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'interview',
      title: 'Interview Mode',
      description: 'Practice with a simulated HR interview. Get feedback on your answers and body language.',
      color: 'bg-gradient-to-br from-warm-50 to-warm-100 hover:from-warm-100 hover:to-warm-200',
      icon: (
        <svg className="w-7 h-7 text-warm-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col px-6 py-8">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="self-start mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Choose Your Practice Mode
        </h1>
        <p className="text-gray-500">
          What would you like to practice today?
        </p>
      </div>

      {/* Mode Cards */}
      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        {modes.map((mode, index) => (
          <ModeCard
            key={mode.id}
            title={mode.title}
            description={mode.description}
            icon={mode.icon}
            color={mode.color}
            onClick={() => router.push(`/${mode.id}`)}
            delay={`${index * 0.1}s`}
          />
        ))}
      </div>

      {/* Tip */}
      <p className="text-center text-sm text-gray-400 mt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        Tip: Start with Casual Talk if you're feeling nervous
      </p>
    </div>
  );
}

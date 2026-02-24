'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getFeedback, clearFeedback, clearSession, clearInterviewSetup, getInterviewSetup, type FeedbackData } from '@/lib/sessionState';
import { saveSession } from '@/lib/progressState';

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore?: number;
}

function ScoreBar({ label, score, maxScore = 5 }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;
  
  const getColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-primary-500';
    if (pct >= 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{score}/{maxScore}</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 score-bar ${getColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Interview Feedback Screen
 * Shows scores and improvement tips after an interview
 */
export default function FeedbackPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);

  useEffect(() => {
    const data = getFeedback();
    if (!data) {
      // No feedback data, redirect to home
      router.push('/');
      return;
    }
    setFeedback(data);

    // Show tips after a delay
    setTimeout(() => setShowTips(true), 1500);

    // Save session to progress tracking (only for interview mode with setup data)
    const setup = getInterviewSetup();
    if (setup) {
      const result = saveSession({
        date: new Date().toISOString(),
        field: setup.field,
        experience: setup.experience,
        difficulty: setup.difficulty,
        confidenceScore: data.confidenceScore,
        duration: data.duration,
        questionCount: setup.questionCount,
      });

      if (result.streakUpdated) {
        setStreakMessage(`${result.newStreakCount}-day streak! Keep it up!`);
      }
    }
  }, [router]);

  const handlePracticeAgain = () => {
    clearFeedback();
    clearSession();
    clearInterviewSetup();
    router.push('/interview-setup');
  };

  const handleGoHome = () => {
    clearFeedback();
    clearSession();
    clearInterviewSetup();
    router.push('/');
  };

  const handleViewProgress = () => {
    clearFeedback();
    clearSession();
    clearInterviewSetup();
    router.push('/progress');
  };

  if (!feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading feedback...</p>
      </div>
    );
  }

  const { scores, confidenceScore, improvementTips, summary, duration } = feedback;

  // Map score keys to display labels
  const scoreLabels: Record<string, string> = {
    eyeContact: 'Eye Contact',
    headStability: 'Head Stability',
    posture: 'Posture',
    handMovement: 'Hand Movement',
    speakingPace: 'Speaking Pace',
    fillerWords: 'Filler Word Control',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Interview Feedback</h1>
        <p className="text-gray-500">Duration: {formatDuration(duration)}</p>
      </div>

      {/* Confidence Score */}
      <div className="max-w-md mx-auto mb-8 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <h2 className="text-lg font-medium text-gray-600 mb-4">Overall Confidence</h2>
          
          {/* Big score circle */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={confidenceScore >= 7 ? '#22c55e' : confidenceScore >= 5 ? '#0ea5e9' : '#f59e0b'}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(confidenceScore / 10) * 352} 352`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-gray-800">{confidenceScore}</span>
              <span className="text-lg text-gray-400 mt-2">/10</span>
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* Detailed Scores */}
      <div className="max-w-md mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Detailed Scores</h2>
          
          {Object.entries(scores).map(([key, value]) => (
            <ScoreBar 
              key={key}
              label={scoreLabels[key] || key}
              score={value}
            />
          ))}
        </div>
      </div>

      {/* Improvement Tips */}
      {showTips && improvementTips.length > 0 && (
        <div className="max-w-md mx-auto mb-8 animate-slide-up">
          <div className="bg-warm-50 rounded-2xl shadow-lg p-6 border border-warm-200">
            <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-warm-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Tips for Improvement
            </h2>
            
            <ul className="space-y-3">
              {improvementTips.map((tip, index) => (
                <li key={index} className="flex gap-3 text-gray-700">
                  <span className="flex-shrink-0 w-6 h-6 bg-warm-200 rounded-full flex items-center justify-center text-sm font-medium text-warm-700">
                    {index + 1}
                  </span>
                  <span className="leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="max-w-md mx-auto flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
        {/* Streak toast */}
        {streakMessage && (
          <div className="flex items-center gap-3 bg-warm-50 border border-warm-200 rounded-2xl p-4 animate-fade-in">
            <span className="text-2xl" role="img" aria-label="fire">🔥</span>
            <p className="text-warm-800 font-medium text-sm">{streakMessage}</p>
          </div>
        )}

        <button
          onClick={handlePracticeAgain}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold
                     py-4 rounded-full shadow-lg hover:shadow-xl
                     transform hover:scale-102 transition-all duration-300"
        >
          Practice Again
        </button>

        <button
          onClick={handleViewProgress}
          className="w-full bg-sage-100 hover:bg-sage-200 text-sage-800 text-lg font-semibold
                     py-4 rounded-full border border-sage-300
                     transition-all duration-300"
        >
          View My Progress
        </button>

        <button
          onClick={handleGoHome}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 text-lg font-semibold
                     py-4 rounded-full border border-gray-200
                     hover:border-gray-300 transition-all duration-300"
        >
          Back to Home
        </button>
      </div>

      {/* Encouragement */}
      <p className="text-center text-sm text-gray-400 mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        Every interview makes you better. Keep practicing!
      </p>
    </div>
  );
}

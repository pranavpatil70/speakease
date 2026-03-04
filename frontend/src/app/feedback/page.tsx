'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getFeedback,
  clearFeedback,
  clearSession,
  clearInterviewSetup,
  getInterviewSetup,
  getDailyChallenge,
  clearDailyChallenge,
  type FeedbackData,
} from '@/lib/sessionState';
import { saveSession, BADGES } from '@/lib/progressState';

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
 * Interview / Daily Challenge Feedback Screen
 * Shows scores and improvement tips after a session
 */
export default function FeedbackPage() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [streakMessage, setStreakMessage] = useState<string | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  useEffect(() => {
    const data = getFeedback();
    if (!data) {
      router.push('/');
      return;
    }
    setFeedback(data);
    setTimeout(() => setShowTips(true), 1500);

    // Determine session type — daily challenge takes priority
    const dailySetup = getDailyChallenge();
    const interviewSetup = getInterviewSetup();

    if (dailySetup) {
      const result = saveSession({
        date: new Date().toISOString(),
        field: `Daily: ${dailySetup.title}`,
        experience: 'daily',
        difficulty: 'daily',
        confidenceScore: data.confidenceScore,
        duration: data.duration,
        questionCount: 1,
        sessionType: 'daily',
      });
      if (result.streakUpdated) setStreakMessage(`${result.newStreakCount}-day streak! Keep it up!`);
      setXpEarned(result.xpEarned);
      setNewBadges(result.newBadges);
    } else if (interviewSetup) {
      const result = saveSession({
        date: new Date().toISOString(),
        field: interviewSetup.field,
        experience: interviewSetup.experience,
        difficulty: interviewSetup.difficulty,
        confidenceScore: data.confidenceScore,
        duration: data.duration,
        questionCount: interviewSetup.questionCount,
        sessionType: 'interview',
      });
      if (result.streakUpdated) setStreakMessage(`${result.newStreakCount}-day streak! Keep it up!`);
      setXpEarned(result.xpEarned);
      setNewBadges(result.newBadges);
    }
  }, [router]);

  const clearAll = () => {
    clearFeedback();
    clearSession();
    clearInterviewSetup();
    clearDailyChallenge();
  };

  const handlePracticeAgain = () => {
    clearAll();
    router.push('/mode-select');
  };

  const handleGoHome = () => {
    clearAll();
    router.push('/');
  };

  const handleViewProgress = () => {
    clearAll();
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

  const scoreLabels: Record<string, string> = {
    fillerWords: 'Filler Word Control',
    speakingPace: 'Speaking Pace',
    eyeContact: 'Eye Contact',
    headStability: 'Head Stability',
  };

  // Only render score bars for metrics that are present and non-zero
  const availableScores = Object.entries(scores).filter(
    ([, value]) => typeof value === 'number' && !isNaN(value)
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Session Feedback</h1>
        <p className="text-gray-500">Duration: {formatDuration(duration)}</p>
      </div>

      {/* Confidence Score */}
      <div className="max-w-md mx-auto mb-8 animate-slide-up">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <h2 className="text-lg font-medium text-gray-600 mb-4">Overall Confidence</h2>

          {feedback.noSpeechDetected ? (
            <div className="py-4">
              <p className="text-4xl mb-3">🎤</p>
              <p className="text-gray-500 text-sm">No speech detected in this session.</p>
            </div>
          ) : (
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="#e5e7eb" strokeWidth="8" fill="none" />
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
          )}

          <p className="text-gray-600 leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* Detailed Scores — only shown if there are scores to display */}
      {availableScores.length > 0 && (
        <div className="max-w-md mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Detailed Scores</h2>
            {availableScores.map(([key, value]) => (
              <ScoreBar
                key={key}
                label={scoreLabels[key] || key}
                score={value as number}
              />
            ))}
            <p className="text-xs text-gray-400 mt-4">
              Scores are computed from your actual speech transcript
              {Object.keys(scores).includes('eyeContact') ? ' and camera feed' : ''}.
            </p>
          </div>
        </div>
      )}

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

        {/* XP toast */}
        {xpEarned !== null && (
          <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-2xl p-4 animate-fade-in">
            <span className="text-2xl">⚡</span>
            <p className="text-primary-800 font-medium text-sm">+{xpEarned} XP earned!</p>
          </div>
        )}

        {/* New badges toast */}
        {newBadges.length > 0 && (
          <div className="bg-primary-500 rounded-2xl p-4 animate-fade-in">
            <p className="text-white font-semibold text-sm mb-2">
              New badge{newBadges.length > 1 ? 's' : ''} unlocked!
            </p>
            <div className="flex flex-wrap gap-2">
              {newBadges.map((badgeId) => {
                const badge = BADGES.find((b) => b.id === badgeId);
                return badge ? (
                  <span key={badgeId} className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {badge.label}
                  </span>
                ) : null;
              })}
            </div>
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

      <p className="text-center text-sm text-gray-400 mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        Every session makes you better. Keep practising!
      </p>
    </div>
  );
}

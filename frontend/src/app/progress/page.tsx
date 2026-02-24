'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProgress, getMonthlyProgress, type UserProgress } from '@/lib/progressState';

export default function ProgressPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(getProgress());
  }, []);

  if (!progress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const monthlyCount = getMonthlyProgress(progress);
  const monthlyPct = Math.min((monthlyCount / progress.monthlyGoal) * 100, 100);
  const last10 = progress.sessions.slice(-10);
  const fieldEntries = Object.entries(progress.fieldStats).sort(
    ([, a], [, b]) => b.totalSessions - a.totalSessions
  );

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <button
        onClick={() => router.push('/')}
        className="self-start mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">My Progress</h1>
        <p className="text-gray-500">Track your confidence journey</p>
      </div>

      <div className="max-w-md mx-auto w-full flex flex-col gap-4">

        {/* Streak Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 animate-slide-up">
          <span className="text-4xl" role="img" aria-label="fire">🔥</span>
          <div>
            <div className="text-3xl font-bold text-gray-800">{progress.streak.current}</div>
            <div className="text-sm text-gray-500">day streak</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-gray-400 mb-0.5">Longest</div>
            <div className="font-semibold text-gray-700">{progress.streak.longest} days</div>
          </div>
        </div>

        {/* Monthly Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex justify-between mb-2">
            <span className="font-medium text-gray-700">This Month</span>
            <span className="font-bold text-gray-800">{monthlyCount} / {progress.monthlyGoal}</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-700"
              style={{ width: `${monthlyPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">Monthly goal: {progress.monthlyGoal} sessions</p>
        </div>

        {/* Confidence Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-medium text-gray-700 mb-4">Confidence Trend</h2>
          {last10.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              No sessions yet. Complete your first interview to see your trend!
            </p>
          ) : (
            <div className="flex items-end gap-1.5 h-20">
              {last10.map((session, i) => {
                const pct = (session.confidenceScore / 10) * 100;
                const color =
                  pct >= 70 ? 'bg-green-400' : pct >= 50 ? 'bg-primary-400' : 'bg-yellow-400';
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end h-full"
                    title={`${session.confidenceScore}/10 · ${new Date(session.date).toLocaleDateString()} · ${session.field}`}
                  >
                    <div
                      className={`${color} rounded-t-sm w-full transition-all duration-700`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {last10.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-center">Last {last10.length} sessions · hover/tap bars for details</p>
          )}
        </div>

        {/* Total Sessions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <span className="font-medium text-gray-700">Total Sessions</span>
          <span className="text-2xl font-bold text-primary-600">{progress.totalSessions}</span>
        </div>

        {/* Field Breakdown */}
        {fieldEntries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h2 className="font-medium text-gray-700 mb-4">Fields Practiced</h2>
            <div className="flex flex-col gap-3">
              {fieldEntries.map(([field, stats]) => (
                <div key={field} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{field}</p>
                    <p className="text-xs text-gray-400">{stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''} · avg {stats.avgConfidence}/10</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1">
                    <span className="text-xs font-semibold text-green-700">Best {stats.bestConfidence}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push('/interview-setup')}
          className="w-full bg-warm-600 hover:bg-warm-700 text-white text-lg font-semibold
                     py-4 rounded-full shadow-lg hover:shadow-xl
                     transform hover:scale-102 transition-all duration-300
                     animate-slide-up"
          style={{ animationDelay: '0.25s' }}
        >
          Start Today&apos;s Practice
        </button>

      </div>
    </div>
  );
}

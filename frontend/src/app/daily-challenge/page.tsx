'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MicButton, ConnectionStatusBadge, LoadingOverlay } from '@/components';
import { useRealtimeWebSocket, useAudioRecorder, useAudioPlayer } from '@/hooks';
import {
  startSession,
  endSession,
  storeFeedback,
  storeDailyChallenge,
  clearDailyChallenge,
  type DailyChallengeSetup,
} from '@/lib/sessionState';
import { getTodaysChallenge, getTomorrowsChallenge } from '@/lib/dailyChallenges';
import { getProgress } from '@/lib/progressState';

type Stage = 'preview' | 'active' | 'ending';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function hasCompletedTodayChallenge(): boolean {
  try {
    const progress = getProgress();
    const today = todayString();
    return progress.sessions.some(
      (s) => s.sessionType === 'daily' && s.date.startsWith(today)
    );
  } catch {
    return false;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'Self-Introduction': 'bg-primary-100 text-primary-700',
  'Behavioral':        'bg-warm-100 text-warm-700',
  'Situational':       'bg-sage-100 text-sage-700',
  'Closing':           'bg-purple-100 text-purple-700',
};

export default function DailyChallengePage() {
  const router = useRouter();

  const challenge = getTodaysChallenge();
  const tomorrow = getTomorrowsChallenge();
  const alreadyDone = hasCompletedTodayChallenge();

  const [stage, setStage] = useState<Stage>('preview');
  const [aiTranscript, setAITranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dailySetup, setDailySetup] = useState<DailyChallengeSetup | null>(null);

  // Accumulate all user speech for honest feedback analysis
  const userTranscriptsRef = useRef<string[]>([]);

  const { queueAudio, initAudioContext } = useAudioPlayer();

  const {
    status,
    isAISpeaking,
    connect,
    disconnect,
    sendAudio,
    endInterview,
  } = useRealtimeWebSocket({
    mode: 'daily',
    dailyScenario: dailySetup
      ? { challengeId: dailySetup.challengeId, title: dailySetup.title, systemPrompt: dailySetup.systemPrompt }
      : undefined,
    onAudioDelta: (delta) => {
      queueAudio(delta);
    },
    onTranscriptDelta: (delta) => {
      setAITranscript((prev) => prev + delta);
    },
    onTranscriptDone: (text) => {
      setAITranscript(text);
      if (text.toLowerCase().includes('the challenge is complete')) {
        setStage('ending');
      }
    },
    onUserTranscript: (text) => {
      // Accumulate all user speech for feedback analysis
      userTranscriptsRef.current.push(text);
    },
    onError: (message) => {
      console.error('WebSocket error:', message);
    },
  });

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: (base64Audio) => {
      sendAudio(base64Audio);
    },
  });

  const handleBeginChallenge = useCallback(() => {
    const setup: DailyChallengeSetup = {
      challengeId: challenge.id,
      title: challenge.title,
      scenario: challenge.scenario,
      systemPrompt: challenge.systemPrompt,
      date: todayString(),
    };
    storeDailyChallenge(setup);
    setDailySetup(setup);
    userTranscriptsRef.current = [];
    initAudioContext();
    startSession('interview');
    setStage('active');
  }, [challenge, initAudioContext]);

  // Connect after setup is stored in state (ref in hook needs to be current)
  useEffect(() => {
    if (stage === 'active' && dailySetup) {
      connect();
    }
  }, [stage, dailySetup, connect]);

  const handleEndChallenge = useCallback(async () => {
    setIsAnalyzing(true);

    if (isRecording) stopRecording();
    endInterview();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const session = endSession();
    const duration = session ? (session.endTime || Date.now()) - session.startTime : 0;

    // Build an aggregated transcript from all user speech
    const transcript = userTranscriptsRef.current.join(' ').trim();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3001`;
      const response = await fetch(`${apiUrl}/api/analyze-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameData: { frameCount: 0, frames: [] }, transcript, duration }),
      });
      const analysis = await response.json();
      storeFeedback({ ...analysis, duration });
    } catch {
      storeFeedback({
        scores: { speakingPace: 3, fillerWords: 3 },
        confidenceScore: 5,
        improvementTips: [
          'Structure your answer clearly: situation, action, result.',
          'Speak at a measured pace — slower is often clearer.',
          'Avoid filler words like "um", "uh", or "like".',
        ],
        summary: 'Good practice! Every repetition builds real confidence.',
        duration,
      });
    }

    disconnect();
    router.push('/feedback');
  }, [isRecording, stopRecording, endInterview, disconnect, router]);

  // Toggle mic on/off — VAD handles speech detection automatically
  const handleMicToggle = useCallback(async () => {
    if (status !== 'connected') return;

    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  }, [status, isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      disconnect();
      clearDailyChallenge();
    };
  }, []);

  if (isAnalyzing) {
    return <LoadingOverlay message="Analysing your response..." />;
  }

  const categoryColor = CATEGORY_COLORS[challenge.category] ?? 'bg-gray-100 text-gray-700';

  // ── Preview stage ────────────────────────────────────────────────────────────
  if (stage === 'preview') {
    return (
      <div className="min-h-screen flex flex-col px-6 py-8 bg-gradient-to-b from-primary-50 to-white">
        {/* Back */}
        <button
          onClick={() => router.push('/mode-select')}
          className="self-start mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-6 animate-fade-in">
          <p className="text-sm text-primary-500 font-semibold uppercase tracking-wide mb-1">Today&apos;s Challenge</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{challenge.title}</h1>
        </div>

        <div className="max-w-md mx-auto w-full flex flex-col gap-4">

          {/* Category chip */}
          <div className="flex justify-center animate-fade-in">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColor}`}>
              {challenge.category}
            </span>
          </div>

          {/* Scenario card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slide-up">
            <p className="text-gray-700 leading-relaxed text-sm">{challenge.scenario}</p>
          </div>

          {/* Tips card */}
          <div className="bg-primary-50 rounded-2xl border border-primary-100 p-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <p className="text-xs font-semibold text-primary-600 mb-2 uppercase tracking-wide">How it works</p>
            <ul className="space-y-1.5 text-sm text-primary-800">
              <li className="flex gap-2"><span>•</span><span>Unmute your mic and speak when ready</span></li>
              <li className="flex gap-2"><span>•</span><span>The AI detects your speech automatically — no button holding needed</span></li>
              <li className="flex gap-2"><span>•</span><span>You&apos;ll get honest feedback on filler words and speaking pace</span></li>
              <li className="flex gap-2"><span>•</span><span>Aim for 2-3 minutes. Quality over quantity.</span></li>
            </ul>
          </div>

          {/* Already done state */}
          {alreadyDone ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center animate-fade-in">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-gray-800 mb-1">Challenge complete for today!</p>
              <p className="text-sm text-gray-500 mb-4">Come back tomorrow for a new scenario.</p>
              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Tomorrow&apos;s preview</p>
                <p className="text-sm font-semibold text-gray-700">{tomorrow.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{tomorrow.category}</p>
              </div>
              <button
                onClick={() => router.push('/progress')}
                className="mt-4 w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 rounded-full transition-colors"
              >
                View My Progress
              </button>
            </div>
          ) : (
            <button
              onClick={handleBeginChallenge}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold
                         py-4 rounded-full shadow-lg hover:shadow-xl
                         transform hover:scale-102 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              Begin Challenge
            </button>
          )}

          <p className="text-center text-xs text-gray-400 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            New scenario every day • No login required
          </p>
        </div>
      </div>
    );
  }

  // ── Active / Ending stage ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-gradient-to-b from-primary-50 to-white">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColor}`}>
            {challenge.category}
          </span>
          <span className="text-sm font-medium text-gray-700 truncate max-w-[160px]">{challenge.title}</span>
        </div>
        <ConnectionStatusBadge status={status} />
      </div>

      {/* Collapsed scenario reminder */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-6 animate-fade-in">
        <p className="text-xs text-gray-500 line-clamp-2">{challenge.scenario}</p>
      </div>

      {/* AI transcript */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[140px] flex items-center justify-center mb-8 animate-fade-in">
          {aiTranscript ? (
            <p className="text-gray-800 text-center leading-relaxed">{aiTranscript}</p>
          ) : (
            <p className="text-gray-400 text-center text-sm">
              {status === 'connected'
                ? 'Unmute your mic to start speaking'
                : status === 'connecting'
                ? 'Connecting...'
                : 'Starting session...'}
            </p>
          )}
        </div>

        {/* Mic button + controls */}
        <div className="flex flex-col items-center gap-6">
          <MicButton
            isMicOn={isRecording}
            isDisabled={status !== 'connected'}
            isAISpeaking={isAISpeaking}
            onToggle={handleMicToggle}
            size="large"
          />

          <p className="text-sm text-gray-400">
            {isRecording
              ? isAISpeaking ? 'AI is speaking...' : 'Listening — speak naturally'
              : 'Click to unmute'}
          </p>

          {/* End challenge button */}
          {(stage === 'active' || stage === 'ending') && status === 'connected' && (
            <button
              onClick={handleEndChallenge}
              className="mt-2 px-6 py-2.5 rounded-full border border-gray-300 text-gray-600
                         hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-medium"
            >
              {stage === 'ending' ? 'View Feedback' : 'End Challenge'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

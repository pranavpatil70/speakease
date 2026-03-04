'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MicButton, PulseIndicator, ConnectionStatusBadge } from '@/components';
import { useRealtimeWebSocket, useAudioRecorder, useAudioPlayer } from '@/hooks';

/**
 * Office English Mode
 * Professional communication practice for workplace scenarios
 */
export default function OfficePage() {
  const router = useRouter();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiTranscript, setAITranscript] = useState('');

  // Audio player for AI responses
  const { queueAudio, initAudioContext } = useAudioPlayer();

  // WebSocket connection
  const {
    status,
    isAISpeaking,
    connect,
    disconnect,
    sendAudio,
  } = useRealtimeWebSocket({
    mode: 'office',
    onAudioDelta: (delta) => {
      queueAudio(delta);
    },
    onTranscriptDelta: (delta) => {
      setAITranscript((prev) => prev + delta);
    },
    onTranscriptDone: (text) => {
      setAITranscript(text);
    },
    onUserTranscript: (text) => {
      setTranscript(text);
    },
    onError: (message) => {
      console.error('WebSocket error:', message);
    },
  });

  // Audio recorder
  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onAudioData: (base64Audio) => {
      sendAudio(base64Audio);
    },
  });

  // Start session
  const handleStartSession = useCallback(async () => {
    try {
      initAudioContext();
      connect();
      setIsSessionActive(true);
    } catch (err) {
      console.error('Failed to start session:', err);
    }
  }, [connect, initAudioContext]);

  // End session
  const handleEndSession = useCallback(() => {
    stopRecording();
    disconnect();
    setIsSessionActive(false);
    router.push('/mode-select');
  }, [disconnect, stopRecording, router]);

  // Toggle mic on/off — VAD handles speech detection automatically
  const handleMicToggle = useCallback(async () => {
    if (status !== 'connected') return;

    if (isRecording) {
      stopRecording();
    } else {
      try {
        setTranscript('');
        await startRecording();
      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    }
  }, [status, isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Professional scenario prompts
  const scenarios = [
    'Email writing practice',
    'Meeting participation',
    'Phone call etiquette',
    'Presentation skills',
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={handleEndSession}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>End</span>
        </button>

        <h1 className="text-lg font-semibold text-gray-700">Office English</h1>

        <ConnectionStatusBadge status={status} />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {!isSessionActive ? (
          // Start screen
          <div className="text-center animate-fade-in">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto bg-sage-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Professional Practice</h2>
              <p className="text-gray-500 max-w-sm mb-6">
                Practice workplace English with professional scenarios.
                Learn phrases that sound polished and confident.
              </p>

              {/* Scenario chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {scenarios.map((scenario) => (
                  <span
                    key={scenario}
                    className="px-3 py-1 bg-sage-100 text-sage-700 text-sm rounded-full"
                  >
                    {scenario}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartSession}
              className="bg-sage-600 hover:bg-sage-700 text-white text-lg font-semibold
                         py-4 px-10 rounded-full shadow-lg hover:shadow-xl
                         transform hover:scale-105 transition-all duration-300"
            >
              Start Practice
            </button>

            <p className="mt-8 text-sm text-gray-400">
              The AI will help you sound more professional
            </p>
          </div>
        ) : (
          // Active session screen
          <div className="w-full max-w-md flex flex-col items-center gap-8 animate-fade-in">
            {/* AI Speaking Indicator */}
            <PulseIndicator isActive={isAISpeaking} label="Work Coach" />

            {/* User Transcript */}
            {transcript && (
              <div className="w-full bg-sage-50 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-xs text-gray-500 mb-1">You said:</p>
                <p className="text-gray-700 leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* AI Transcript */}
            {aiTranscript && (
              <div className="w-full bg-white/50 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-gray-700 leading-relaxed">{aiTranscript}</p>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status text */}
            <div className="text-center mb-4">
              <p className={`text-sm ${isRecording ? 'text-green-600' : 'text-gray-400'}`}>
                {isRecording
                  ? isAISpeaking ? 'Coach is speaking...' : 'Listening — speak naturally'
                  : 'Microphone muted'}
              </p>
            </div>

            {/* Mic Toggle Button */}
            <MicButton
              isMicOn={isRecording}
              isDisabled={status !== 'connected'}
              isAISpeaking={isAISpeaking}
              onToggle={handleMicToggle}
            />

            <p className="text-xs text-gray-400 text-center mt-4">
              {isRecording ? 'Click mic to mute' : 'Click mic to unmute and speak'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

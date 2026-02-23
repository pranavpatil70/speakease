'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MicButton, PulseIndicator, ConnectionStatusBadge } from '@/components';
import { useRealtimeWebSocket, useAudioRecorder, useAudioPlayer } from '@/hooks';

/**
 * Casual Talk Mode
 * Friendly AI conversation partner for natural speaking practice
 */
export default function CasualTalkPage() {
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
    commitAudio,
  } = useRealtimeWebSocket({
    mode: 'casual',
    onAudioDelta: (delta) => {
      queueAudio(delta);
    },
    onAudioDone: () => {
      // Audio playback complete
    },
    onTranscriptDelta: (delta) => {
      setAITranscript((prev) => prev + delta);
    },
    onTranscriptDone: (text) => {
      setAITranscript(text);
    },
    onUserTranscript: (text) => {
      console.log('User said:', text);
      setTranscript(text);
    },
    onResponseComplete: () => {
      // AI finished responding
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

  // Handle mic press (start recording)
  const handleMicPress = useCallback(async () => {
    if (status !== 'connected' || isAISpeaking) return;
    
    try {
      // Clear previous transcript
      setTranscript('');
      await startRecording();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [status, isAISpeaking, startRecording]);

  // Handle mic release (stop recording and send to AI)
  const handleMicRelease = useCallback(() => {
    if (isRecording) {
      stopRecording();
      commitAudio();
      setAITranscript(''); // Clear AI transcript for new response
    }
  }, [isRecording, stopRecording, commitAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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

        <h1 className="text-lg font-semibold text-gray-700">Casual Talk</h1>

        <ConnectionStatusBadge status={status} />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {!isSessionActive ? (
          // Start screen
          <div className="text-center animate-fade-in">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Ready to Chat?</h2>
              <p className="text-gray-500 max-w-sm">
                Have a friendly conversation with your AI practice partner. 
                No pressure, just speak naturally!
              </p>
            </div>

            <button
              onClick={handleStartSession}
              className="bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold 
                         py-4 px-10 rounded-full shadow-lg hover:shadow-xl 
                         transform hover:scale-105 transition-all duration-300"
            >
              Start Talking
            </button>

            <p className="mt-8 text-sm text-gray-400">
              You can speak in English, Hindi, or Marathi
            </p>
          </div>
        ) : (
          // Active conversation screen
          <div className="w-full max-w-md flex flex-col items-center gap-8 animate-fade-in">
            {/* AI Speaking Indicator */}
            <PulseIndicator isActive={isAISpeaking} label="AI Partner" />

            {/* User Transcript */}
            {transcript && (
              <div className="w-full bg-blue-50 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-xs text-gray-500 mb-1">You said:</p>
                <p className="text-gray-700 leading-relaxed">{transcript}</p>
              </div>
            )}

            {/* AI Transcript */}
            {aiTranscript && (
              <div className="w-full bg-white/50 rounded-2xl p-4 text-center animate-slide-up">
                <p className="text-xs text-gray-500 mb-1">AI:</p>
                <p className="text-gray-700 leading-relaxed">{aiTranscript}</p>
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Recording status */}
            <div className="text-center mb-4">
              <p className={`text-sm ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                {isRecording ? 'Listening...' : isAISpeaking ? 'AI is speaking...' : 'Hold the mic to speak'}
              </p>
            </div>

            {/* Mic Button */}
            <MicButton
              isRecording={isRecording}
              isDisabled={status !== 'connected'}
              isAISpeaking={isAISpeaking}
              onPress={handleMicPress}
              onRelease={handleMicRelease}
            />

            {/* Tip */}
            <p className="text-xs text-gray-400 text-center mt-4">
              Press and hold to speak, release to send
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

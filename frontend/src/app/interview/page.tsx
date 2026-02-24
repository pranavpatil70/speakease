'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MicButton, ConnectionStatusBadge, LoadingOverlay } from '@/components';
import { useRealtimeWebSocket, useAudioRecorder, useAudioPlayer, useWebcam } from '@/hooks';
import { startSession, endSession, updateSession, storeFeedback, getInterviewSetup, type InterviewSetup } from '@/lib/sessionState';

/**
 * Interview Mode
 * Simulated HR interview with camera for body language analysis
 */
export default function InterviewPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [stage, setStage] = useState<'setup' | 'ready' | 'active' | 'ending'>('setup');
  const [transcript, setTranscript] = useState('');
  const [aiTranscript, setAITranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interviewSetup, setInterviewSetup] = useState<InterviewSetup | null>(null);

  // Track when recording started — used to guard against committing < 150ms of audio,
  // which causes "buffer too small" errors on the OpenAI Realtime API side
  const recordingStartRef = useRef<number>(0);

  // Audio player for AI responses
  const { queueAudio, initAudioContext } = useAudioPlayer();

  // Webcam
  const { startCamera, stopCamera, getFrameData, isStreaming } = useWebcam();

  // WebSocket connection
  const {
    status,
    isAISpeaking,
    connect,
    disconnect,
    sendAudio,
    commitAudio,
    endInterview,
  } = useRealtimeWebSocket({
    mode: 'interview',
    interviewSetup: interviewSetup ?? undefined,
    onAudioDelta: (delta) => {
      queueAudio(delta);
    },
    onTranscriptDelta: (delta) => {
      setAITranscript((prev) => prev + delta);
    },
    onTranscriptDone: (text) => {
      setAITranscript(text);
      // Check if interview is ending
      if (text.toLowerCase().includes('interview is now complete') || 
          text.toLowerCase().includes('thank you for your time')) {
        setStage('ending');
      }
    },
    onUserTranscript: (text) => {
      console.log('User said:', text);
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

  // Setup camera and permissions
  const handleSetup = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      await startCamera(videoRef.current);
      setStage('ready');
    } catch (err) {
      console.error('Camera setup failed:', err);
      // Allow continuing without camera
      setStage('ready');
    }
  }, [startCamera]);

  // Start the interview
  const handleStartInterview = useCallback(async () => {
    try {
      initAudioContext();
      startSession('interview');
      connect();
      setStage('active');
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  }, [connect, initAudioContext]);

  // End interview and get feedback
  const handleEndInterview = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    
    // Tell AI to end the interview
    endInterview();
    
    // Wait a moment for AI to respond
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // End session and get frame data
    const session = endSession();
    const frameData = getFrameData();
    
    // Update session with frame data
    if (session) {
      updateSession({
        frameData: {
          frameCount: frameData.frameCount,
          faceDetectedRatio: frameData.frames.filter(f => f.faceDetected).length / Math.max(frameData.frameCount, 1),
          averageFaceX: frameData.frames.reduce((acc, f) => acc + f.faceCenterX, 0) / Math.max(frameData.frameCount, 1),
          averageFaceY: frameData.frames.reduce((acc, f) => acc + f.faceCenterY, 0) / Math.max(frameData.frameCount, 1),
        },
      });
    }
    
    // Calculate duration
    const duration = session ? (session.endTime || Date.now()) - session.startTime : 0;
    
    // Send frame data to backend for analysis
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/analyze-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameData }),
      });
      
      const analysis = await response.json();
      
      // Store feedback with duration
      storeFeedback({ ...analysis, duration });
      
    } catch (err) {
      console.error('Failed to analyze interview:', err);
      // Store default feedback
      storeFeedback({
        scores: {
          eyeContact: 3,
          headStability: 3,
          posture: 3,
          handMovement: 3,
          speakingPace: 3,
          fillerWords: 3,
        },
        confidenceScore: 6,
        improvementTips: [
          'Practice maintaining eye contact with the camera.',
          'Keep your posture upright and confident.',
          'Speak at a steady, measured pace.',
        ],
        summary: 'Good practice session! Review the tips below to improve.',
        duration,
      });
    }
    
    // Cleanup
    stopCamera();
    disconnect();
    
    // Navigate to feedback
    router.push('/feedback');
  }, [isRecording, stopRecording, endInterview, getFrameData, stopCamera, disconnect, router]);

  // Handle mic press
  const handleMicPress = useCallback(async () => {
    if (status !== 'connected' || isAISpeaking) return;

    try {
      recordingStartRef.current = Date.now();
      await startRecording();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [status, isAISpeaking, startRecording]);

  // Handle mic release
  const handleMicRelease = useCallback(() => {
    if (isRecording) {
      stopRecording();

      // OpenAI Realtime API requires at least 100ms of audio in the buffer.
      // Guard against very quick taps (< 150ms) which cause "buffer too small" errors.
      const recordingDuration = Date.now() - recordingStartRef.current;
      if (recordingDuration >= 150) {
        commitAudio();
      }

      setAITranscript('');
    }
  }, [isRecording, stopRecording, commitAudio]);

  // Auto-setup on mount: read interview setup + start camera
  useEffect(() => {
    setInterviewSetup(getInterviewSetup());
    handleSetup();
    return () => {
      stopCamera();
      disconnect();
    };
  }, []);

  // Show loading overlay when analyzing
  if (isAnalyzing) {
    return <LoadingOverlay message="Analyzing your interview..." />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-800/50">
        <button
          onClick={() => {
            stopCamera();
            disconnect();
            router.push('/interview-setup');
          }}
          className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Exit</span>
        </button>

        <h1 className="text-lg font-semibold text-white">Interview Mode</h1>

        <ConnectionStatusBadge status={status} className="text-gray-300" />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Camera preview */}
        <div className="relative flex-1 flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            className="camera-preview max-w-full max-h-full object-cover"
            playsInline
            muted
          />
          
          {/* Camera overlay */}
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>Setting up camera...</p>
              </div>
            </div>
          )}

          {/* AI indicator overlay */}
          {stage === 'active' && isAISpeaking && (
            <div className="absolute top-4 left-4 right-4">
              <div className="bg-black/70 rounded-lg p-3 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-primary-400 rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">Interviewer</span>
                </div>
                {aiTranscript && (
                  <p className="text-gray-200 text-sm leading-relaxed">{aiTranscript}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-800 px-6 py-6">
          {stage === 'setup' && (
            <div className="text-center animate-fade-in">
              <p className="text-gray-400 mb-4">Setting up your camera and microphone...</p>
            </div>
          )}

          {stage === 'ready' && (
            <div className="text-center animate-fade-in">
              <p className="text-gray-300 mb-4">
                Camera is ready. When you start, the interviewer will ask questions.
              </p>
              <button
                onClick={handleStartInterview}
                className="bg-warm-600 hover:bg-warm-700 text-white text-lg font-semibold 
                           py-3 px-8 rounded-full shadow-lg hover:shadow-xl 
                           transform hover:scale-105 transition-all duration-300"
              >
                Begin Interview
              </button>
            </div>
          )}

          {stage === 'active' && (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              {/* Status text */}
              <p className={`text-sm ${isRecording ? 'text-red-400' : 'text-gray-400'}`}>
                {isRecording ? 'Speaking...' : isAISpeaking ? 'Listen to the question...' : 'Hold to answer'}
              </p>

              {/* Controls row */}
              <div className="flex items-center gap-6">
                {/* End interview button */}
                <button
                  onClick={handleEndInterview}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="End Interview"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>

                {/* Mic button */}
                <MicButton
                  isRecording={isRecording}
                  isDisabled={status !== 'connected'}
                  isAISpeaking={isAISpeaking}
                  onPress={handleMicPress}
                  onRelease={handleMicRelease}
                  size="normal"
                />

                {/* Placeholder for symmetry */}
                <div className="w-8" />
              </div>
            </div>
          )}

          {stage === 'ending' && (
            <div className="text-center animate-fade-in">
              <p className="text-gray-300 mb-4">
                Interview complete. Getting your feedback ready...
              </p>
              <button
                onClick={handleEndInterview}
                className="bg-primary-500 hover:bg-primary-600 text-white text-lg font-semibold 
                           py-3 px-8 rounded-full shadow-lg"
              >
                View Feedback
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

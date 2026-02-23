/**
 * WebSocket hook for OpenAI Realtime Speech API communication
 */

import { useRef, useCallback, useEffect, useState } from 'react';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

interface UseRealtimeWebSocketOptions {
  mode: 'casual' | 'office' | 'interview';
  onAudioDelta?: (delta: string) => void;
  onAudioDone?: () => void;
  onTranscriptDelta?: (delta: string) => void;
  onTranscriptDone?: (transcript: string) => void;
  onUserTranscript?: (transcript: string) => void;
  onUserSpeakingStarted?: () => void;
  onUserSpeakingStopped?: () => void;
  onResponseComplete?: () => void;
  onError?: (message: string) => void;
}

export function useRealtimeWebSocket(options: UseRealtimeWebSocketOptions) {
  const {
    mode,
    onAudioDelta,
    onAudioDone,
    onTranscriptDelta,
    onTranscriptDone,
    onUserSpeakingStarted,
    onUserSpeakingStopped,
    onResponseComplete,
    onError,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // Store callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    const ws = new WebSocket(`${wsUrl}?mode=${mode}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'connection.ready':
            console.log('Connection ready, starting conversation');
            // Auto-start conversation
            ws.send(JSON.stringify({ type: 'conversation.start' }));
            break;

          case 'audio.delta':
            setIsAISpeaking(true);
            callbacksRef.current.onAudioDelta?.(message.delta as string);
            break;

          case 'audio.done':
            setIsAISpeaking(false);
            callbacksRef.current.onAudioDone?.();
            break;

          case 'transcript.delta':
            callbacksRef.current.onTranscriptDelta?.(message.delta as string);
            break;

          case 'transcript.done':
            callbacksRef.current.onTranscriptDone?.(message.transcript as string);
            break;

          case 'user.transcript':
            console.log('User transcript received:', message.transcript);
            callbacksRef.current.onUserTranscript?.(message.transcript as string);
            break;

          case 'user.speaking.started':
            callbacksRef.current.onUserSpeakingStarted?.();
            break;

          case 'user.speaking.stopped':
            callbacksRef.current.onUserSpeakingStopped?.();
            break;

          case 'response.complete':
            setIsAISpeaking(false);
            callbacksRef.current.onResponseComplete?.();
            break;

          case 'error':
            setStatus('error');
            callbacksRef.current.onError?.(message.message as string);
            break;
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('error');
      callbacksRef.current.onError?.('Connection error. Please try again.');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setStatus('disconnected');
      setIsAISpeaking(false);
    };

    wsRef.current = ws;
  }, [mode]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
    setIsAISpeaking(false);
  }, []);

  const sendAudio = useCallback((audioBase64: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'audio.append',
        audio: audioBase64,
      }));
    }
  }, []);

  const commitAudio = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'audio.commit' }));
    }
  }, []);

  const endInterview = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interview.end' }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    status,
    isAISpeaking,
    connect,
    disconnect,
    sendAudio,
    commitAudio,
    endInterview,
  };
}

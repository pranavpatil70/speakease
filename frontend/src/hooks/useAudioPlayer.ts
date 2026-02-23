/**
 * Audio player hook for playing AI audio responses
 * Handles PCM16 base64 audio from OpenAI Realtime API
 */

import { useRef, useCallback, useState, useEffect } from 'react';

export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Initialize audio context (must be called after user interaction)
   */
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  }, []);

  /**
   * Convert base64 PCM16 to Float32Array
   */
  const base64ToFloat32 = useCallback((base64: string): Float32Array => {
    // Decode base64 to binary string
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Convert to Int16Array
    const int16 = new Int16Array(bytes.buffer);

    // Convert to Float32Array
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    return float32;
  }, []);

  /**
   * Play audio buffer directly
   */
  const playBuffer = useCallback(async (audioData: Float32Array) => {
    const ctx = initAudioContext();
    
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Create audio buffer
    const buffer = ctx.createBuffer(1, audioData.length, 24000);
    buffer.getChannelData(0).set(audioData);

    // Create source and play
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();

    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
    });
  }, [initAudioContext]);

  /**
   * Process queued audio chunks
   */
  const processQueue = useCallback(async () => {
    if (isPlayingRef.current) return;
    
    isPlayingRef.current = true;
    setIsPlaying(true);

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (chunk) {
        await playBuffer(chunk);
      }
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [playBuffer]);

  /**
   * Queue audio chunk for playback
   */
  const queueAudio = useCallback((base64Audio: string) => {
    const floatData = base64ToFloat32(base64Audio);
    audioQueueRef.current.push(floatData);
    
    // Start processing if not already
    if (!isPlayingRef.current) {
      processQueue();
    }
  }, [base64ToFloat32, processQueue]);

  /**
   * Clear audio queue and stop playback
   */
  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
  }, []);

  /**
   * Stop playback and clean up
   */
  const stop = useCallback(() => {
    clearQueue();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [clearQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isPlaying,
    queueAudio,
    clearQueue,
    stop,
    initAudioContext,
  };
}

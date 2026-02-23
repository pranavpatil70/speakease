/**
 * Audio recorder hook for capturing microphone input
 * Converts audio to PCM16 format required by OpenAI Realtime API
 */

import { useRef, useCallback, useState } from 'react';

interface UseAudioRecorderOptions {
  onAudioData?: (base64Audio: string) => void;
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const { onAudioData } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const onAudioDataRef = useRef(onAudioData);
  onAudioDataRef.current = onAudioData;

  /**
   * Convert Float32Array audio samples to PCM16 base64
   */
  const floatTo16BitPCM = useCallback((float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }, []);

  /**
   * Convert Int16Array to base64 string
   */
  const int16ToBase64 = useCallback((int16Array: Int16Array): string => {
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  /**
   * Downsample audio from source sample rate to 24kHz (required by OpenAI)
   */
  const downsample = useCallback((
    buffer: Float32Array,
    inputSampleRate: number,
    outputSampleRate: number = 24000
  ): Float32Array => {
    if (inputSampleRate === outputSampleRate) {
      return buffer;
    }

    const ratio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      result[i] = buffer[srcIndex];
    }

    return result;
  }, []);

  /**
   * Start recording audio from microphone
   */
  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Create audio context - let browser use default sample rate
      // We'll downsample to 24kHz as required by OpenAI
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      console.log('Audio context sample rate:', audioContext.sampleRate);

      // Create source from stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create processor for audio data
      // Using ScriptProcessorNode (deprecated but widely supported)
      // In production, consider using AudioWorklet
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Downsample if needed
        const downsampled = downsample(inputBuffer, audioContext.sampleRate, 24000);
        
        // Convert to PCM16
        const pcm16 = floatTo16BitPCM(downsampled);
        
        // Convert to base64
        const base64 = int16ToBase64(pcm16);
        
        // Send to callback
        onAudioDataRef.current?.(base64);
      };

      // Connect the audio graph
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setHasPermission(false);
      throw error;
    }
  }, [downsample, floatTo16BitPCM, int16ToBase64]);

  /**
   * Stop recording and clean up resources
   */
  const stopRecording = useCallback(() => {
    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
  }, []);

  /**
   * Check if microphone permission is available
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const hasPerms = result.state === 'granted';
      setHasPermission(hasPerms);
      return hasPerms;
    } catch {
      // Permissions API not supported, try direct getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setHasPermission(true);
        return true;
      } catch {
        setHasPermission(false);
        return false;
      }
    }
  }, []);

  return {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
    checkPermission,
  };
}

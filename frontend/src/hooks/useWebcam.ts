/**
 * Camera hook for WebRTC video capture in interview mode
 * Captures frames for body language analysis without storing video
 */

import { useRef, useCallback, useState, useEffect } from 'react';

interface FrameData {
  timestamp: number;
  faceDetected: boolean;
  faceCenterX: number;
  faceCenterY: number;
}

interface UseWebcamOptions {
  onFrameCapture?: (frameData: FrameData) => void;
  captureInterval?: number; // ms between frame captures
}

export function useWebcam(options: UseWebcamOptions = {}) {
  const { captureInterval = 1000 } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameDataRef = useRef<FrameData[]>([]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start webcam stream
   */
  const startCamera = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // Audio handled separately
      });

      videoElement.srcObject = stream;

      // play() can throw AbortError if srcObject changes before it resolves
      // This is a benign race condition in some browsers — the video will still render
      try {
        await videoElement.play();
      } catch (playErr) {
        if ((playErr as Error).name !== 'AbortError') {
          throw playErr;
        }
        // AbortError is safe to ignore — the stream is attached and will play
      }

      videoRef.current = videoElement;
      streamRef.current = stream;
      setIsStreaming(true);
      setHasPermission(true);
      setError(null);

      // Create canvas for frame capture
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;

      // Start periodic frame capture for analysis
      frameDataRef.current = [];
      captureIntervalRef.current = setInterval(() => {
        captureFrame();
      }, captureInterval);

    } catch (err) {
      console.error('Error starting camera:', err);
      setHasPermission(false);
      setError('Unable to access camera. Please check permissions.');
      throw err;
    }
  }, [captureInterval]);

  /**
   * Stop webcam stream and cleanup
   */
  const stopCamera = useCallback(() => {
    // Stop capture interval
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    // Stop all video tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    setIsStreaming(false);
  }, []);

  /**
   * Capture a single frame for analysis
   * This performs basic analysis without storing the image
   */
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) return null;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for basic analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple face detection heuristic based on skin tone detection
    // In production, use TensorFlow.js Face Detection API
    const analysis = analyzeFrame(imageData);

    const frameData: FrameData = {
      timestamp: Date.now(),
      faceDetected: analysis.faceDetected,
      faceCenterX: analysis.centerX,
      faceCenterY: analysis.centerY,
    };

    frameDataRef.current.push(frameData);

    return frameData;
  }, []);

  /**
   * Basic frame analysis for face detection
   * Uses simple skin tone detection as a placeholder
   */
  const analyzeFrame = (imageData: ImageData): { faceDetected: boolean; centerX: number; centerY: number } => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    let skinPixelCount = 0;
    let totalX = 0;
    let totalY = 0;

    // Sample every 4th pixel for performance
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple skin tone detection heuristic
        // Works reasonably well across skin tones
        if (isSkinTone(r, g, b)) {
          skinPixelCount++;
          totalX += x;
          totalY += y;
        }
      }
    }

    const faceDetected = skinPixelCount > 500; // Threshold for face presence
    const centerX = skinPixelCount > 0 ? totalX / skinPixelCount / width : 0.5;
    const centerY = skinPixelCount > 0 ? totalY / skinPixelCount / height : 0.5;

    return { faceDetected, centerX, centerY };
  };

  /**
   * Check if RGB values represent a skin tone
   */
  const isSkinTone = (r: number, g: number, b: number): boolean => {
    // Multiple skin tone detection rules for inclusivity
    const rule1 = r > 95 && g > 40 && b > 20 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
      Math.abs(r - g) > 15 && r > g && r > b;

    const rule2 = r > 60 && g > 40 && b > 30 &&
      r > b && g > b &&
      Math.abs(r - g) < 100;

    return rule1 || rule2;
  };

  /**
   * Get collected frame data for analysis
   */
  const getFrameData = useCallback(() => {
    return {
      frameCount: frameDataRef.current.length,
      frames: frameDataRef.current,
    };
  }, []);

  /**
   * Check camera permission status
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const hasPerms = result.state === 'granted';
      setHasPermission(hasPerms);
      return hasPerms;
    } catch {
      // Permissions API not fully supported
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isStreaming,
    hasPermission,
    error,
    startCamera,
    stopCamera,
    getFrameData,
    checkPermission,
  };
}

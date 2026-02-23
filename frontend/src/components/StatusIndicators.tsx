'use client';

import type { ConnectionStatus } from '@/hooks/useRealtimeWebSocket';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  className?: string;
}

/**
 * Visual indicator for WebSocket connection status
 */
export function ConnectionStatusBadge({ status, className = '' }: ConnectionStatusBadgeProps) {
  const statusConfig = {
    disconnected: {
      color: 'bg-gray-400',
      text: 'Disconnected',
      pulse: false,
    },
    connecting: {
      color: 'bg-yellow-400',
      text: 'Connecting...',
      pulse: true,
    },
    connected: {
      color: 'bg-green-400',
      text: 'Connected',
      pulse: false,
    },
    error: {
      color: 'bg-red-400',
      text: 'Connection Error',
      pulse: false,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 rounded-full ${config.color} animate-ping`} />
        )}
      </div>
      <span className="text-sm text-gray-500">{config.text}</span>
    </div>
  );
}

/**
 * Loading dots animation
 */
export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-gray-400 loading-dot" />
      <div className="w-2 h-2 rounded-full bg-gray-400 loading-dot" />
      <div className="w-2 h-2 rounded-full bg-gray-400 loading-dot" />
    </div>
  );
}

/**
 * Full-screen loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <LoadingDots />
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
}

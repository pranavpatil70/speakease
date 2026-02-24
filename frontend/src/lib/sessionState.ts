/**
 * Session-based state management
 * Stores interview data temporarily for feedback generation
 * No data is persisted beyond the browser session
 */

export interface InterviewSession {
  startTime: number;
  endTime?: number;
  mode: 'casual' | 'office' | 'interview';
  frameData?: {
    frameCount: number;
    faceDetectedRatio: number;
    averageFaceX: number;
    averageFaceY: number;
  };
  audioMetadata?: {
    totalSpeakingTime: number;
    pauseCount: number;
    averagePauseDuration: number;
  };
}

// Session storage key
const SESSION_KEY = 'speakease_session';

/**
 * Start a new session
 */
export function startSession(mode: 'casual' | 'office' | 'interview'): InterviewSession {
  const session: InterviewSession = {
    startTime: Date.now(),
    mode,
  };
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  
  return session;
}

/**
 * Update current session with new data
 */
export function updateSession(updates: Partial<InterviewSession>): InterviewSession | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  const session: InterviewSession = { ...JSON.parse(stored), ...updates };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  return session;
}

/**
 * End the current session
 */
export function endSession(): InterviewSession | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  const session: InterviewSession = JSON.parse(stored);
  session.endTime = Date.now();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  
  return session;
}

/**
 * Get current session
 */
export function getSession(): InterviewSession | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  return JSON.parse(stored);
}

/**
 * Clear session data
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Store feedback data temporarily
 */
const FEEDBACK_KEY = 'speakease_feedback';

export interface FeedbackData {
  scores: {
    eyeContact: number;
    headStability: number;
    posture: number;
    handMovement: number;
    speakingPace: number;
    fillerWords: number;
  };
  confidenceScore: number;
  improvementTips: string[];
  summary: string;
  duration: number;
}

export function storeFeedback(feedback: FeedbackData): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedback));
  }
}

export function getFeedback(): FeedbackData | null {
  if (typeof window === 'undefined') return null;
  
  const stored = sessionStorage.getItem(FEEDBACK_KEY);
  if (!stored) return null;
  
  return JSON.parse(stored);
}

export function clearFeedback(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(FEEDBACK_KEY);
  }
}

// ─── Interview Setup ───────────────────────────────────────────────────────────
// Stores field/level/questions chosen on the setup page before an interview session

export type ExperienceLevel = 'fresher' | 'junior' | 'mid' | 'senior';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionCount = 5 | 8 | 12;

export interface InterviewSetup {
  field: string;
  experience: ExperienceLevel;
  difficulty: DifficultyLevel;
  questionCount: QuestionCount;
  questions: string[];
  generatedAt: number;
}

const SETUP_KEY = 'speakease_interview_setup';

export function storeInterviewSetup(setup: InterviewSetup): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SETUP_KEY, JSON.stringify(setup));
  }
}

export function getInterviewSetup(): InterviewSetup | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(SETUP_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearInterviewSetup(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SETUP_KEY);
  }
}

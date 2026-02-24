/**
 * Gamification & Progress Tracking
 * Uses localStorage for persistence across browser sessions
 */

export interface SessionRecord {
  date: string;          // ISO string (new Date().toISOString())
  field: string;
  experience: string;
  difficulty: string;
  confidenceScore: number;
  duration: number;      // milliseconds
  questionCount: number;
}

export interface FieldStats {
  totalSessions: number;
  avgConfidence: number;
  bestConfidence: number;
}

export interface Streak {
  current: number;
  lastPracticeDate: string; // YYYY-MM-DD
  longest: number;
}

export interface UserProgress {
  streak: Streak;
  sessions: SessionRecord[]; // last 100 sessions
  fieldStats: Record<string, FieldStats>;
  totalSessions: number;
  monthlyGoal: number;       // default 20
}

const PROGRESS_KEY = 'speakease_progress';

function defaultProgress(): UserProgress {
  return {
    streak: { current: 0, lastPracticeDate: '', longest: 0 },
    sessions: [],
    fieldStats: {},
    totalSessions: 0,
    monthlyGoal: 20,
  };
}

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress();
    return JSON.parse(stored) as UserProgress;
  } catch {
    return defaultProgress();
  }
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function updateStreak(progress: UserProgress): UserProgress {
  const today = todayDate();
  const last = progress.streak.lastPracticeDate;

  if (last === today) {
    // Already tracked today — no change
    return progress;
  }

  let newCurrent = 1;
  if (last) {
    const lastMs = new Date(last).getTime();
    const todayMs = new Date(today).getTime();
    const diffDays = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      newCurrent = progress.streak.current + 1;
    }
    // diffDays > 1: streak broken, reset to 1
  }

  const newLongest = Math.max(newCurrent, progress.streak.longest);
  return {
    ...progress,
    streak: { current: newCurrent, lastPracticeDate: today, longest: newLongest },
  };
}

export function saveSession(record: SessionRecord): { streakUpdated: boolean; newStreakCount: number } {
  const progress = getProgress();
  const today = todayDate();
  const alreadyPracticedToday = progress.streak.lastPracticeDate === today;

  const withStreak = updateStreak(progress);

  // Update field stats
  const existing: FieldStats = withStreak.fieldStats[record.field] ?? {
    totalSessions: 0,
    avgConfidence: 0,
    bestConfidence: 0,
  };
  const newTotal = existing.totalSessions + 1;
  const newAvg = (existing.avgConfidence * existing.totalSessions + record.confidenceScore) / newTotal;
  const newBest = Math.max(existing.bestConfidence, record.confidenceScore);

  const updated: UserProgress = {
    ...withStreak,
    fieldStats: {
      ...withStreak.fieldStats,
      [record.field]: {
        totalSessions: newTotal,
        avgConfidence: Math.round(newAvg * 10) / 10,
        bestConfidence: newBest,
      },
    },
    sessions: [...withStreak.sessions, record].slice(-100),
    totalSessions: withStreak.totalSessions + 1,
  };

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private browsing strict mode, etc.) — silently ignore
  }

  return {
    streakUpdated: !alreadyPracticedToday,
    newStreakCount: updated.streak.current,
  };
}

export function getMonthlyProgress(progress?: UserProgress): number {
  const p = progress ?? getProgress();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return p.sessions.filter((s) => s.date.startsWith(thisMonth)).length;
}

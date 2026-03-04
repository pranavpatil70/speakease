/**
 * Gamification & Progress Tracking
 * Uses localStorage for persistence across browser sessions
 */

export type SessionType = 'interview' | 'daily';

export interface SessionRecord {
  date: string;          // ISO string (new Date().toISOString())
  field: string;
  experience: string;
  difficulty: string;
  confidenceScore: number;
  duration: number;      // milliseconds
  questionCount: number;
  sessionType: SessionType;
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
  xp: number;
  badges: string[];          // badge IDs earned
  dailyChallengesCompleted: number;
}

// ────────── XP & Level constants ──────────

const XP_REWARDS: Record<string, number> = {
  daily:         20,
  interview_5q:  25,
  interview_8q:  40,
  interview_12q: 60,
};

export const LEVEL_THRESHOLDS = [
  { label: 'Beginner',  min: 0 },
  { label: 'Fluent',    min: 100 },
  { label: 'Confident', min: 300 },
  { label: 'Expert',    min: 700 },
] as const;

export function computeLevel(xp: number): string {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].min) return LEVEL_THRESHOLDS[i].label;
  }
  return 'Beginner';
}

export function getNextLevelInfo(xp: number): { label: string; xpNeeded: number; pct: number } {
  for (let i = 0; i < LEVEL_THRESHOLDS.length - 1; i++) {
    const current = LEVEL_THRESHOLDS[i];
    const next = LEVEL_THRESHOLDS[i + 1];
    if (xp < next.min) {
      const within = xp - current.min;
      const span = next.min - current.min;
      return {
        label: next.label,
        xpNeeded: next.min - xp,
        pct: Math.round((within / span) * 100),
      };
    }
  }
  // Already at max level
  return { label: 'Expert', xpNeeded: 0, pct: 100 };
}

function computeXP(record: SessionRecord, streakCount: number): number {
  let base = 0;
  if (record.sessionType === 'daily') {
    base = XP_REWARDS.daily;
  } else if (record.questionCount <= 5) {
    base = XP_REWARDS.interview_5q;
  } else if (record.questionCount <= 8) {
    base = XP_REWARDS.interview_8q;
  } else {
    base = XP_REWARDS.interview_12q;
  }
  const streakBonus = Math.min(streakCount * 2, 20);
  return base + streakBonus;
}

// ────────── Badge definitions ──────────

type BadgeCheck = (p: UserProgress) => boolean;

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  check: BadgeCheck;
}

function interviewCount(p: UserProgress): number {
  return p.sessions.filter((s) => s.sessionType === 'interview').length;
}

export const BADGES: BadgeDef[] = [
  {
    id: 'first_step',
    label: 'First Step',
    description: 'Complete your first session',
    check: (p) => p.totalSessions >= 1,
  },
  {
    id: 'streak_3',
    label: 'Consistent',
    description: '3-day practice streak',
    check: (p) => p.streak.longest >= 3,
  },
  {
    id: 'streak_7',
    label: 'Week Warrior',
    description: '7-day practice streak',
    check: (p) => p.streak.longest >= 7,
  },
  {
    id: 'interviews_5',
    label: 'Interview Starter',
    description: 'Complete 5 interviews',
    check: (p) => interviewCount(p) >= 5,
  },
  {
    id: 'interviews_20',
    label: 'Interview Pro',
    description: 'Complete 20 interviews',
    check: (p) => interviewCount(p) >= 20,
  },
  {
    id: 'daily_10',
    label: 'Daily Devotee',
    description: 'Complete 10 daily challenges',
    check: (p) => p.dailyChallengesCompleted >= 10,
  },
  {
    id: 'high_confidence',
    label: 'Confidence Peak',
    description: 'Score 8 or higher in any session',
    check: (p) => p.sessions.some((s) => s.confidenceScore >= 8),
  },
];

function checkNewBadges(updated: UserProgress, previousBadges: string[]): string[] {
  return BADGES
    .filter((b) => !previousBadges.includes(b.id) && b.check(updated))
    .map((b) => b.id);
}

// ────────── Storage helpers ──────────

const PROGRESS_KEY = 'speakease_progress';

function defaultProgress(): UserProgress {
  return {
    streak: { current: 0, lastPracticeDate: '', longest: 0 },
    sessions: [],
    fieldStats: {},
    totalSessions: 0,
    monthlyGoal: 20,
    xp: 0,
    badges: [],
    dailyChallengesCompleted: 0,
  };
}

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress();
    const parsed = JSON.parse(stored) as Partial<UserProgress>;
    // Merge with defaults so old data missing new fields stays valid
    const def = defaultProgress();
    return {
      streak: parsed.streak ?? def.streak,
      sessions: (parsed.sessions ?? def.sessions).map((s) => ({
        ...s,
        sessionType: (s as SessionRecord).sessionType ?? 'interview',
      })),
      fieldStats: parsed.fieldStats ?? def.fieldStats,
      totalSessions: parsed.totalSessions ?? def.totalSessions,
      monthlyGoal: parsed.monthlyGoal ?? def.monthlyGoal,
      xp: parsed.xp ?? def.xp,
      badges: parsed.badges ?? def.badges,
      dailyChallengesCompleted: parsed.dailyChallengesCompleted ?? def.dailyChallengesCompleted,
    };
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
    return progress; // Already tracked today
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

export function saveSession(record: SessionRecord): {
  streakUpdated: boolean;
  newStreakCount: number;
  xpEarned: number;
  newBadges: string[];
} {
  const progress = getProgress();
  const today = todayDate();
  const alreadyPracticedToday = progress.streak.lastPracticeDate === today;
  const previousBadges = [...progress.badges];

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

  const xpEarned = computeXP(record, withStreak.streak.current);
  const newDailyCount = record.sessionType === 'daily'
    ? withStreak.dailyChallengesCompleted + 1
    : withStreak.dailyChallengesCompleted;

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
    xp: withStreak.xp + xpEarned,
    dailyChallengesCompleted: newDailyCount,
    badges: previousBadges, // augmented below
  };

  const newBadges = checkNewBadges(updated, previousBadges);
  updated.badges = [...previousBadges, ...newBadges];

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable (private browsing strict mode) — silently ignore
  }

  return {
    streakUpdated: !alreadyPracticedToday,
    newStreakCount: updated.streak.current,
    xpEarned,
    newBadges,
  };
}

export function getMonthlyProgress(progress?: UserProgress): number {
  const p = progress ?? getProgress();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return p.sessions.filter((s) => s.date.startsWith(thisMonth)).length;
}

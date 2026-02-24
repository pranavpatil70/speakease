'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  storeInterviewSetup,
  type ExperienceLevel,
  type DifficultyLevel,
  type QuestionCount,
} from '@/lib/sessionState';

const FIELD_PRESETS = [
  'Software Engineering',
  'Data Science',
  'Marketing',
  'Finance',
  'Product Management',
  'HR/Recruitment',
  'Sales',
  'UX/UI Design',
  'Healthcare',
  'Legal',
  'Operations',
  'Consulting',
  'Other',
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; sub: string }[] = [
  { value: 'fresher', label: 'Fresher', sub: '0 experience' },
  { value: 'junior', label: 'Junior', sub: '1–3 years' },
  { value: 'mid', label: 'Mid-level', sub: '3–7 years' },
  { value: 'senior', label: 'Senior', sub: '7+ years' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; color: string }[] = [
  { value: 'easy', label: 'Easy', color: 'sage' },
  { value: 'medium', label: 'Medium', color: 'primary' },
  { value: 'hard', label: 'Hard', color: 'warm' },
];

const LENGTH_OPTIONS: { value: QuestionCount; label: string; sub: string }[] = [
  { value: 5, label: 'Quick', sub: '5 questions' },
  { value: 8, label: 'Standard', sub: '8 questions' },
  { value: 12, label: 'Full', sub: '12 questions' },
];

export default function InterviewSetupPage() {
  const router = useRouter();

  const [field, setField] = useState('Software Engineering');
  const [customField, setCustomField] = useState('');
  const [experience, setExperience] = useState<ExperienceLevel>('fresher');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [questionCount, setQuestionCount] = useState<QuestionCount>(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    const effectiveField = field === 'Other' ? customField.trim() : field;

    if (!effectiveField) {
      setError('Please enter a field name.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: effectiveField,
          experience,
          difficulty,
          count: questionCount,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error ${response.status}`);
      }

      const { questions } = await response.json();

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions returned. Please try again.');
      }

      storeInterviewSetup({
        field: effectiveField,
        experience,
        difficulty,
        questionCount,
        questions,
        generatedAt: Date.now(),
      });

      router.push('/interview');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not generate questions. Please check your connection and try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-gradient-to-b from-warm-50 to-white">
      {/* Back button */}
      <button
        onClick={() => router.push('/mode-select')}
        className="self-start mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Interview Setup</h1>
        <p className="text-gray-500">Personalise your practice session</p>
      </div>

      <div className="max-w-md mx-auto w-full flex flex-col gap-5">

        {/* Field / Domain */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Field / Domain</label>
          <select
            value={field}
            onChange={(e) => { setField(e.target.value); setCustomField(''); }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-400 transition-colors"
          >
            {FIELD_PRESETS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {field === 'Other' && (
            <input
              type="text"
              value={customField}
              onChange={(e) => setCustomField(e.target.value)}
              placeholder="Enter your field (e.g. Cybersecurity)"
              className="mt-3 w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-warm-300 focus:border-warm-400 transition-colors"
              autoFocus
            />
          )}
        </div>

        {/* Experience Level */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Experience Level</label>
          <div className="grid grid-cols-2 gap-2">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExperience(opt.value)}
                className={`py-3 px-4 rounded-xl text-left transition-all duration-200 border ${
                  experience === opt.value
                    ? 'bg-warm-600 text-white border-warm-600 shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-warm-300 hover:bg-warm-50'
                }`}
              >
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className={`text-xs mt-0.5 ${experience === opt.value ? 'text-warm-100' : 'text-gray-400'}`}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => {
              const isSelected = difficulty === opt.value;
              const colors: Record<string, string> = {
                sage: isSelected ? 'bg-sage-600 text-white border-sage-600 shadow-md' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-sage-300 hover:bg-sage-50',
                primary: isSelected ? 'bg-primary-500 text-white border-primary-500 shadow-md' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50',
                warm: isSelected ? 'bg-warm-700 text-white border-warm-700 shadow-md' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-warm-400 hover:bg-warm-50',
              };
              return (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`py-3 rounded-xl text-center font-semibold text-sm transition-all duration-200 border ${colors[opt.color]}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session Length */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Session Length</label>
          <div className="grid grid-cols-3 gap-2">
            {LENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setQuestionCount(opt.value)}
                className={`py-3 px-2 rounded-xl text-center transition-all duration-200 border ${
                  questionCount === opt.value
                    ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                }`}
              >
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className={`text-xs mt-0.5 ${questionCount === opt.value ? 'text-primary-100' : 'text-gray-400'}`}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm text-center px-2 animate-fade-in">{error}</p>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isGenerating}
          className="w-full bg-warm-600 hover:bg-warm-700 disabled:bg-warm-400 text-white text-lg font-semibold
                     py-4 rounded-full shadow-lg hover:shadow-xl
                     transform hover:scale-102 transition-all duration-300
                     flex items-center justify-center gap-3
                     animate-slide-up"
          style={{ animationDelay: '0.25s' }}
        >
          {isGenerating && (
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isGenerating ? 'Generating questions...' : 'Start Interview'}
        </button>

        {/* Info */}
        <p className="text-center text-xs text-gray-400 pb-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Questions are generated by AI for your specific field and level
        </p>

      </div>
    </div>
  );
}

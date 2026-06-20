'use client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FortuneTrendCardProps {
  currentGrade: string;
  currentScore?: number;
}

const GRADE_SCORES: Record<string, number> = {
  'S': 95, 'A+': 87, 'A': 80, 'B+': 72, 'B': 65, 'C+': 57, 'C': 50, 'D': 35, 'F': 20,
};

export default function FortuneTrendCard({ currentGrade, currentScore }: FortuneTrendCardProps) {
  // Read recent forecast history from localStorage
  let recentScores: { date: string; grade: string; score: number }[] = [];
  try {
    const history = JSON.parse(localStorage.getItem('forecast-grade-history') || '[]');
    recentScores = history.slice(-7); // Last 7 entries
  } catch { /* ignore parse errors */ }

  const score = currentScore || GRADE_SCORES[currentGrade] || 50;
  const prevScore = recentScores.length > 0 ? recentScores[recentScores.length - 1].score : score;
  const diff = score - prevScore;
  const trend = diff > 5 ? 'up' : diff < -5 ? 'down' : 'stable';

  const avgScore = recentScores.length > 0
    ? Math.round(recentScores.reduce((s, r) => s + r.score, 0) / recentScores.length)
    : score;

  // Save current to history
  if (typeof window !== 'undefined') {
    const today = new Date().toISOString().split('T')[0];
    try {
      const history = JSON.parse(localStorage.getItem('forecast-grade-history') || '[]');
      if (!history.find((h: { date: string }) => h.date === today)) {
        history.push({ date: today, grade: currentGrade, score });
        // Keep last 30 entries
        if (history.length > 30) history.splice(0, history.length - 30);
        localStorage.setItem('forecast-grade-history', JSON.stringify(history));
      }
    } catch { /* ignore parse errors */ }
  }

  if (recentScores.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/60 flex items-center gap-4">
      <div className="flex items-center gap-2">
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-400" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-rose-400" />}
        {trend === 'stable' && <Minus className="w-5 h-5 text-zinc-400" />}
        <span className={`text-sm font-semibold ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-400'
        }`}>
          {trend === 'up' ? `+${diff}점 상승` : trend === 'down' ? `${diff}점 하락` : '안정'}
        </span>
      </div>
      <div className="text-xs text-zinc-500">
        최근 {recentScores.length}일 평균: {avgScore}점
      </div>
    </div>
  );
}

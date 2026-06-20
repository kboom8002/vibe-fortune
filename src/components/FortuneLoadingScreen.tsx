'use client';
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface FortuneLoadingScreenProps {
  stage?: 'chart' | 'analysis' | 'forecast' | 'complete';
  dayMasterElement?: string;
}

const STAGES = [
  { key: 'chart', label: '사주 차트 계산 중...', emoji: '✨', progress: 25 },
  { key: 'analysis', label: '오행 분석 중...', emoji: '🌊', progress: 50 },
  { key: 'forecast', label: '운세 해석 생성 중...', emoji: '🔮', progress: 75 },
  { key: 'complete', label: '완료!', emoji: '✅', progress: 100 },
];

const ELEMENT_COLORS: Record<string, string> = {
  wood: 'from-emerald-600 to-emerald-400',
  fire: 'from-rose-600 to-rose-400',
  earth: 'from-amber-600 to-amber-400',
  metal: 'from-zinc-400 to-zinc-200',
  water: 'from-blue-600 to-blue-400',
};

export default function FortuneLoadingScreen({ stage = 'chart', dayMasterElement }: FortuneLoadingScreenProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const idx = STAGES.findIndex(s => s.key === stage);
    if (idx >= 0) setCurrentStageIdx(idx);
  }, [stage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const currentStage = STAGES[currentStageIdx];
  const gradientClass = dayMasterElement ? (ELEMENT_COLORS[dayMasterElement.toLowerCase()] || 'from-indigo-600 to-purple-400') : 'from-indigo-600 to-purple-400';

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8 py-12">
      {/* Animated orb */}
      <div className="relative">
        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradientClass} opacity-20 blur-xl animate-pulse absolute -inset-4`} />
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center relative`}>
          <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Stage label */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-zinc-200">
          {currentStage.emoji} {currentStage.label}{dots}
        </p>
        <p className="text-xs text-zinc-500">당신의 사주 데이터를 분석하고 있습니다</p>
      </div>

      {/* Progress bar */}
      <div className="w-64 space-y-2">
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-700 ease-out`}
            style={{ width: `${currentStage.progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600">
          {STAGES.map((s, i) => (
            <span key={i} className={i <= currentStageIdx ? 'text-zinc-400' : ''}>
              {s.emoji}
            </span>
          ))}
        </div>
      </div>

      {/* Skeleton cards preview */}
      <div className="w-full max-w-md space-y-3 opacity-30">
        <div className="h-6 bg-zinc-800/50 rounded-xl animate-pulse" />
        <div className="h-4 bg-zinc-800/50 rounded-xl animate-pulse w-3/4" />
        <div className="h-4 bg-zinc-800/50 rounded-xl animate-pulse w-1/2" />
      </div>
    </div>
  );
}

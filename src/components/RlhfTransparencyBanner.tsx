'use client';
import { useState, useEffect } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';

export default function RlhfTransparencyBanner() {
  const [bias, setBias] = useState<any>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('rlhf-bias') || localStorage.getItem('rlhfBias');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Object.keys(parsed).length > 0) setBias(parsed);
      }
    } catch {}
  }, []);

  if (!bias || !visible) return null;

  // Generate human-readable summary
  const summaryParts: string[] = [];
  if (bias.domainWeights) {
    for (const [domain, weight] of Object.entries(bias.domainWeights)) {
      if (typeof weight === 'number' && weight > 0) {
        const label = DOMAIN_LABELS[domain] || domain;
        summaryParts.push(`${label} 영역 강조 (+${weight})`);
      }
    }
  }
  if (bias.tonePreference) summaryParts.push(`톤: ${bias.tonePreference}`);
  if (bias.detailLevel) summaryParts.push(`상세도: ${bias.detailLevel}`);
  if (summaryParts.length === 0) return null;

  const handleReset = () => {
    localStorage.removeItem('rlhf-bias');
    localStorage.removeItem('rlhfBias');
    setBias(null);
  };

  return (
    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-violet-950/30 to-indigo-950/30 border border-violet-800/30 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">이전 피드백 반영</span>
        </div>
        <button onClick={handleReset} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors" title="피드백 초기화">
          <RotateCcw className="w-3 h-3" />
          초기화
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
        {summaryParts.join(' · ')}
      </p>
    </div>
  );
}

const DOMAIN_LABELS: Record<string, string> = {
  business_finance: '사업·재정',
  relationship_love: '관계·애정',
  health_recovery: '건강·회복',
  learning_writing_research: '학습·연구',
  reputation_branding: '명예·브랜딩',
  risk_legal_safety: '리스크·안전',
};

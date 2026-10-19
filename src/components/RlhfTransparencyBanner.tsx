'use client';
import { useState, useEffect } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';

export function RlhfTransparencyBanner() {
  const [bias, setBias] = useState<any>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem('local-rlhf-bias') ||
        localStorage.getItem('rlhf-bias') ||
        localStorage.getItem('rlhfBias');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Object.keys(parsed).length > 0) setBias(parsed);
      }
    } catch {}
  }, []);

  if (!bias || !visible) return null;

  // Generate human-readable summary supporting both snake_case (/api/forecast/feedback) and camelCase
  const summaryParts: string[] = [];

  // snake_case fields from /api/forecast/feedback
  if (typeof bias.intensity_offset === 'number' && bias.intensity_offset !== 0) {
    const sign = bias.intensity_offset > 0 ? `+${bias.intensity_offset}` : `${bias.intensity_offset}`;
    summaryParts.push(`행동 강도 오프셋 (${sign})`);
  }
  if (typeof bias.risk_sensitivity === 'number' && bias.risk_sensitivity !== 1.0) {
    summaryParts.push(`리스크 민감도 (${bias.risk_sensitivity.toFixed(1)}x)`);
  }
  if (bias.tone_preference != null && bias.tone_preference !== '') {
    summaryParts.push(`선호 코칭 톤: ${TONE_LABELS[bias.tone_preference] || bias.tone_preference}`);
  }
  if (typeof bias.action_count_limit === 'number' && bias.action_count_limit != null) {
    summaryParts.push(`권장 행동 개수 제한: 최대 ${bias.action_count_limit}개`);
  }

  // camelCase fields
  if (bias.domainWeights) {
    for (const [domain, weight] of Object.entries(bias.domainWeights)) {
      if (typeof weight === 'number' && weight > 0) {
        const label = DOMAIN_LABELS[domain] || domain;
        summaryParts.push(`${label} 영역 강조 (+${weight})`);
      }
    }
  }
  if (bias.tonePreference) {
    summaryParts.push(`톤: ${TONE_LABELS[bias.tonePreference] || bias.tonePreference}`);
  }
  if (bias.detailLevel) {
    summaryParts.push(`상세도: ${bias.detailLevel}`);
  }

  if (summaryParts.length === 0) return null;

  const handleReset = () => {
    localStorage.removeItem('local-rlhf-bias');
    localStorage.removeItem('rlhf-bias');
    localStorage.removeItem('rlhfBias');
    setBias(null);
    setVisible(false);
  };

  return (
    <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-violet-950/30 to-indigo-950/30 border border-violet-800/30 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">이전 피드백 반영 (개인화 보정 활성)</span>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          title="피드백 초기화"
        >
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

const TONE_LABELS: Record<string, string> = {
  warm: '따뜻한 격려형',
  direct: '직설적 코칭형',
  structured: '체계적 분석형',
  gentle: '부드러운 회복형',
};

export default RlhfTransparencyBanner;

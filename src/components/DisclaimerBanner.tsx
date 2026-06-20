'use client';

import React from 'react';

type DisclaimerLevel = 'general' | 'health' | 'finance_legal';

interface DisclaimerBannerProps {
  levels?: DisclaimerLevel[];
  className?: string;
}

const DISCLAIMERS: Record<DisclaimerLevel, { icon: string; text: string }> = {
  general: {
    icon: 'ℹ️',
    text: '이 서비스는 오락 및 자기 성찰 목적으로 제공됩니다. 운세 결과는 참고 사항이며, 모든 최종 판단은 사용자 본인에게 있습니다.',
  },
  health: {
    icon: '⚕️',
    text: '건강 관련 내용은 의학적 진단이나 치료를 대체하지 않습니다. 건강 문제가 있다면 반드시 전문 의료인과 상담하세요.',
  },
  finance_legal: {
    icon: '⚖️',
    text: '재정·법률 관련 내용은 전문적인 투자 조언이나 법률 자문이 아닙니다. 중요한 결정은 해당 분야 전문가와 상의하세요.',
  },
};

export default function DisclaimerBanner({ levels = ['general'], className = '' }: DisclaimerBannerProps) {
  return (
    <div className={`mt-8 space-y-2 ${className}`}>
      {levels.map((level) => {
        const d = DISCLAIMERS[level];
        return (
          <div
            key={level}
            className="flex items-start gap-2 px-4 py-3 rounded-xl bg-zinc-900/20 border border-zinc-800/40 text-zinc-500 text-xs leading-relaxed"
          >
            <span className="flex-shrink-0 text-sm">{d.icon}</span>
            <p>{d.text}</p>
          </div>
        );
      })}
    </div>
  );
}

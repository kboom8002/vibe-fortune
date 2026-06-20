'use client';
import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Briefcase, Heart, Activity, GraduationCap, Shield, ArrowRight, Settings } from 'lucide-react';

interface ContextMappingPanelProps {
  personalContext?: any;
}

const CONTEXT_TO_DOMAIN_MAP: Record<string, { domains: string[]; icon: any; label: string }> = {
  occupation: {
    domains: ['business_finance', 'reputation_branding'],
    icon: Briefcase,
    label: '직업',
  },
  healthConcerns: {
    domains: ['health_recovery'],
    icon: Activity,
    label: '건강 우려',
  },
  relationshipStatus: {
    domains: ['relationship_love'],
    icon: Heart,
    label: '관계 상태',
  },
  financialGoals: {
    domains: ['business_finance', 'risk_legal_safety'],
    icon: Shield,
    label: '재정 목표',
  },
  learningGoals: {
    domains: ['learning_writing_research'],
    icon: GraduationCap,
    label: '학습 목표',
  },
  lifePhilosophy: {
    domains: ['reputation_branding', 'relationship_love'],
    icon: MapPin,
    label: '삶의 철학',
  },
};

const DOMAIN_LABELS: Record<string, string> = {
  business_finance: '사업·재정',
  relationship_love: '관계·애정',
  health_recovery: '건강·회복',
  learning_writing_research: '학습·연구',
  reputation_branding: '명예·브랜딩',
  risk_legal_safety: '리스크·안전',
};

const DOMAIN_COLORS: Record<string, string> = {
  business_finance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  relationship_love: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  health_recovery: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  learning_writing_research: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  reputation_branding: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  risk_legal_safety: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
};

function truncateValue(value: any, maxLen = 24): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function ContextMappingPanel({ personalContext: propContext }: ContextMappingPanelProps) {
  const [localContext, setLocalContext] = useState<any>(null);

  useEffect(() => {
    if (!propContext) {
      try {
        const stored = localStorage.getItem('personal-context');
        if (stored) setLocalContext(JSON.parse(stored));
      } catch { /* ignore parse errors */ }
    }
  }, [propContext]);

  const context = propContext || localContext;

  const mappedEntries = useMemo(() => {
    if (!context) return [];
    return Object.entries(CONTEXT_TO_DOMAIN_MAP)
      .filter(([key]) => {
        const val = context[key];
        return val !== undefined && val !== null && val !== '';
      })
      .map(([key, config]) => ({
        key,
        value: context[key],
        ...config,
      }));
  }, [context]);

  // No personal context — show CTA
  if (!context || mappedEntries.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-zinc-300 font-medium">
              개인 맥락을 설정하면 더 정확한 운세를 받을 수 있습니다
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              직업, 건강, 관계 등의 맥락이 6대 운세 영역에 반영됩니다.
            </p>
          </div>
          <Link
            href="/app/settings"
            className="shrink-0 px-4 py-2 text-xs font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            설정하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
        <MapPin className="w-4 h-4 text-indigo-400" />
        당신의 맥락이 운세에 반영됩니다
      </h3>

      <div className="space-y-3">
        {mappedEntries.map((entry) => {
          const Icon = entry.icon;
          return (
            <div
              key={entry.key}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/50"
            >
              {/* Icon + Label + Value */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                    {entry.label}
                  </div>
                  <div className="text-xs text-zinc-300 truncate">
                    {truncateValue(entry.value)}
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

              {/* Domain Chips */}
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {entry.domains.map((domain) => (
                  <span
                    key={domain}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${DOMAIN_COLORS[domain] || 'bg-zinc-800/30 text-zinc-400 border-zinc-700/50'}`}
                  >
                    {DOMAIN_LABELS[domain] || domain}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

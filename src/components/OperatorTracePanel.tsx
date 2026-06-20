'use client';
import { useState } from 'react';
import { Workflow, ChevronDown, ChevronUp } from 'lucide-react';

interface TriggeredOperator {
  id: string;
  label: string;
  triggerCondition: string;
  outputPolicy: string;
  severity: 'info' | 'warning' | 'critical';
}

interface OperatorTracePanelProps {
  operators?: TriggeredOperator[];
  chartData?: any;
  vibeData?: any;
}

// Deterministic operator generation
function generateDeterministicOperators(chartData: any, vibeData: any): TriggeredOperator[] {
  const operators: TriggeredOperator[] = [];

  // Normalize element to English
  const elMap: Record<string, string> = {
    '목': 'wood', '木': 'wood', '화': 'fire', '火': 'fire',
    '토': 'earth', '土': 'earth', '금': 'metal', '金': 'metal',
    '수': 'water', '水': 'water',
  };
  const rawEl = chartData?.dayMaster?.element || 'earth';
  const element = elMap[rawEl] || rawEl.toLowerCase();
  const strength = chartData?.dayMaster?.strength?.judgment || 'balanced';

  // Base operator: daily luck alignment
  operators.push({
    id: 'op_daily_alignment',
    label: '일운 정렬 분석',
    triggerCondition: '매일 자동 실행 — 일간과 일운의 오행 관계 분석',
    outputPolicy: `일간 ${element}과 오늘 일운의 상호작용을 기반으로 영역별 에너지 배분을 조정했습니다.`,
    severity: 'info',
  });

  // Vibe-based operators
  if (vibeData) {
    const energy = vibeData.energy || vibeData.에너지 || 5;
    const focus = vibeData.focus || vibeData.집중도 || 5;
    const socialLoad = vibeData.socialLoad || vibeData.사회적부하 || 5;

    if (energy < 4) {
      operators.push({
        id: 'op_burnout_prevention',
        label: '번아웃 방지 정책',
        triggerCondition: `에너지 수준 ${energy}/10 — 임계값(4.0) 미만 감지`,
        outputPolicy: '건강·회복 영역 우선순위 상향, 과도한 업무 일정 경고, 수(水) 처방 강화',
        severity: 'warning',
      });
    }

    if (socialLoad > 7) {
      operators.push({
        id: 'op_social_boundary',
        label: '사회적 경계 설정',
        triggerCondition: `사회적 부하 ${socialLoad}/10 — 임계값(7.0) 초과 감지`,
        outputPolicy: '불필요한 약속 정리 권고, 혼자만의 시간 확보 전략 포함',
        severity: 'info',
      });
    }

    if (focus > 7 && energy > 6) {
      operators.push({
        id: 'op_peak_performance',
        label: '최고 성과 창구 감지',
        triggerCondition: `집중력 ${focus}/10 + 에너지 ${energy}/10 — 동시 고점`,
        outputPolicy: '핵심 프로젝트 집중 권고, 중요한 의사결정 적기 알림',
        severity: 'info',
      });
    }
  }

  // Strength-based operator
  if (strength === 'weak') {
    operators.push({
      id: 'op_support_network',
      label: '지원 네트워크 활성화',
      triggerCondition: '일간 세기 약(弱) — 협력적 전략 필요',
      outputPolicy: '파트너십·멘토링 관련 조언 강화, 독립 실행보다 협업 우선 권고',
      severity: 'info',
    });
  }

  return operators;
}

const SEVERITY_STYLES: Record<string, { dot: string; border: string; label: string }> = {
  info: { dot: 'bg-blue-400', border: 'border-blue-800/20', label: '정보' },
  warning: { dot: 'bg-amber-400', border: 'border-amber-800/20', label: '주의' },
  critical: { dot: 'bg-rose-400', border: 'border-rose-800/20', label: '위험' },
};

export function OperatorTracePanel({ operators, chartData, vibeData }: OperatorTracePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeOperators = operators && operators.length > 0
    ? operators
    : chartData
      ? generateDeterministicOperators(chartData, vibeData)
      : [];

  if (activeOperators.length === 0) return null;

  const warningCount = activeOperators.filter(op => op.severity === 'warning' || op.severity === 'critical').length;

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-4">
      {/* Header — Toggleable */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 group"
      >
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Workflow className="w-4 h-4 text-indigo-400" />
          행동 정책 생성 이유
          {warningCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400">
              {warningCount} 주의
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {activeOperators.length}개 연산자
          </span>
          {isOpen
            ? <ChevronUp className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            : <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          }
        </div>
      </button>

      {/* Collapsed summary */}
      {!isOpen && (
        <div className="flex flex-wrap gap-2">
          {activeOperators.map((op) => {
            const sev = SEVERITY_STYLES[op.severity] || SEVERITY_STYLES.info;
            return (
              <span
                key={op.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/50 border border-zinc-800/60 text-[11px] text-zinc-400"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                {op.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Expanded operator list */}
      {isOpen && (
        <div className="space-y-2 pt-2 border-t border-zinc-800/40">
          {activeOperators.map((op) => {
            const sev = SEVERITY_STYLES[op.severity] || SEVERITY_STYLES.info;
            const isExpanded = expandedId === op.id;

            return (
              <button
                key={op.id}
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : op.id)}
                className={`
                  w-full text-left px-4 py-3 rounded-2xl border transition-all duration-200
                  bg-zinc-950/50 hover:bg-zinc-900/60
                  ${isExpanded
                    ? `${sev.border} shadow-sm`
                    : 'border-zinc-800/60 hover:border-zinc-700/60'
                  }
                `}
              >
                {/* Operator header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${sev.dot} shrink-0 mt-1.5`} />
                    <div className="min-w-0">
                      <span className="text-sm text-zinc-200 font-medium block">{op.label}</span>
                      <span className="text-[11px] text-zinc-500 block mt-0.5 truncate">{op.triggerCondition}</span>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-1" />
                    : <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-1" />
                  }
                </div>

                {/* Expanded: full details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/40 space-y-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">트리거 조건</span>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{op.triggerCondition}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">출력 정책</span>
                      <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">{op.outputPolicy}</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

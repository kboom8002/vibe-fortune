'use client';
import { useState } from 'react';
import { Zap, Brain, ChevronDown, ChevronUp } from 'lucide-react';

interface Concept {
  id: string;
  label: string;
  type: 'state' | 'evidence' | 'action' | 'risk';
  domain: string;
  rationale: string;
  active: boolean;
}

interface ConceptActivationPanelProps {
  concepts?: Concept[];
  chartData?: any;
  vibeData?: any;
}

// Deterministic concept generation from chart data
function generateDeterministicConcepts(chartData: any, vibeData: any): Concept[] {
  const concepts: Concept[] = [];
  const dm = chartData?.dayMaster;
  const element = dm?.element || 'earth';
  const strength = dm?.strength?.judgment || 'balanced';
  const yongSin = dm?.yongSin;

  // State concepts
  concepts.push({
    id: 'dm_strength',
    label: strength === 'strong' ? '강한 일간 — 자기 주도력 높음' : strength === 'weak' ? '유연한 일간 — 협력적 관계 중심' : '균형 잡힌 일간 — 중용의 안정',
    type: 'state',
    domain: 'general',
    rationale: `일간(日干)의 세기가 ${strength === 'strong' ? '강하여 독립적 의사결정과 추진력이 핵심 자산입니다. 그러나 주변과의 조화를 의식적으로 챙기세요.' : strength === 'weak' ? '약하여 주변의 도움과 환경이 성패를 좌우합니다. 좋은 파트너를 만나는 것이 핵심 전략입니다.' : '균형이 잡혀 안정적입니다. 극단적 선택보다 중도적 접근이 효과적입니다.'}`,
    active: true,
  });

  if (yongSin) {
    concepts.push({
      id: 'yongsin_active',
      label: `용신(用神) ${yongSin} 활성화`,
      type: 'evidence',
      domain: 'general',
      rationale: `용신 ${yongSin}의 기운이 현재 운세에서 작용하고 있습니다. 이 오행의 에너지를 적극적으로 활용하면 유리한 흐름을 만들 수 있습니다.`,
      active: true,
    });
  }

  // Vibe-based concepts
  if (vibeData) {
    const energy = vibeData.energy || vibeData.에너지 || 5;
    const focus = vibeData.focus || vibeData.집중도 || 5;
    const valence = vibeData.valence || vibeData.감정톤 || 5;

    if (energy < 4) {
      concepts.push({
        id: 'low_energy',
        label: '에너지 저하 상태 감지',
        type: 'risk',
        domain: 'health_recovery',
        rationale: '현재 에너지 수준이 낮습니다. 무리한 일정보다 회복에 집중하고, 수(水) 처방을 통해 재충전하세요.',
        active: true,
      });
    } else if (energy > 7) {
      concepts.push({
        id: 'high_energy',
        label: '높은 실행 에너지 활성',
        type: 'action',
        domain: 'business_finance',
        rationale: '에너지가 높아 실행력이 뛰어난 상태입니다. 중요한 의사결정이나 새로운 프로젝트 시작에 적합합니다.',
        active: true,
      });
    }

    if (focus > 7) {
      concepts.push({
        id: 'high_focus',
        label: '집중력 최고조',
        type: 'state',
        domain: 'learning_writing_research',
        rationale: '집중력이 높은 상태입니다. 깊은 사고가 필요한 연구, 집필, 학습에 투자하면 높은 성과를 기대할 수 있습니다.',
        active: true,
      });
    }

    if (valence < 4) {
      concepts.push({
        id: 'low_valence',
        label: '감정 회복 필요',
        type: 'risk',
        domain: 'relationship_love',
        rationale: '감정 톤이 낮아 대인관계에서 마찰이 생길 수 있습니다. 중요한 대화는 내일로 미루고, 자기 돌봄에 집중하세요.',
        active: true,
      });
    }
  }

  // Element-based concepts
  const ELEMENT_CONCEPTS: Record<string, Concept> = {
    wood: { id: 'scope_expansion', label: '확장 범위 점검 필요', type: 'action', domain: 'business_finance', rationale: '목(木)의 성장 에너지가 작용합니다. 새로운 영역으로의 확장은 긍정적이나, 핵심 역량에서 벗어나지 않도록 범위를 점검하세요.', active: true },
    fire: { id: 'brand_expression', label: '표현·브랜딩 적기', type: 'action', domain: 'reputation_branding', rationale: '화(火)의 표현 에너지가 활성화됩니다. 자기 PR, 발표, 콘텐츠 공개 등 외부로의 표현 활동에 유리합니다.', active: true },
    earth: { id: 'foundation_build', label: '기반 구축 적기', type: 'state', domain: 'business_finance', rationale: '토(土)의 안정 에너지가 기반을 이룹니다. 체계 정비, 루틴 확립, 장기 투자 등 기반을 다지는 활동에 집중하세요.', active: true },
    metal: { id: 'efficiency_optimize', label: '효율성 최적화 시점', type: 'action', domain: 'learning_writing_research', rationale: '금(金)의 결단 에너지가 작용합니다. 불필요한 것을 정리하고 핵심에 집중하는 것이 효과적입니다.', active: true },
    water: { id: 'insight_accumulate', label: '지혜 축적의 시기', type: 'state', domain: 'learning_writing_research', rationale: '수(水)의 유연한 에너지가 흐릅니다. 깊은 사색과 학습, 새로운 관점 탐색에 유리합니다.', active: true },
  };

  // Normalize element to English key
  const elMap: Record<string, string> = {
    '목': 'wood', '木': 'wood', '화': 'fire', '火': 'fire',
    '토': 'earth', '土': 'earth', '금': 'metal', '金': 'metal',
    '수': 'water', '水': 'water',
  };
  const elKey = elMap[element] || element.toLowerCase();
  if (ELEMENT_CONCEPTS[elKey]) concepts.push(ELEMENT_CONCEPTS[elKey]);

  return concepts;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  state: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '상태' },
  evidence: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '근거' },
  action: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '행동' },
  risk: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: '리스크' },
};

const DOMAIN_ICONS: Record<string, string> = {
  general: '🌐',
  business_finance: '💼',
  relationship_love: '💖',
  health_recovery: '🩺',
  learning_writing_research: '📚',
  reputation_branding: '🏆',
  risk_legal_safety: '🛡️',
};

export function ConceptActivationPanel({ concepts, chartData, vibeData }: ConceptActivationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeConcepts = concepts && concepts.length > 0
    ? concepts
    : chartData
      ? generateDeterministicConcepts(chartData, vibeData)
      : [];

  if (activeConcepts.length === 0) return null;

  return (
    <div className="p-6 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 backdrop-blur-md space-y-5">
      {/* Section Title */}
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-3">
        <Zap className="w-4 h-4 text-amber-400" />
        <Brain className="w-4 h-4 text-purple-400" />
        오늘 활성화된 TCO 개념
      </h3>

      {/* Concept Chips */}
      <div className="flex flex-wrap gap-3">
        {activeConcepts.filter(c => c.active).map((concept) => {
          const style = TYPE_STYLES[concept.type] || TYPE_STYLES.state;
          const isExpanded = expandedId === concept.id;
          const domainIcon = DOMAIN_ICONS[concept.domain] || '🌐';

          return (
            <div key={concept.id} className="w-full">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : concept.id)}
                className={`
                  w-full text-left px-4 py-3 rounded-2xl border transition-all duration-200
                  bg-zinc-950/50 hover:bg-zinc-900/60
                  ${isExpanded
                    ? 'border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.08)]'
                    : 'border-zinc-800/60 hover:border-zinc-700/60'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Type Badge */}
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.text} border border-current/10`}>
                      {style.label}
                    </span>
                    {/* Domain Icon */}
                    <span className="text-sm shrink-0" title={concept.domain}>{domainIcon}</span>
                    {/* Label */}
                    <span className="text-sm text-zinc-200 font-medium truncate">{concept.label}</span>
                  </div>
                  {/* Expand/Collapse */}
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  }
                </div>

                {/* Expanded Rationale */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-zinc-800/40">
                    <p className="text-xs text-zinc-400 leading-relaxed">{concept.rationale}</p>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateChart, calculateMajorLuck, calculateAnnualLuck } from "@/lib/manse";
import type { ChartResult } from "@/lib/manse/types";
import { loadPrompt, getPromptVersions } from "@/lib/prompt-registry";

// ---------------------------------------------------------------------------
// Element type & mappings (deterministic — no LLM)
// ---------------------------------------------------------------------------

type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

const ELEMENT_KR: Record<ElementKey, string> = {
  wood: "목(木)", fire: "화(火)", earth: "토(土)", metal: "금(金)", water: "수(水)",
};

const ELEMENT_THEME: Record<ElementKey, string> = {
  wood: "성장과 확장의 시기",
  fire: "표현과 열정의 시기",
  earth: "안정과 구축의 시기",
  metal: "정리와 수확의 시기",
  water: "유연함과 축적의 시기",
};

const ELEMENT_OPPORTUNITIES: Record<ElementKey, string[]> = {
  wood: ["새로운 사업이나 프로젝트 시작", "학습과 자기개발 투자"],
  fire: ["네트워크 확장과 인맥 구축", "리더십과 브랜딩 강화"],
  earth: ["부동산이나 장기 투자", "조직 구축과 시스템 정비"],
  metal: ["효율성 개선과 비용 절감", "전문성 심화와 자격 취득"],
  water: ["연구와 지식 축적", "유연한 포지셔닝과 전환"],
};

const ELEMENT_CHALLENGES: Record<ElementKey, string[]> = {
  wood: ["과도한 확장으로 인한 에너지 분산", "조급함으로 인한 판단 실수"],
  fire: ["감정적 과열과 번아웃 위험", "주변과의 마찰 가능성"],
  earth: ["변화에 대한 저항과 고착", "지나친 보수성으로 기회 놓침"],
  metal: ["경직된 사고로 유연성 부족", "지나친 완벽주의"],
  water: ["방향 없는 유동성과 우유부단", "에너지 분산과 집중력 저하"],
};

const STEM_TO_ELEMENT: Record<string, ElementKey> = {
  "甲": "wood", "乙": "wood",
  "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth",
  "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

// Five-element interaction map (상생/상극)
const ELEMENT_GENERATES: Record<ElementKey, ElementKey> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};
const ELEMENT_CONTROLS: Record<ElementKey, ElementKey> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};

function resolveElement(el?: string): ElementKey {
  if (!el) return "earth";
  if (STEM_TO_ELEMENT[el]) return STEM_TO_ELEMENT[el];
  const lower = el.toLowerCase();
  const map: Record<string, ElementKey> = {
    wood: "wood", fire: "fire", earth: "earth", metal: "metal", water: "water",
    "목": "wood", "화": "fire", "토": "earth", "금": "metal", "수": "water",
  };
  return map[lower] || map[el] || "earth";
}

function getInteraction(source: ElementKey, target: ElementKey): string {
  if (ELEMENT_GENERATES[source] === target) return "상생(도움)";
  if (ELEMENT_GENERATES[target] === source) return "상생(수혜)";
  if (ELEMENT_CONTROLS[source] === target) return "상극(제어)";
  if (ELEMENT_CONTROLS[target] === source) return "상극(압박)";
  if (source === target) return "비화(동질)";
  return "간접 관계";
}

// ---------------------------------------------------------------------------
// Narrative generators (deterministic — no LLM)
// ---------------------------------------------------------------------------

function generateLifetimeNarrative(chart: ChartResult, profile: any): string {
  const dm = chart.dayMaster;
  const stem = dm.stem;
  const element = dm.element as ElementKey;
  const elementKr = ELEMENT_KR[element];
  const strengthJudgment = dm.strength?.judgment || "balanced";
  const yongSin = dm.yongSin ? resolveElement(dm.yongSin) : null;
  const yongSinKr = yongSin ? ELEMENT_KR[yongSin] : null;

  const strengthDesc = strengthJudgment === "strong"
    ? "강한 자기 주도력과 추진력"
    : strengthJudgment === "weak"
    ? "섬세한 감수성과 협력적 유연함"
    : "균형 잡힌 중용의 힘";

  const coreAsset = strengthJudgment === "strong"
    ? "독립적인 결정력과 실행력이 뛰어나 자신만의 길을 개척해 나가는 데 강점이 있습니다. 다만, 주변과의 조화를 의식적으로 챙기는 것이 장기적 성공의 열쇠입니다."
    : strengthJudgment === "weak"
    ? "주변 환경과 사람들의 도움을 잘 받아들이는 유연함이 핵심 자산입니다. 적절한 파트너와 환경을 선택하는 것이 운명의 흐름을 크게 바꿀 수 있습니다."
    : "강함과 유연함이 적절히 조화되어 다양한 상황에 안정적으로 대처할 수 있는 기질을 타고났습니다. 극단을 피하고 중심을 잡는 전략이 효과적입니다.";

  const yongSinDesc = yongSinKr
    ? `용신(用神)인 ${yongSinKr}의 기운이 강해지는 시기에 중요한 도약과 기회가 찾아올 가능성이 높습니다. 대운과 세운에서 ${yongSinKr} 에너지가 들어오는 시기를 주목하세요.`
    : "용신 분석은 추가적인 사주 심화 분석을 통해 더 정밀하게 확인할 수 있습니다.";

  return `일간(日干) ${stem} ${elementKr}을 타고난 당신의 생애는 ${strengthDesc}을 핵심 기질로 합니다. ${coreAsset} ${yongSinDesc}`;
}

function generateCurrentDecadeSummary(
  currentMajorLuck: { stem: string; branch: string; ganzhi: string; startAge: number } | null,
  chart: ChartResult,
  profile: any,
): string {
  if (!currentMajorLuck) {
    return "현재 대운 정보를 계산할 수 없습니다. 출생 시간이 정확한지 확인해 주세요. 대운은 약 10년 단위로 바뀌며 인생의 큰 흐름을 결정짓는 중요한 요소입니다.";
  }

  const mlElement = resolveElement(currentMajorLuck.stem);
  const mlElementKr = ELEMENT_KR[mlElement];
  const dmElement = chart.dayMaster.element as ElementKey;
  const interaction = getInteraction(mlElement, dmElement);
  const theme = ELEMENT_THEME[mlElement];

  const direction = interaction.includes("상생")
    ? "현재 대운이 일간과 상생 관계에 있어 비교적 순조로운 흐름 속에 있습니다. 이 시기의 에너지를 적극적으로 활용하여 중장기 목표를 추진하세요."
    : interaction.includes("상극")
    ? "현재 대운이 일간과 상극 관계에 있어 도전과 변화가 많은 시기입니다. 하지만 상극은 성장의 원동력이기도 합니다. 무리한 확장보다는 내실을 다지는 전략이 효과적입니다."
    : "현재 대운이 일간과 비화(동질) 관계로, 자신의 본질적 기운이 강화되는 시기입니다. 자기 정체성을 확립하고 고유한 강점을 발휘하기에 좋은 때입니다.";

  return `현재 대운은 ${currentMajorLuck.ganzhi}(${mlElementKr} 기운)으로, '${theme}'에 해당합니다. 일간과의 관계는 ${interaction}입니다. ${direction}`;
}

function generateCurrentYearSummary(
  annualLuck: { year: number; pillar: { stem: string; branch: string; label: string } } | null,
  chart: ChartResult,
): string {
  if (!annualLuck) {
    return `${new Date().getFullYear()}년의 세운 정보를 불러올 수 없습니다. 세운은 올해 한 해의 전반적인 에너지 흐름을 보여주며, 대운의 맥락 안에서 구체적인 기회와 과제를 알려줍니다.`;
  }

  const yearElement = resolveElement(annualLuck.pillar.stem);
  const yearElementKr = ELEMENT_KR[yearElement];
  const dmElement = chart.dayMaster.element as ElementKey;
  const interaction = getInteraction(yearElement, dmElement);
  const theme = ELEMENT_THEME[yearElement];

  const keyFocus = interaction.includes("상생")
    ? "올해는 일간에 힘을 실어주는 기운이 흐르고 있어, 새로운 도전이나 확장에 유리합니다. 기회가 왔을 때 과감하게 움직이되, 기본기를 잃지 않는 것이 중요합니다."
    : interaction.includes("상극")
    ? "올해는 일간에 긴장감을 주는 기운이 있어, 신중한 판단이 요구됩니다. 큰 변화보다는 내적 역량을 키우고 기존 관계와 자원을 정비하는 데 집중하세요."
    : "올해는 일간과 동질의 기운이 흘러, 본연의 모습을 드러내고 자신감을 회복하기에 좋은 시기입니다. 자기 주도적인 결정이 좋은 결과로 이어질 수 있습니다.";

  return `${annualLuck.year}년 세운은 ${annualLuck.pillar.label}(${yearElementKr} 기운)으로, '${theme}'의 성격을 띱니다. 일간과의 관계는 ${interaction}입니다. ${keyFocus}`;
}

function generateDecadeTimeline(
  majorLuckCycles: Array<{ stem: string; branch: string; ganzhi: string; startAge: number; startDate?: string }>,
  birthYear: number,
  chart: ChartResult,
): Array<{
  ageRange: string;
  pillar: { stem: string; branch: string; label: string };
  theme: string;
  narrative: string;
  opportunities: string[];
  challenges: string[];
  isCurrent: boolean;
}> {
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - birthYear;
  const dmElement = chart.dayMaster.element as ElementKey;
  const yongSin = chart.dayMaster.yongSin ? resolveElement(chart.dayMaster.yongSin) : null;

  return majorLuckCycles.map((cycle) => {
    const cycleElement = resolveElement(cycle.stem);
    const cycleElementKr = ELEMENT_KR[cycleElement];
    const interaction = getInteraction(cycleElement, dmElement);
    const theme = ELEMENT_THEME[cycleElement];
    const isCurrent = currentAge >= cycle.startAge && currentAge < cycle.startAge + 10;

    const yongSinMatch = yongSin && cycleElement === yongSin;
    const yongSinNote = yongSinMatch
      ? ` 특히 용신 ${ELEMENT_KR[yongSin]}의 기운이 직접 들어오는 시기로, 인생의 중요한 전환점이 될 수 있습니다.`
      : "";

    const narrative = `${cycle.startAge}세부터 시작되는 ${cycle.ganzhi} 대운은 ${cycleElementKr} 기운이 지배합니다. 일간 ${ELEMENT_KR[dmElement]}과의 관계는 ${interaction}으로, ${
      interaction.includes("상생")
        ? "비교적 순조로운 흐름 속에서 기회를 포착할 수 있는 시기입니다."
        : interaction.includes("상극")
        ? "도전과 성장이 공존하는 역동적인 시기입니다."
        : "자기 본질을 강화하고 정체성을 확립하는 시기입니다."
    }${yongSinNote}`;

    return {
      ageRange: `${cycle.startAge}세 ~ ${cycle.startAge + 9}세`,
      pillar: { stem: cycle.stem, branch: cycle.branch, label: cycle.ganzhi },
      theme,
      narrative,
      opportunities: ELEMENT_OPPORTUNITIES[cycleElement],
      challenges: ELEMENT_CHALLENGES[cycleElement],
      isCurrent,
    };
  });
}

function calculateYongSinAlignment(
  chart: ChartResult,
  currentMajorLuck: { stem: string; branch: string } | null,
): number {
  const yongSin = chart.dayMaster.yongSin ? resolveElement(chart.dayMaster.yongSin) : null;
  if (!yongSin) return 50;

  let score = 40; // base score

  // Check if current major luck contains yongSin element
  if (currentMajorLuck) {
    const mlElement = resolveElement(currentMajorLuck.stem);
    if (mlElement === yongSin) score += 30;
    else if (ELEMENT_GENERATES[mlElement] === yongSin) score += 15;
    else if (ELEMENT_CONTROLS[mlElement] === yongSin) score -= 10;
  }

  // Check fiveElementDistribution for yongSin presence
  const dist = chart.fiveElementDistribution;
  if (dist) {
    const yongSinCount = dist[yongSin] || 0;
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const ratio = yongSinCount / total;
      score += Math.round((ratio - 0.2) * 50); // centered around 20% (balanced)
    }
  }

  return Math.min(100, Math.max(0, score));
}

function generatePersonalizedStrategy(personalContext: string, chart: ChartResult): string {
  const dmElement = chart.dayMaster.element as ElementKey;
  const strategies: Record<ElementKey, string> = {
    wood: "현재 관심사와 관련하여, 새로운 학습이나 네트워크를 통한 성장 전략이 효과적입니다. 작은 실험을 반복하며 가능성을 탐색해 보세요.",
    fire: "현재 관심사와 관련하여, 적극적인 자기 표현과 리더십 발휘가 효과적입니다. 열정을 행동으로 전환하되 번아웃에 주의하세요.",
    earth: "현재 관심사와 관련하여, 체계적인 계획과 꾸준한 실행이 가장 효과적인 전략입니다. 급하게 서두르지 말고 기반을 단단히 하세요.",
    metal: "현재 관심사와 관련하여, 불필요한 것을 정리하고 핵심에 집중하는 전략이 효과적입니다. 전문성을 깊이 파고들어 보세요.",
    water: "현재 관심사와 관련하여, 유연하게 흐름을 읽고 적응하는 전략이 효과적입니다. 다양한 가능성을 열어두고 직관을 신뢰하세요.",
  };
  return strategies[dmElement];
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : "local-user";

    const body = await request.json();

    // Accept both { birthProfile: {...} } and { birthProfileId: "..." } formats
    // The page sends the full profile object from localStorage
    let birthProfile = body.birthProfile;
    if (!birthProfile && body.birthProfileId) {
      // Legacy format: try to look up from supabase if possible
      // For local-user, this won't work, so we return an error
      return NextResponse.json(
        { status: "error", message: "생년월일 정보가 필요합니다. birthProfile 객체를 전달해주세요." },
        { status: 400 }
      );
    }

    if (!birthProfile) {
      return NextResponse.json(
        { status: "error", message: "생년월일 정보가 필요합니다." },
        { status: 400 }
      );
    }

    // Extract optional personalContext
    const personalContext: string | undefined = body.personalContext;

    // Calculate chart deterministically
    let chartResult: ChartResult;
    try {
      let birthDateTimeStr = birthProfile.birthDateTime;
      if (!birthDateTimeStr) {
        const bd = birthProfile.birthDate || "1990-01-01";
        const bt = birthProfile.birthTime || "12:00";
        birthDateTimeStr = `${bd}T${bt}:00`;
      }
      chartResult = calculateChart({
        birthDateTime: birthDateTimeStr,
        timezone: birthProfile.timezone || "Asia/Seoul",
        gender: birthProfile.gender || "male",
      });
    } catch (err) {
      console.error("[LifetimeAPI] Chart calculation failed:", err);
      return NextResponse.json(
        { status: "error", message: "사주 차트 계산 실패" },
        { status: 500 }
      );
    }

    // Calculate major luck timeline
    let majorLuckCycles: Array<{
      stem: string;
      branch: string;
      ganzhi: string;
      startAge: number;
      startDate?: string;
    }> = [];
    try {
      const ml = calculateMajorLuck({
        chart: chartResult,
        gender: birthProfile.gender || "male",
      });
      majorLuckCycles = ml.cycles || [];
    } catch (err) {
      console.warn("[LifetimeAPI] Major luck calculation failed:", err);
    }

    // Calculate current year's annual luck
    let annualLuck: { year: number; pillar: { stem: string; branch: string; label: string } } | null = null;
    try {
      annualLuck = calculateAnnualLuck({ year: new Date().getFullYear() });
    } catch (err) {
      console.warn("[LifetimeAPI] Annual luck calculation failed:", err);
    }

    // Extract birth year
    const birthYear = (() => {
      if (birthProfile.birthDateTime) {
        return new Date(birthProfile.birthDateTime).getFullYear();
      }
      if (birthProfile.birthDate) {
        return parseInt(birthProfile.birthDate.split("-")[0], 10);
      }
      return 1990;
    })();

    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;

    // Find current major luck cycle
    const currentMajorLuck = majorLuckCycles.find((c) => {
      return currentAge >= c.startAge && currentAge < c.startAge + 10;
    }) || majorLuckCycles[0] || null;

    // Determine life cycle phase
    const lifeCyclePhase =
      currentAge < 30 ? "성장 초기" :
      currentAge < 45 ? "도약기" :
      currentAge < 60 ? "성숙기" : "통합기";

    // Determine key theme based on current major luck element
    const currentMlElement = currentMajorLuck
      ? resolveElement(currentMajorLuck.stem)
      : (chartResult.dayMaster.element as ElementKey);
    const keyTheme = `${lifeCyclePhase} — ${ELEMENT_THEME[currentMlElement]}`;

    // Build strategic advice
    const dmElement = chartResult.dayMaster.element as ElementKey;
    const strategicAdviceMap: Record<ElementKey, string> = {
      wood: "성장과 확장의 기운을 활용하되, 뿌리를 단단히 하는 기본기에도 투자하세요. 용신의 에너지가 들어오는 시기에 과감한 도전을 준비해 두세요.",
      fire: "열정과 표현의 기운을 최대한 활용하되, 지나친 소모를 방지하는 휴식의 리듬을 만드세요. 핵심 관계와 브랜딩에 에너지를 집중하세요.",
      earth: "안정과 체계의 기운을 바탕으로, 장기적인 관점에서 기반을 구축하세요. 변화를 두려워하지 않되, 검증된 방법을 우선시하세요.",
      metal: "결단력과 효율성을 무기로 활용하되, 유연한 사고도 함께 기르세요. 전문성의 깊이를 더하는 것이 장기적 자산이 됩니다.",
      water: "유연함과 적응력을 살려 다양한 가능성을 탐색하되, 핵심 방향성을 놓치지 마세요. 직관을 신뢰하고 내면의 지혜를 키워가세요.",
    };
    const strategicAdvice = strategicAdviceMap[dmElement];

    // Build the narrative response structure (deterministic baseline)
    const lifetimeFortune: Record<string, any> = {
      lifetimeNarrative: generateLifetimeNarrative(chartResult, birthProfile),
      currentDecadeSummary: generateCurrentDecadeSummary(currentMajorLuck, chartResult, birthProfile),
      currentYearSummary: generateCurrentYearSummary(annualLuck, chartResult),
      decadeTimeline: generateDecadeTimeline(majorLuckCycles, birthYear, chartResult),
      currentPositioning: {
        lifeCyclePhase,
        dominantElement: chartResult.dayMaster.element || "earth",
        yongSinAlignment: calculateYongSinAlignment(chartResult, currentMajorLuck),
        keyTheme,
        strategicAdvice,
        personalizedStrategy: personalContext
          ? generatePersonalizedStrategy(personalContext, chartResult)
          : undefined,
      },
      fiveElementDistribution: chartResult.fiveElementDistribution,
      dayMaster: chartResult.dayMaster,
    };

    // --- LLM Enhancement (optional, enriches deterministic baseline) ---
    const apiKey = process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const lifetimePromptVersion = loadPrompt('lifetime_fortune_writer');
        const lifetimePrompt = lifetimePromptVersion.content;

        if (lifetimePrompt) {
          const systemPromptVersion = loadPrompt('system');
          const systemPrompt = systemPromptVersion.content || "You are TCO-Vibe Fortune Coach.";

          const contextData = {
            dayMaster: chartResult.dayMaster,
            fourPillars: (chartResult as any).fourPillars,
            elementProfile: (chartResult as any).elementProfile,
            fiveElementDistribution: chartResult.fiveElementDistribution,
            majorLuckCycles: majorLuckCycles.map(c => ({
              ...c,
              element: resolveElement(c.stem),
              elementKr: ELEMENT_KR[resolveElement(c.stem)],
            })),
            currentMajorLuck: currentMajorLuck ? {
              ...currentMajorLuck,
              element: resolveElement(currentMajorLuck.stem),
            } : null,
            annualLuck,
            currentAge,
            lifeCyclePhase,
            personalContext: personalContext || null,
          };

          const userPrompt = `${lifetimePrompt}\n\n---\n## 입력 데이터\n${JSON.stringify(contextData, null, 2)}\n\n## 기존 결정론적 분석 (참고하여 더 풍부하게 확장하세요)\n- 생애 총론: ${lifetimeFortune.lifetimeNarrative}\n- 현재 대운: ${lifetimeFortune.currentDecadeSummary}\n- 올해 세운: ${lifetimeFortune.currentYearSummary}`;

          const isGoogle = !!process.env.GOOGLE_API_KEY;

          if (isGoogle) {
            // @ts-ignore — optional dependency
            const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
            const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");
            const llm = new ChatGoogleGenerativeAI({
              apiKey: process.env.GOOGLE_API_KEY!,
              model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
              temperature: 0.3,
            });
            const response = await llm.invoke([
              new SystemMessage(systemPrompt),
              new HumanMessage(userPrompt),
            ]);
            const llmText = typeof response.content === "string" ? response.content : "";
            if (llmText.length > 200) {
              lifetimeFortune.llmEnhancedNarrative = llmText;
            }
          } else {
            const { ChatOpenAI } = await import("@langchain/openai");
            const { SystemMessage, HumanMessage } = await import("@langchain/core/messages");
            const llm = new ChatOpenAI({
              openAIApiKey: process.env.OPENAI_API_KEY!,
              modelName: process.env.OPENAI_MODEL || "gpt-4o-mini",
              temperature: 0.3,
            });
            const response = await llm.invoke([
              new SystemMessage(systemPrompt),
              new HumanMessage(userPrompt),
            ]);
            const llmText = typeof response.content === "string" ? response.content : "";
            if (llmText.length > 200) {
              lifetimeFortune.llmEnhancedNarrative = llmText;
            }
          }
        }
      } catch (llmError) {
        console.warn("[LifetimeAPI] LLM enhancement failed, using deterministic fallback:", llmError);
        // Deterministic fallback already set — no action needed
      }
    }

    return NextResponse.json({
      status: "ok",
      lifetimeFortune,
      promptVersions: getPromptVersions(),
    });
  } catch (err) {
    console.error("[LifetimeAPI] Error:", err);
    return NextResponse.json(
      { status: "error", message: "인생 총운 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

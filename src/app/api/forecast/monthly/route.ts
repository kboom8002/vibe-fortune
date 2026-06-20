import { NextResponse } from "next/server";
import { runAgentWorkflow } from "@/lib/agent/graph";
import { MonthlyForecastRequestSchema } from "@/schemas/api-contracts.schema";
import { VibeFortuneAgentState } from "@/lib/agent/state";
import { createClient } from "@/lib/supabase/server";
import { calculateDailyLuckRange, calculateChart } from "@/lib/manse";
import { STEM_ELEMENTS, type HeavenlyStem } from "@/lib/manse/constants";

// ── Element theme & domain helpers (deterministic, no LLM) ──

type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

const ELEMENT_THEME: Record<FiveElement, string> = {
  wood: "성장·확장", fire: "표현·실행", earth: "안정·축적",
  metal: "정리·최적화", water: "회복·전략",
};

const ELEMENT_EMOJI: Record<FiveElement, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "💧",
};

type DomainKey = "career" | "finance" | "relationship" | "health" | "creativity" | "learning";
const DOMAINS: DomainKey[] = ["career", "finance", "relationship", "health", "creativity", "learning"];

const DOMAIN_LABELS: Record<DomainKey, string> = {
  career: "커리어", finance: "재무", relationship: "관계",
  health: "건강", creativity: "창의", learning: "학습",
};

/** Deterministic domain-element affinity mapping */
const DOMAIN_ELEMENT_AFFINITY: Record<DomainKey, Record<FiveElement, "high" | "medium" | "low">> = {
  career:       { wood: "high",   fire: "high",   earth: "medium", metal: "medium", water: "low" },
  finance:      { wood: "low",    fire: "low",    earth: "high",   metal: "high",   water: "medium" },
  relationship: { wood: "medium", fire: "high",   earth: "medium", metal: "low",    water: "high" },
  health:       { wood: "high",   fire: "medium", earth: "high",   metal: "low",    water: "high" },
  creativity:   { wood: "high",   fire: "high",   earth: "low",    metal: "medium", water: "high" },
  learning:     { wood: "high",   fire: "medium", earth: "medium", metal: "high",   water: "high" },
};

const ELEMENT_STRATEGY: Record<FiveElement, string> = {
  wood: "새로운 기회를 탐색하고 성장 동력을 확보하세요",
  fire: "적극적으로 표현하고 핵심 프로젝트를 추진하세요",
  earth: "기반을 다지고 안정적인 루틴을 유지하세요",
  metal: "불필요한 것을 정리하고 효율을 극대화하세요",
  water: "충분히 쉬며 전략적 사고에 시간을 투자하세요",
};

/** Get the midpoint (Wednesday) date string of a week starting at given Monday */
function getWeekMidpointDate(monthYear: number, monthNum: number, weekIndex: number): string {
  // Week 0 starts on day 1, week 1 on day 8, etc.
  const startDay = 1 + weekIndex * 7;
  const midDay = startDay + 3; // Wednesday (midpoint)
  const lastDay = new Date(monthYear, monthNum, 0).getDate();
  const clampedDay = Math.min(midDay, lastDay);
  const m = String(monthNum).padStart(2, "0");
  const d = String(clampedDay).padStart(2, "0");
  return `${monthYear}-${m}-${d}`;
}

// ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : "local-user";

    const body = await request.json();
    
    // 1. Validate request with Zod
    const parsed = MonthlyForecastRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "partial",
          warnings: [
            {
              code: "INSUFFICIENT_CONTEXT",
              message: "요청 페이로드 유효성 검증 실패: " + parsed.error.message,
              node: "API_Route",
              userVisible: true,
            },
          ],
          safetyFlags: [],
        },
        { status: 400 }
      );
    }

    const { targetMonth, currentFocus, userMessage, vibeCheckIn } = parsed.data;
    const personalContext = body.personalContext || undefined;

    // 2. Build initial LangGraph Agent State
    const birthProfile = body.birthProfile || {
      id: "mock-birth-profile-id",
      userId: "local-user",
      name: "사용자",
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male" as const,
      calculationPolicy: {
        yearBoundary: "lichun" as const,
        monthBoundary: "solar_terms" as const,
        dayEpoch: "verified_jdn_epoch" as const,
        hourPolicy: "standard_2h" as const,
        nightZiPolicy: "disabled" as const,
        trueSolarTime: false,
        majorLuckDirectionRule: "gender_yinyang_year_stem" as const,
        majorLuckStartRule: "days_to_jieqi_divide_by_3" as const,
        policyName: "standard_kr" as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parsedVibe = vibeCheckIn ? {
      id: crypto.randomUUID(),
      userId: "local-user",
      valence: vibeCheckIn.valence ?? 5,
      arousal: vibeCheckIn.arousal ?? 5,
      energy: vibeCheckIn.energy ?? 5,
      focus: vibeCheckIn.focus ?? 5,
      socialLoad: vibeCheckIn.socialLoad ?? 5,
      sleepHours: vibeCheckIn.sleepHours,
      oneLineEvent: vibeCheckIn.oneLineEvent,
      createdAt: new Date().toISOString(),
    } : undefined;

    const initialState: VibeFortuneAgentState = {
      userId,
      requestId: crypto.randomUUID(),
      input: {
        forecastScope: "monthly",
        targetDate: targetMonth + "-01",
        vibeCheckIn: vibeCheckIn,
        currentFocus: currentFocus[0],
        providedChart: body.providedChart,
        timezone: "Asia/Seoul",
        userMessage: userMessage,
      },
      birthProfile,
      vibeCheckIn: parsedVibe,
      personalContext,
      safetyFlags: [],
      warnings: [],
      errors: [],
      runtime: {
        provider: "mock",
        startedAt: new Date().toISOString(),
        nodeHistory: [],
        retryCount: 0,
      },
    };

    // 3. Trigger LangGraph workflow!
    const finalState = await runAgentWorkflow(initialState);

    // 4. Determine status based on safety and errors
    let status: "ok" | "blocked" | "onboarding_required" | "partial" = "ok";
    if (finalState.errors && finalState.errors.some(e => e.code === "SAFETY_BLOCKED")) {
      status = "blocked";
    } else if (finalState.errors && finalState.errors.some(e => e.code === "MISSING_BIRTH_PROFILE")) {
      status = "onboarding_required";
    } else if (finalState.errors && finalState.errors.length > 0) {
      status = "partial";
    }

    // 5. Calculate deterministic 4-week breakdown
    const WEEK_LABELS = ["1주차", "2주차", "3주차", "4주차"];
    let weeklyBreakdown: {
      weekLabel: string;
      dominantElement: FiveElement;
      elementEmoji: string;
      theme: string;
      strategy: string;
      domains: { key: DomainKey; label: string; energy: "high" | "medium" | "low" }[];
    }[] = [];

    try {
      const [yearStr, monthStr] = targetMonth.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      for (let w = 0; w < 4; w++) {
        const midpointDate = getWeekMidpointDate(year, month, w);
        const dailyLuck = calculateDailyLuckRange({
          from: midpointDate,
          to: midpointDate,
          timezone: "Asia/Seoul",
        });

        const stem = dailyLuck.days[0]?.pillar.stem as HeavenlyStem;
        const element: FiveElement = stem ? STEM_ELEMENTS[stem] : "earth";

        weeklyBreakdown.push({
          weekLabel: WEEK_LABELS[w],
          dominantElement: element,
          elementEmoji: ELEMENT_EMOJI[element],
          theme: ELEMENT_THEME[element],
          strategy: ELEMENT_STRATEGY[element],
          domains: DOMAINS.map(dk => ({
            key: dk,
            label: DOMAIN_LABELS[dk],
            energy: DOMAIN_ELEMENT_AFFINITY[dk][element],
          })),
        });
      }
    } catch {
      // If weekly breakdown calculation fails, return empty array (non-blocking)
    }

    return NextResponse.json({
      status,
      forecastOutput: finalState.finalOutput,
      richOutput: finalState.richOutput || {},
      estimatedVibe: finalState.estimatedVibe,
      weeklyBreakdown,
      warnings: finalState.warnings,
      safetyFlags: finalState.safetyFlags,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "partial",
        warnings: [
          {
            code: "POLICY_VARIANT_MAY_DIFFER",
            message: "서버 오류로 인해 분석이 비정상 종료되었습니다: " + err.message,
            node: "API_Route",
            userVisible: true,
          },
        ],
        safetyFlags: [],
      },
      { status: 500 }
    );
  }
}


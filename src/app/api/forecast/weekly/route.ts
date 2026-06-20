import { NextResponse } from "next/server";
import { runAgentWorkflow } from "@/lib/agent/graph";
import { WeeklyForecastRequestSchema } from "@/schemas/api-contracts.schema";
import { VibeFortuneAgentState } from "@/lib/agent/state";
import { createClient } from "@/lib/supabase/server";
import { calculateDailyLuckRange, calculateChart } from "@/lib/manse";
import { STEM_ELEMENTS, type HeavenlyStem } from "@/lib/manse/constants";

// ── Element interaction helpers (deterministic, no LLM) ──

type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

/** 상생 cycle: wood→fire→earth→metal→water→wood */
const GENERATING: Record<FiveElement, FiveElement> = {
  wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood",
};

/** 상극 cycle: wood→earth→water→fire→metal→wood */
const OVERCOMING: Record<FiveElement, FiveElement> = {
  wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood",
};

function getEnergyLevel(dayMasterElement: FiveElement, dayElement: FiveElement): "high" | "medium" | "low" {
  if (dayMasterElement === dayElement) return "medium"; // 비화
  if (GENERATING[dayMasterElement] === dayElement || GENERATING[dayElement] === dayMasterElement) return "high"; // 상생
  return "low"; // 상극
}

const ELEMENT_EMOJI: Record<FiveElement, string> = {
  wood: "🌿", fire: "🔥", earth: "⛰️", metal: "⚙️", water: "💧",
};

const ELEMENT_FOCUS: Record<FiveElement, string> = {
  wood: "성장·학습", fire: "표현·네트워킹", earth: "안정·실행",
  metal: "정리·마감", water: "회복·전략",
};

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ─────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : "local-user";

    const body = await request.json();
    
    // 1. Validate request with Zod
    const parsed = WeeklyForecastRequestSchema.safeParse(body);
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

    const { targetWeekStart, currentFocus, userMessage, vibeCheckIn } = parsed.data;
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
        forecastScope: "weekly",
        targetDate: targetWeekStart,
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

    // 5. Calculate deterministic 7-day dailyRhythm (일진 기반)
    const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
    let dailyRhythm: {
      date: string;
      dayLabel: string;
      stem: string;
      branch: string;
      element: FiveElement;
      elementEmoji: string;
      energyLevel: "high" | "medium" | "low";
      focusArea: string;
    }[] = [];

    try {
      // Determine dayMaster element from birth chart
      const chart = calculateChart({
        birthDateTime: birthProfile.birthDateTime,
        timezone: birthProfile.timezone || "Asia/Seoul",
        gender: birthProfile.gender,
      });
      const dayMasterElement = chart.dayMaster.element;

      // Get Monday–Sunday of the target week
      const monday = getMonday(targetWeekStart);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const dailyLuck = calculateDailyLuckRange({
        from: toDateStr(monday),
        to: toDateStr(sunday),
        timezone: "Asia/Seoul",
      });

      dailyRhythm = dailyLuck.days.map((d, i) => {
        const stem = d.pillar.stem as HeavenlyStem;
        const element = STEM_ELEMENTS[stem];
        return {
          date: d.date,
          dayLabel: DAY_LABELS[i] || "",
          stem: d.pillar.stem,
          branch: d.pillar.branch,
          element,
          elementEmoji: ELEMENT_EMOJI[element],
          energyLevel: getEnergyLevel(dayMasterElement, element),
          focusArea: ELEMENT_FOCUS[element],
        };
      });
    } catch {
      // If daily rhythm calculation fails, return empty array (non-blocking)
    }

    return NextResponse.json({
      status,
      forecastOutput: finalState.finalOutput,
      richOutput: finalState.richOutput || {},
      estimatedVibe: finalState.estimatedVibe,
      dailyRhythm,
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

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

    // 2. Resolve BirthProfile (request body -> Supabase DB -> demo fallback unless disabled)
    let birthProfile = body.birthProfile;
    if (!birthProfile && user?.id) {
      try {
        const { data: bpData } = await supabase
          .from("birth_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (bpData) {
          birthProfile = {
            id: bpData.id,
            userId: bpData.user_id,
            name: bpData.name || "사용자",
            birthDateTime: bpData.birth_datetime_utc || "1990-05-01T14:30:00+09:00",
            timezone: bpData.birth_timezone || "Asia/Seoul",
            gender: bpData.gender || "male",
            calculationPolicy: bpData.calculation_policy_json || {
              yearBoundary: "lichun",
              monthBoundary: "solar_terms",
              dayEpoch: "verified_jdn_epoch",
              hourPolicy: "standard_2h",
              nightZiPolicy: "disabled",
              trueSolarTime: false,
              majorLuckDirectionRule: "gender_yinyang_year_stem",
              majorLuckStartRule: "days_to_jieqi_divide_by_3",
              policyName: "standard_kr",
            },
            createdAt: bpData.created_at,
            updatedAt: bpData.updated_at || bpData.created_at,
          };
        }
      } catch {
        // Ignore DB lookup errors and fall back
      }
    }

    if (!birthProfile && body.allowDemoFallback !== false) {
      birthProfile = {
        id: "mock-birth-profile-id",
        userId,
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
    }

    const parsedVibe = vibeCheckIn ? {
      id: crypto.randomUUID(),
      userId,
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
        focusAxes: currentFocus,
        providedChart: body.providedChart,
        timezone: birthProfile?.timezone || "Asia/Seoul",
        userMessage: userMessage,
      },
      birthProfile,
      vibeCheckIn: parsedVibe,
      recentRunReceipts: Array.isArray(body.recentRunReceipts) ? body.recentRunReceipts : undefined,
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
      const activeProfile = finalState.birthProfile || birthProfile;
      if (activeProfile) {
        // Determine dayMaster element from birth chart
        const chart = finalState.chart || calculateChart({
          birthDateTime: activeProfile.birthDateTime,
          timezone: activeProfile.timezone || "Asia/Seoul",
          gender: activeProfile.gender,
        });
        const dayMasterElement = chart.dayMaster.element;

        // Get Monday–Sunday of the target week
        const monday = getMonday(targetWeekStart);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);

        const dailyLuck = calculateDailyLuckRange({
          from: toDateStr(monday),
          to: toDateStr(sunday),
          timezone: activeProfile.timezone || "Asia/Seoul",
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
      }
    } catch {
      // If daily rhythm calculation fails, return empty array (non-blocking)
    }

    const receipts = finalState.recentRunReceipts || [];
    const completedCount = receipts.filter(
      r => r.whatIDid && r.whatIDid.trim().length > 0 && r.whatIDid !== "N/A"
    ).length;
    const deferredCount = receipts.filter(
      r => r.whatIDeferred && r.whatIDeferred.trim().length > 0 && r.whatIDeferred !== "N/A"
    ).length;
    const runReceiptSummary = {
      completedCount,
      deferredCount,
      repeatedPatterns:
        (finalState.finalOutput?.outputJson as any)?.runReceiptSummary?.repeatedPatterns?.length > 0
          ? (finalState.finalOutput?.outputJson as any).runReceiptSummary.repeatedPatterns
          : deferredCount > completedCount
          ? ["미완료 액션 누적 패턴 감지 — 범위 축소 필요"]
          : ["꾸준한 실행 리듬 유지 중"],
    };

    const oj = (finalState.finalOutput?.outputJson || {}) as Record<string, any>;
    const weeklyReview = {
      weekRange: oj.weekRange || { from: targetWeekStart, to: targetWeekStart },
      oneLineConclusion: oj.oneLineConclusion || oj.summary || "",
      weeklyCoreConcept: oj.weeklyCoreConcept || `${currentFocus[0]}.consolidation`,
      weeklyPrimaryGap: oj.weeklyPrimaryGap || "핵심 실행 범위와 검증 기준 구체화 필요",
      weeklyEvidenceTarget: oj.weeklyEvidenceTarget || "핵심 과제 완료 기록 및 정량적 근거 2건 확보",
      weeklyBoundaryTarget: oj.weeklyBoundaryTarget || "야간 의사결정 보류 및 과도한 범위 확장 제한",
      weeklyConversionTarget: oj.weeklyConversionTarget || "아이디어를 단일 실행 과제로 전환",
      recompositionGoal: oj.recompositionGoal || "보류했던 의사결정 중 핵심 1가지를 완결하고 나머지는 과감히 축소하기",
      riskTrajectory: oj.riskTrajectory || [],
      runReceiptSummary,
      actionPolicy: finalState.actionPolicy || oj.actionPolicy,
    };

    const outputJson = finalState.finalOutput?.outputJson
      ? {
          ...finalState.finalOutput.outputJson,
          ...weeklyReview,
        }
      : weeklyReview;

    const forecastOutput = finalState.finalOutput
      ? {
          ...weeklyReview,
          ...finalState.finalOutput,
          outputJson,
          runReceiptSummary,
        }
      : undefined;

    return NextResponse.json({
      status,
      forecastOutput,
      weeklyReview,
      runReceiptSummary,
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

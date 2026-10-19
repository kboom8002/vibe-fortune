import { NextResponse } from "next/server";
import { runAgentWorkflow } from "@/lib/agent/graph";
import { DailyForecastRequestSchema } from "@/schemas/api-contracts.schema";
import { VibeFortuneAgentState } from "@/lib/agent/state";
import { loadPrompt, getPromptVersions } from "@/lib/prompt-registry";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_CALCULATION_POLICY = {
  yearBoundary: "lichun" as const,
  monthBoundary: "solar_terms" as const,
  dayEpoch: "verified_jdn_epoch" as const,
  hourPolicy: "standard_2h" as const,
  nightZiPolicy: "disabled" as const,
  trueSolarTime: false,
  majorLuckDirectionRule: "gender_yinyang_year_stem" as const,
  majorLuckStartRule: "days_to_jieqi_divide_by_3" as const,
  policyName: "standard_kr" as const,
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : "local-user";

    const body = await request.json();
    
    // 1. Validate request with Zod
    const parsed = DailyForecastRequestSchema.safeParse(body);
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

    const { targetDate, currentFocus, userMessage, vibeCheckIn } = parsed.data;
    const personalContext = body.personalContext || undefined;

    // 2. Build initial LangGraph Agent State
    // If birthProfile is provided in request, normalize it; otherwise if user is logged in,
    // let LoadUserContextNode load birth_profiles from DB (or check DB first).
    // Only fall back to default demo birthProfile if neither DB nor request has one AND allowDemoFallback !== false.
    let birthProfile = body.birthProfile
      ? {
          id: body.birthProfile.id || "mock-birth-profile-id",
          userId: body.birthProfile.userId || userId,
          name: body.birthProfile.name || "사용자",
          birthDateTime: body.birthProfile.birthDateTime || "1990-05-01T14:30:00+09:00",
          timezone: body.birthProfile.timezone || "Asia/Seoul",
          gender: (body.birthProfile.gender || "male") as any,
          birthLocation: body.birthProfile.birthLocation,
          providedChart: body.birthProfile.providedChart || body.providedChart,
          calculationPolicy: body.birthProfile.calculationPolicy || DEFAULT_CALCULATION_POLICY,
          createdAt: body.birthProfile.createdAt || new Date().toISOString(),
          updatedAt: body.birthProfile.updatedAt || new Date().toISOString(),
        }
      : undefined;

    if (!birthProfile && user) {
      try {
        const { data: bp } = await supabase
          .from("birth_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (bp) {
          birthProfile = {
            id: bp.id,
            userId: bp.user_id,
            name: bp.name,
            birthDateTime: bp.birth_datetime,
            timezone: bp.timezone,
            gender: bp.gender as any,
            birthLocation: bp.birth_location || undefined,
            providedChart: bp.provided_chart || body.providedChart || undefined,
            calculationPolicy: bp.calculation_policy || DEFAULT_CALCULATION_POLICY,
            createdAt: bp.created_at,
            updatedAt: bp.updated_at,
          };
        }
      } catch {
        // Ignore DB lookup error here; LoadUserContextNode or demo fallback will handle
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
        birthLocation: undefined,
        providedChart: body.providedChart,
        calculationPolicy: DEFAULT_CALCULATION_POLICY,
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

    const recentRunReceipts = Array.isArray(body.recentRunReceipts)
      ? body.recentRunReceipts.map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          userId: r.userId || userId,
          forecastOutputId: r.forecastOutputId || "local-forecast",
          whatIDid: r.whatIDid || "",
          whyIChoseIt: r.whyIChoseIt || "N/A",
          whatAIHelped: r.whatAIHelped || "N/A",
          myJudgment: r.myJudgment || "N/A",
          whatIDeferred: r.whatIDeferred,
          whatILearned: r.whatILearned,
          nextAction: r.nextAction,
          createdAt: r.createdAt || new Date().toISOString(),
        }))
      : undefined;

    const initialState: VibeFortuneAgentState = {
      userId,
      requestId: crypto.randomUUID(),
      input: {
        forecastScope: "daily",
        targetDate,
        vibeCheckIn: vibeCheckIn,
        currentFocus: currentFocus[0],
        focusAxes: currentFocus,
        userMessage,
        providedChart: body.providedChart,
        timezone: birthProfile?.timezone || "Asia/Seoul",
      },
      birthProfile,
      vibeCheckIn: parsedVibe,
      recentRunReceipts,
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

    // 3. Load prompts via versioned registry
    loadPrompt('system');
    loadPrompt('forecast_writer');

    // 4. Trigger LangGraph workflow!
    const finalState = await runAgentWorkflow(initialState);

    // 5. Determine status based on safety and errors
    let status: "ok" | "blocked" | "onboarding_required" | "partial" = "ok";
    if (finalState.errors && finalState.errors.some(e => e.code === "SAFETY_BLOCKED")) {
      status = "blocked";
    } else if (finalState.errors && finalState.errors.some(e => e.code === "MISSING_BIRTH_PROFILE")) {
      status = "onboarding_required";
    } else if (finalState.errors && finalState.errors.length > 0) {
      status = "partial";
    }

    return NextResponse.json({
      status,
      forecastOutput: finalState.finalOutput,
      richOutput: finalState.richOutput || {},
      estimatedVibe: finalState.estimatedVibe,
      riskVector: finalState.riskVector,
      actionPolicy: finalState.actionPolicy,
      chart: finalState.chart,
      majorLuck: finalState.majorLuck,
      annualLuck: finalState.annualLuck,
      chartConsistency: finalState.chartConsistency,
      warnings: finalState.warnings,
      safetyFlags: finalState.safetyFlags,
      promptVersions: getPromptVersions(),
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

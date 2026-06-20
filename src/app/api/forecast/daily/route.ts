import { NextResponse } from "next/server";
import { runAgentWorkflow } from "@/lib/agent/graph";
import { DailyForecastRequestSchema } from "@/schemas/api-contracts.schema";
import { VibeFortuneAgentState } from "@/lib/agent/state";
import { createClient } from "@/lib/supabase/server";

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

    // 2. Build initial LangGraph Agent State
    // In actual app, we would load the birth profile of the user from database.
    // For MVP local mode, if birthProfile is provided in request or cached, we use it.
    // We construct a mock birth profile if none exists in request to ensure end-to-end execution.
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
        forecastScope: "daily",
        vibeCheckIn: vibeCheckIn,
        currentFocus: currentFocus[0],
        providedChart: body.providedChart,
        timezone: "Asia/Seoul",
      },
      birthProfile,
      vibeCheckIn: parsedVibe,
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

    return NextResponse.json({
      status,
      forecastOutput: finalState.finalOutput,
      estimatedVibe: finalState.estimatedVibe,
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

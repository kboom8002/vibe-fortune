import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateChart, calculateAnnualLuck, calculateAllTenGods } from "@/lib/manse";
import { loadPrompt } from "@/lib/agent/prompt-loader";
import { llmProvider } from "@/lib/llm/provider";
import { checkOutputSafety } from "@/lib/safety";
import { recomposeFromReceipts } from "@/lib/agent/recomposition";
import { WeeklyForecastOutputSchema } from "@/schemas/forecast-output.schema";
import { z } from "zod";

const WeeklyLLMOutputSchema = z.object({
  oneLineConclusion: z.string().describe("주간 한 줄 결론"),
  weeklyCoreConcept: z.string().describe("주간 핵심 컨셉 상태"),
  weeklyPrimaryGap: z.string().describe("주간 주요 갭"),
  weeklyEvidenceTarget: z.string().describe("주간 증거 목표"),
  weeklyBoundaryTarget: z.string().describe("주간 경계선 목표"),
  weeklyConversionTarget: z.string().describe("주간 전환 목표"),
  requiredActions: z.array(z.string()).describe("필수 행동 목록"),
  forbiddenActions: z.array(z.string()).describe("금지 행동 목록"),
  reviewQuestions: z.array(z.string()).describe("점검 질문"),
  recompositionGoal: z.string().describe("리컴포지션 목표"),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { from, to, currentFocus } = body;

    const startDate = from || new Date().toISOString().split("T")[0];
    const endDate = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const focus = currentFocus?.[0] || "business_finance";

    // 1. Fetch birth profile from Supabase
    const { data: bp } = await supabase
      .from("birth_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fetch recent run receipts from Supabase
    const { data: receipts } = await supabase
      .from("run_receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    // 3. Compute Recomposition Context
    const entries = (receipts || []).map(r => ({
      id: r.id,
      date: r.created_at,
      mode: "daily" as const,
      grade: "A",
      requiredActions: [r.what_i_did],
      forbiddenActions: r.what_i_deferred ? [r.what_i_deferred] : [],
      completedActions: [r.what_i_did],
      vibeSnapshot: { valence: 5, arousal: 5, energy: 5, focus: 5, socialLoad: 5 }
    }));

    const recomposed = recomposeFromReceipts(entries);

    // 4. Calculate Manse Chart
    let chartSummary = "사주 데이터 없음";
    if (bp) {
      try {
        const chart = calculateChart({
          birthDateTime: bp.birth_datetime,
          timezone: bp.timezone,
          gender: bp.gender as any,
        });
        const tenGods = calculateAllTenGods(chart);
        const annual = calculateAnnualLuck({ year: new Date().getFullYear() });
        chartSummary = [
          `일간: ${chart.dayMaster.stem}(${chart.dayMaster.element}, ${chart.dayMaster.polarity})`,
          `사주: ${chart.pillars.year.label} ${chart.pillars.month.label} ${chart.pillars.day.label} ${chart.pillars.hour.label}`,
          `십신: ${Object.values(tenGods).join(", ")}`,
          `세운: ${annual.pillar.stem}${annual.pillar.branch}`,
        ].join(" | ");
      } catch { /* fallback */ }
    }

    // 5. Generate Weekly Forecast using LLM with Recomposition context
    let forecastData: z.infer<typeof WeeklyLLMOutputSchema> | null = null;
    try {
      const systemPrompt = loadPrompt("system");
      const forecastPrompt = loadPrompt("forecast_writer");
      const contextMessage = [
        forecastPrompt,
        "",
        "--- 주간 운영 분석 요청 ---",
        `기간: ${startDate} ~ ${endDate}`,
        `집중 분야: ${focus}`,
        `차트: ${chartSummary}`,
        "",
        "--- 과거 실행 분석 피드백 (Recomposition Context) ---",
        `최근 에너지 추세: ${recomposed.recentTrend}`,
        `평균 활력: ${recomposed.averageEnergy}`,
        `행동 완수율: ${recomposed.completionRate}`,
        `최근 반복 패턴: ${recomposed.recurringPatterns.join(", ") || "없음"}`,
        `조정 권장사항: ${recomposed.suggestedAdjustments.join(" | ") || "없음"}`,
        "",
        "위 정보를 바탕으로 주간 운영 리뷰를 JSON으로 생성하세요.",
        "과거 완수율이 낮거나 하향 추세라면, 주간 필수 행동 수를 줄이거나 강도를 낮추어 목표를 정량적으로 조정하세요.",
        "반드시 한국어로 작성하세요.",
      ].join("\n");

      const fallbackOutput = {
        oneLineConclusion: "이번 주는 내실을 단단히 하고 외부 충동을 통제하며 현재 파이프라인의 완성도를 극대화해야 하는 구간입니다.",
        weeklyCoreConcept: "목적지향적 내실 강화 (Consolidation & Refinement)",
        weeklyPrimaryGap: "높은 지적 활력 대비 실천적 완결성 부족",
        weeklyEvidenceTarget: "핵심 마감 과제 2건을 명확한 문서 형태로 완료 처리하기",
        weeklyBoundaryTarget: "계획되지 않은 외부 미팅 주 2회 이하로 차단하기",
        weeklyConversionTarget: "주간 아이디어 발산을 실행 체크리스트 3개로 변환하여 준수하기",
        requiredActions: [
          "주간 마일스톤 핵심 업무 1건 우선 완결",
          "의사결정 시 3분간 심호흡하며 즉흥적 약속 억제",
        ],
        forbiddenActions: [
          "명문화되지 않은 구두 투자 확약 진행",
          "피로 누적 상태에서의 야근",
        ],
        reviewQuestions: [
          "주간 핵심 목표 중 완료 항목이 70% 이상입니까?",
          "충동적 외부 제안을 의식적으로 통제하였습니까?",
        ],
        recompositionGoal: "매일 작성한 행동 일지를 바탕으로 분산된 주의력을 회수합니다.",
      };

      forecastData = await llmProvider.generateStructuredOutput<z.infer<typeof WeeklyLLMOutputSchema>>(
        contextMessage,
        systemPrompt,
        WeeklyLLMOutputSchema,
        fallbackOutput
      );
    } catch (err) {
      console.warn("[Weekly API] LLM call failed:", err);
    }

    const weeklyForecast = {
      id: crypto.randomUUID(),
      userId: user.id,
      mode: "weekly" as const,
      weekRange: { from: startDate, to: endDate },
      oneLineConclusion: forecastData?.oneLineConclusion || "이번 주는 내실을 단단히 하고 외부 충동을 통제하며 현재 파이프라인의 완성도를 극대화해야 하는 구간입니다.",
      weeklyCoreConcept: forecastData?.weeklyCoreConcept || "목적지향적 내실 강화 (Consolidation & Refinement)",
      weeklyPrimaryGap: forecastData?.weeklyPrimaryGap || "높은 지적 활력 대비 실천적 완결성 부족",
      weeklyEvidenceTarget: forecastData?.weeklyEvidenceTarget || "핵심 마감 과제 2건을 명확한 문서 형태로 완료 처리하기",
      weeklyBoundaryTarget: forecastData?.weeklyBoundaryTarget || "계획되지 않은 외부 미팅 주 2회 이하로 차단하기",
      weeklyConversionTarget: forecastData?.weeklyConversionTarget || "주간 아이디어 발산을 실행 체크리스트 3개로 변환하여 준수하기",
      recompositionGoal: forecastData?.recompositionGoal || "매일 작성한 행동 일지를 바탕으로 분산된 주의력을 회수합니다.",
      actionPolicy: {
        requiredActions: forecastData?.requiredActions || [
          "주간 마일스톤 핵심 업무 1건 우선 완결",
          "의사결정 시 3분간 심호흡하며 즉흥적 약속 억제",
        ],
        forbiddenActions: forecastData?.forbiddenActions || [
          "명문화되지 않은 구두 투자 확약 진행",
          "피로 누적 상태에서의 야근",
        ],
        reviewQuestions: forecastData?.reviewQuestions || [
          "주간 핵심 목표 중 완료 항목이 70% 이상입니까?",
          "충동적 외부 제안을 의식적으로 통제하였습니까?",
        ],
      },
      safetyFlags: [] as string[],
      createdAt: new Date().toISOString(),
    };

    // 6. Output Safety review
    const safetyCheck = checkOutputSafety(weeklyForecast.oneLineConclusion);
    if (!safetyCheck.safe) {
      weeklyForecast.safetyFlags = safetyCheck.flags.map(f => f.type);
    }

    // 7. Save to Supabase forecast_outputs
    const { error: saveError } = await supabase
      .from("forecast_outputs")
      .insert({
        id: weeklyForecast.id,
        user_id: user.id,
        forecast_request_id: crypto.randomUUID(), // placeholder since weekly doesn't have request state
        mode: "weekly",
        output_json: weeklyForecast,
        output_markdown: `### ☯ 주간 핵심 분석 결론\n- **결론**: ${weeklyForecast.oneLineConclusion}\n- **핵심 컨셉**: ${weeklyForecast.weeklyCoreConcept}`,
        grade: "A",
        safety_flags: weeklyForecast.safetyFlags,
        created_at: weeklyForecast.createdAt,
      });

    if (saveError) {
      console.error("[Weekly API] Error saving weekly forecast:", saveError);
    }

    // Schema-First Rule: Validate output
    WeeklyForecastOutputSchema.parse(weeklyForecast);

    return NextResponse.json({
      status: "ok",
      forecastOutput: weeklyForecast,
      warnings: [],
      safetyFlags: weeklyForecast.safetyFlags,
    });
  } catch (err: any) {
    console.error("Unhandled error in POST /api/forecast/weekly:", err);
    return NextResponse.json(
      {
        status: "partial",
        warnings: [{
          code: "POLICY_VARIANT_MAY_DIFFER",
          message: "서버 오류로 인해 주간 분석이 실패했습니다: " + err.message,
          node: "Weekly_API",
          userVisible: true,
        }],
        safetyFlags: [],
      },
      { status: 500 }
    );
  }
}

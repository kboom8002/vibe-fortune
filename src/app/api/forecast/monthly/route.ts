import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateChart, calculateAnnualLuck, calculateMonthlyLuck, calculateAllTenGods } from "@/lib/manse";
import { loadPrompt } from "@/lib/agent/prompt-loader";
import { llmProvider } from "@/lib/llm/provider";
import { checkOutputSafety } from "@/lib/safety";
import { recomposeFromReceipts } from "@/lib/agent/recomposition";
import { MonthlyForecastOutputSchema } from "@/schemas/forecast-output.schema";
import { z } from "zod";

const MonthlyLLMOutputSchema = z.object({
  oneLineConclusion: z.string(),
  monthlyConceptPortfolio: z.array(z.string()),
  monthlyRiskPortfolio: z.array(z.string()),
  evidenceTarget: z.array(z.string()),
  boundaryPolicy: z.array(z.string()),
  revenuePolicy: z.array(z.string()),
  relationshipPolicy: z.array(z.string()),
  recoveryPolicy: z.array(z.string()),
  weeklyRecommendations: z.array(z.object({
    week: z.string(),
    policyMode: z.string(),
    recommendedFocus: z.string(),
    forbiddenFocus: z.string(),
  })),
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
    const { month } = body;
    const targetMonth = month || new Date().toISOString().substring(0, 7);
    const [yearStr, monthStr] = targetMonth.split("-");
    const yearNum = parseInt(yearStr);
    const monthNum = parseInt(monthStr);

    // 1. Fetch birth profile from Supabase
    const { data: bp } = await supabase
      .from("birth_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fetch recent run receipts from Supabase (up to 30 for monthly)
    const { data: receipts } = await supabase
      .from("run_receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

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
        const annual = calculateAnnualLuck({ year: yearNum });
        const monthly = calculateMonthlyLuck({ year: yearNum, month: monthNum });
        chartSummary = [
          `일간: ${chart.dayMaster.stem}(${chart.dayMaster.element}, ${chart.dayMaster.polarity})`,
          `사주: ${chart.pillars.year.label} ${chart.pillars.month.label} ${chart.pillars.day.label} ${chart.pillars.hour.label}`,
          `십신: ${Object.values(tenGods).join(", ")}`,
          `세운: ${annual.pillar.stem}${annual.pillar.branch}`,
          `월운: ${monthly.pillar.stem}${monthly.pillar.branch}`,
        ].join(" | ");
      } catch { /* fallback */ }
    }

    // 5. Generate Monthly Forecast using LLM with Recomposition context
    let llmResult: z.infer<typeof MonthlyLLMOutputSchema> | null = null;
    try {
      const systemPrompt = loadPrompt("system");
      const forecastPrompt = loadPrompt("forecast_writer");
      const contextMessage = [
        forecastPrompt,
        "",
        "--- 월간 운영 분석 요청 ---",
        `대상 월: ${targetMonth}`,
        `차트: ${chartSummary}`,
        "",
        "--- 과거 실행 분석 피드백 (Recomposition Context) ---",
        `최근 에너지 추세: ${recomposed.recentTrend}`,
        `평균 활력: ${recomposed.averageEnergy}`,
        `행동 완수율: ${recomposed.completionRate}`,
        `최근 반복 패턴: ${recomposed.recurringPatterns.join(", ") || "없음"}`,
        `조정 권장사항: ${recomposed.suggestedAdjustments.join(" | ") || "없음"}`,
        "",
        "위 정보를 바탕으로 월간 운영 리뷰를 JSON으로 생성하세요.",
        "weeklyRecommendations는 4주차까지 작성하고, policyMode는 'Consolidation', 'Expansion', 'Cleanup' 중 하나를 선택하세요.",
        "반드시 한국어로 작성하세요.",
      ].join("\n");

      const fallbackOutput = {
        oneLineConclusion: "이번 달은 사주 원국의 기류를 동력 삼아 기존 비즈니스 모델의 수익 극대화에 몰두해야 하는 시기입니다.",
        monthlyConceptPortfolio: [
          "목적지향적 내실 강화 (Consolidation & Refinement)",
          "시스템적 효율성 강화 및 자원 재분배",
        ],
        monthlyRiskPortfolio: [
          "잦은 충동적 의사결정으로 인한 리스크 확산 우려",
          "세부 마감 기한 지연에 따른 신뢰도 하락",
        ],
        evidenceTarget: [
          "핵심 파트너와의 계약 조건 정립 및 2건 서면 날인 완료",
          "주말 1일 완전 휴식 보장",
        ],
        boundaryPolicy: [
          "사전 조율되지 않은 1회성 네트워킹 모임 참석 금지",
          "서류 검토 없는 구두 합의 전면 통제",
        ],
        revenuePolicy: [
          "신규 서비스보다 기존 유료 고객 Retention 개선에 집중",
        ],
        relationshipPolicy: [
          "비즈니스 미팅 시 조율과 청취 위주 태도 견지",
        ],
        recoveryPolicy: [
          "매주 수요일 저녁 가벼운 산책이나 명상",
        ],
        weeklyRecommendations: [
          { week: "1주차", policyMode: "Consolidation", recommendedFocus: "기존 고객 피드백 수집 및 핵심 파이프라인 정리", forbiddenFocus: "새로운 무리한 투자나 대규모 마케팅 기획" },
          { week: "2주차", policyMode: "Consolidation", recommendedFocus: "계약서 명문화 및 재정 잔고 실사", forbiddenFocus: "구두 합의 기반 선결제 처리" },
          { week: "3주차", policyMode: "Expansion", recommendedFocus: "조율된 계약 건 마감 및 기존 제품 점진적 개편", forbiddenFocus: "업무 외 무작위 미팅 수락" },
          { week: "4주차", policyMode: "Cleanup", recommendedFocus: "주간 성과 및 완결성 검증, 데이터 백업", forbiddenFocus: "피로 극한 상태에서 고강도 야근" },
        ],
      };

      llmResult = await llmProvider.generateStructuredOutput<z.infer<typeof MonthlyLLMOutputSchema>>(
        contextMessage,
        systemPrompt,
        MonthlyLLMOutputSchema,
        fallbackOutput
      );
    } catch (err) {
      console.warn("[Monthly API] LLM call failed:", err);
    }

    const weeks = llmResult?.weeklyRecommendations || [
      { week: "1주차", policyMode: "Consolidation", recommendedFocus: "기존 고객 피드백 수집 및 핵심 파이프라인 정리", forbiddenFocus: "새로운 무리한 투자나 대규모 마케팅 기획" },
      { week: "2주차", policyMode: "Consolidation", recommendedFocus: "계약서 명문화 및 재정 잔고 실사", forbiddenFocus: "구두 합의 기반 선결제 처리" },
      { week: "3주차", policyMode: "Expansion", recommendedFocus: "조율된 계약 건 마감 및 기존 제품 점진적 개편", forbiddenFocus: "업무 외 무작위 미팅 수락" },
      { week: "4주차", policyMode: "Cleanup", recommendedFocus: "주간 성과 및 완결성 검증, 데이터 백업", forbiddenFocus: "피로 극한 상태에서 고강도 야근" },
    ];

    const monthlyForecast = {
      id: crypto.randomUUID(),
      userId: user.id,
      mode: "monthly" as const,
      month: targetMonth,
      oneLineConclusion: llmResult?.oneLineConclusion || "이번 달은 사주 원국의 기류를 동력 삼아 기존 비즈니스 모델의 수익 극대화에 몰두해야 하는 시기입니다.",
      monthlyConceptPortfolio: llmResult?.monthlyConceptPortfolio || [
        "목적지향적 내실 강화 (Consolidation & Refinement)",
        "시스템적 효율성 강화 및 자원 재분배",
      ],
      monthlyRiskPortfolio: llmResult?.monthlyRiskPortfolio || [
        "잦은 충동적 의사결정으로 인한 리스크 확산 우려",
        "세부 마감 기한 지연에 따른 신뢰도 하락",
      ],
      evidenceTarget: llmResult?.evidenceTarget || [
        "핵심 파트너와의 계약 조건 정립 및 2건 서면 날인 완료",
        "주말 1일 완전 휴식 보장",
      ],
      boundaryPolicy: llmResult?.boundaryPolicy || [
        "사전 조율되지 않은 1회성 네트워킹 모임 참석 금지",
        "서류 검토 없는 구두 합의 전면 통제",
      ],
      revenuePolicy: llmResult?.revenuePolicy || [
        "신규 서비스보다 기존 유료 고객 Retention 개선에 집중",
      ],
      relationshipPolicy: llmResult?.relationshipPolicy || [
        "비즈니스 미팅 시 조율과 청취 위주 태도 견지",
      ],
      recoveryPolicy: llmResult?.recoveryPolicy || [
        "매주 수요일 저녁 가벼운 산책이나 명상",
      ],
      monthlyActionCalendar: weeks.map((w, i) => ({
        week: w.week || `${i + 1}주차`,
        policyMode: (w.policyMode === "Consolidation" || w.policyMode === "Expansion" || w.policyMode === "Cleanup") ? w.policyMode : "Consolidation" as const,
        recommendedFocus: w.recommendedFocus,
        forbiddenFocus: w.forbiddenFocus,
      })),
      safetyFlags: [] as string[],
      createdAt: new Date().toISOString(),
    };

    // 6. Output Safety review
    const safetyCheck = checkOutputSafety(monthlyForecast.oneLineConclusion);
    if (!safetyCheck.safe) {
      monthlyForecast.safetyFlags = safetyCheck.flags.map(f => f.type);
    }

    // 7. Save to Supabase forecast_outputs
    const { error: saveError } = await supabase
      .from("forecast_outputs")
      .insert({
        id: monthlyForecast.id,
        user_id: user.id,
        forecast_request_id: crypto.randomUUID(), // placeholder
        mode: "monthly",
        output_json: monthlyForecast,
        output_markdown: `### ☯ 월간 핵심 분석 결론\n- **결론**: ${monthlyForecast.oneLineConclusion}`,
        grade: "A",
        safety_flags: monthlyForecast.safetyFlags,
        created_at: monthlyForecast.createdAt,
      });

    if (saveError) {
      console.error("[Monthly API] Error saving monthly forecast:", saveError);
    }

    // Schema-First Rule: Validate output
    MonthlyForecastOutputSchema.parse(monthlyForecast);

    return NextResponse.json({
      status: "ok",
      forecastOutput: monthlyForecast,
      warnings: [],
      safetyFlags: monthlyForecast.safetyFlags,
    });
  } catch (err: any) {
    console.error("Unhandled error in POST /api/forecast/monthly:", err);
    return NextResponse.json(
      {
        status: "partial",
        warnings: [{
          code: "POLICY_VARIANT_MAY_DIFFER",
          message: "서버 오류로 인해 월간 분석이 실패했습니다: " + err.message,
          node: "Monthly_API",
          userVisible: true,
        }],
        safetyFlags: [],
      },
      { status: 500 }
    );
  }
}

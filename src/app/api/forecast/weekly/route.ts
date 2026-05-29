import { NextResponse } from "next/server";
import { calculateChart } from "@/lib/manse";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, to, currentFocus } = body;

    const startDate = from || new Date().toISOString().split("T")[0];
    const endDate = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const focus = currentFocus && currentFocus[0] ? currentFocus[0] : "business_finance";

    // Standardized Premium Weekly Forecast Output
    const weeklyForecast = {
      id: crypto.randomUUID(),
      mode: "weekly" as const,
      weekRange: { from: startDate, to: endDate },
      oneLineConclusion: "이번 주는 내실을 단단히 하고 외부 충동을 통제하며 현재 파이프라인의 완성도를 극대화해야 하는 구간입니다.",
      weeklyCoreConcept: "목적지향적 내실 강화 (Consolidation & Refinement)",
      weeklyPrimaryGap: "높은 지적 활력 대비 실천적 완결성 부족 (High valence vs Lower complete execution)",
      weeklyEvidenceTarget: "핵심 마감 과제 2건을 명확한 문서 형태로 완료 처리하기",
      weeklyBoundaryTarget: "계획되지 않은 외부 미팅 및 커피 챗 주 2회 이하로 차단하기",
      weeklyConversionTarget: "주간 아이디어 발산을 실행 체크리스트 3개로 변환하여 준수하기",
      riskTrajectory: [
        { date: startDate, primaryRisk: "overextension", riskLevel: "medium" },
        { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], primaryRisk: "burnout", riskLevel: "low" },
        { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], primaryRisk: "relationshipDryness", riskLevel: "low" },
        { date: endDate, primaryRisk: "overextension", riskLevel: "medium" },
      ],
      recompositionGoal: "매일 작성한 행동 일지(Run-Receipt)를 바탕으로 분산된 주의력을 회수하고 완급조절 능력을 배양합니다.",
      actionPolicy: {
        requiredActions: [
          "주간 마일스톤에 정의된 핵심 개발 업무 1건 우선 완결",
          "의사결정 시 3분간 심호흡하며 즉흥적인 약속 억제",
          "체력 및 뇌 건강 유지를 위한 하루 7시간 수면 사수",
        ],
        forbiddenActions: [
          "구체적이고 명문화된 계약서 없는 구두 투자 확약이나 계약 진행",
          "피로가 누적된 상태에서의 고농도 카페인 의존 야근 지속",
        ],
        reviewQuestions: [
          "주간 핵심 목표 중 완료 처리된 항목이 70% 이상입니까?",
          "충동적인 외부 제안이나 미팅을 의식적으로 통제하였습니까?",
        ],
      },
      runReceiptSummary: "지난 주간에는 높은 에너지 지수 속에서도 잦은 즉흥적 미팅으로 마감 시간이 지연되는 패턴이 관찰되었습니다.",
      safetyFlags: [] as string[],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "ok",
      forecastOutput: weeklyForecast,
      warnings: [],
      safetyFlags: [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "partial",
        warnings: [
          {
            code: "POLICY_VARIANT_MAY_DIFFER",
            message: "서버 오류로 인해 주간 분석이 실패했습니다: " + err.message,
            node: "Weekly_API",
            userVisible: true,
          },
        ],
        safetyFlags: [],
      },
      { status: 500 }
    );
  }
}

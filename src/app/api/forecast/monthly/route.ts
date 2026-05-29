import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month } = body;

    const targetMonth = month || new Date().toISOString().substring(0, 7); // e.g. "2026-05"

    const monthlyForecast = {
      id: crypto.randomUUID(),
      mode: "monthly" as const,
      month: targetMonth,
      oneLineConclusion: "이번 달은 사주 원국의 풍요로운 토(土) 기류와 현재의 집중 상태를 동력 삼아, 신규 확장보다는 기존 비즈니스 모델의 수익 극대화에 몰두해야 하는 시기입니다.",
      monthlyConceptPortfolio: [
        "목적지향적 내실 강화 (Consolidation & Refinement)",
        "시스템적 효율성 강화 및 자원 재분배 (Efficiency Systemization)",
        "정밀 점검을 통한 리스크 관리 체제 구축 (Strict Verification)",
      ],
      monthlyRiskPortfolio: [
        "잦은 충동적 의사결정으로 인한 리스크 확산 우려 (Overextension Risk)",
        "세부 마감 기한 지연에 따른 신뢰도 하락 (Scope Leak Warning)",
        "누적된 감정적 소모로 인한 피로도 증가 (Arousal Fluctuations)",
      ],
      evidenceTarget: [
        "핵심 파트너와의 비즈니스 계약 조건 정립 및 2건 서면 날인 완료",
        "생산성 유지 및 번아웃 방지를 위해 주말 1일 무가동 완전 휴식 보장",
        "기록된 Run-Receipt를 기반으로 한 주간 행동 완결률 80% 달성",
      ],
      boundaryPolicy: [
        "사전 조율되지 않은 1회성 네트워킹 모임 및 외부 이벤트 참석 금지",
        "서류 검토 없는 선구두 합의 및 투자 자금 임의 집행 전면 통제",
      ],
      revenuePolicy: [
        "신규 서비스 출시보다는 기존 유료 고객의 재결제 및 Retention 개선에 집중",
        "단기 프로젝트 계약 시 현금 흐름 확보를 위해 선금 비중 50% 이상 협의",
      ],
      relationshipPolicy: [
        "비즈니스 미팅 시 과도한 주장보다는 조율과 청취 위주의 온화한 태도 견지",
        "지인과의 사적 분쟁 발생 시 즉각적 대화 대신 1일 냉각기 확보 후 소통",
      ],
      recoveryPolicy: [
        "매주 수요일 저녁 가벼운 산책이나 명상을 통해 정신적 피로 완전 정화",
        "수면 시간 평균 7시간 이하로 떨어질 시 카페인 음료 섭취 즉시 차단",
      ],
      monthlyActionCalendar: [
        {
          week: "1주차",
          policyMode: "Consolidation" as const,
          recommendedFocus: "기존 고객 피드백 수집 및 핵심 파이프라인 정리",
          forbiddenFocus: "새로운 무리한 투자나 대규모 마케팅 캠페인 기획",
        },
        {
          week: "2주차",
          policyMode: "Consolidation" as const,
          recommendedFocus: "계약서 명문화 및 재정 잔고 실사",
          forbiddenFocus: "구두 합의를 기반으로 한 선결제 처리 및 업무 시작",
        },
        {
          week: "3주차",
          policyMode: "Expansion" as const,
          recommendedFocus: "조율된 계약 건 마감 및 기존 제품의 점진적 개편",
          forbiddenFocus: "업무 영역 외 무작위 미팅 및 커피 챗 수락",
        },
        {
          week: "4주차",
          policyMode: "Cleanup" as const,
          recommendedFocus: "주간 성과 및 완결성 검증, 데이터 백업 및 청소",
          forbiddenFocus: "피로도가 극에 달한 상태에서 고강도 야근 감행",
        },
      ],
      safetyFlags: [] as string[],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "ok",
      forecastOutput: monthlyForecast,
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
            message: "서버 오류로 인해 월간 분석이 실패했습니다: " + err.message,
            node: "Monthly_API",
            userVisible: true,
          },
        ],
        safetyFlags: [],
      },
      { status: 500 }
    );
  }
}

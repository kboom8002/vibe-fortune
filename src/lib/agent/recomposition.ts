/**
 * RunReceipt 리컴포지션 (docs/12)
 * 
 * 과거 실행 기록(RunReceipt)을 기반으로 다음 세션의 컨텍스트를 재구성합니다.
 * - 최근 N일간의 실행 기록 요약
 * - 패턴 감지 (반복되는 필수/금지 행동)
 * - 누적 컨디션 추세
 */

export type RunReceiptEntry = {
  id: string;
  date: string;
  mode: "daily" | "weekly" | "monthly";
  grade: string;
  requiredActions: string[];
  forbiddenActions: string[];
  completedActions: string[];
  reflectionNote?: string;
  vibeSnapshot: {
    valence: number;
    arousal: number;
    energy: number;
    focus: number;
    socialLoad: number;
  };
};

export type RecompositionContext = {
  recentTrend: "improving" | "declining" | "stable";
  averageEnergy: number;
  averageFocus: number;
  averageValence: number;
  recurringPatterns: string[];
  completionRate: number;
  suggestedAdjustments: string[];
  daysSinceLastCheckin: number;
};

/**
 * 최근 N개의 RunReceipt로 재구성 컨텍스트를 생성합니다.
 */
export function recomposeFromReceipts(
  receipts: RunReceiptEntry[],
  maxEntries: number = 7
): RecompositionContext {
  if (receipts.length === 0) {
    return {
      recentTrend: "stable",
      averageEnergy: 5,
      averageFocus: 5,
      averageValence: 5,
      recurringPatterns: [],
      completionRate: 0,
      suggestedAdjustments: ["첫 체크인을 시작해 보세요."],
      daysSinceLastCheckin: 999,
    };
  }

  const recent = receipts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxEntries);

  // 평균 바이브
  const avgEnergy = recent.reduce((s, r) => s + r.vibeSnapshot.energy, 0) / recent.length;
  const avgFocus = recent.reduce((s, r) => s + r.vibeSnapshot.focus, 0) / recent.length;
  const avgValence = recent.reduce((s, r) => s + r.vibeSnapshot.valence, 0) / recent.length;

  // 추세 감지
  let recentTrend: "improving" | "declining" | "stable" = "stable";
  if (recent.length >= 3) {
    const firstHalf = recent.slice(Math.floor(recent.length / 2));
    const secondHalf = recent.slice(0, Math.floor(recent.length / 2));
    const firstAvg = firstHalf.reduce((s, r) => s + r.vibeSnapshot.energy + r.vibeSnapshot.focus, 0) / (firstHalf.length * 2);
    const secondAvg = secondHalf.reduce((s, r) => s + r.vibeSnapshot.energy + r.vibeSnapshot.focus, 0) / (secondHalf.length * 2);
    if (secondAvg - firstAvg > 1) recentTrend = "improving";
    else if (firstAvg - secondAvg > 1) recentTrend = "declining";
  }

  // 반복 패턴 감지
  const actionCounts: Record<string, number> = {};
  recent.forEach(r => {
    r.requiredActions.forEach(a => {
      actionCounts[a] = (actionCounts[a] || 0) + 1;
    });
  });
  const recurringPatterns = Object.entries(actionCounts)
    .filter(([, count]) => count >= 3)
    .map(([action]) => action);

  // 완수율
  const totalRequired = recent.reduce((s, r) => s + r.requiredActions.length, 0);
  const totalCompleted = recent.reduce((s, r) => s + r.completedActions.length, 0);
  const completionRate = totalRequired > 0 ? totalCompleted / totalRequired : 0;

  // 조정 제안
  const suggestedAdjustments: string[] = [];
  if (avgEnergy < 4) suggestedAdjustments.push("최근 활력이 낮습니다. 수면과 휴식 시간을 늘려 보세요.");
  if (avgFocus < 4) suggestedAdjustments.push("집중력이 떨어지고 있습니다. 환경 정리와 단일 과제 집중을 시도해 보세요.");
  if (completionRate < 0.5) suggestedAdjustments.push("행동 완수율이 50% 미만입니다. 목표를 축소하고 확실히 달성 가능한 수준으로 조정하세요.");
  if (recentTrend === "declining") suggestedAdjustments.push("전반적으로 하향 추세입니다. 오늘은 정리와 점검에 집중하세요.");

  // 마지막 체크인 이후 경과일
  const lastDate = new Date(recent[0].date);
  const daysSinceLastCheckin = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    recentTrend,
    averageEnergy: Math.round(avgEnergy * 10) / 10,
    averageFocus: Math.round(avgFocus * 10) / 10,
    averageValence: Math.round(avgValence * 10) / 10,
    recurringPatterns,
    completionRate: Math.round(completionRate * 100) / 100,
    suggestedAdjustments,
    daysSinceLastCheckin,
  };
}

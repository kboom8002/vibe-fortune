/**
 * RAG Context Builder (Phase 2)
 *
 * Aggregates historical user data — recent forecasts, vibe check-in patterns,
 * and run receipt insights — into a structured RAGContext that can be injected
 * into forecast generation prompts for continuity and personalisation.
 *
 * Works with both localStorage data (client-side) and database data (server-side)
 * by accepting plain objects as input.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RAGContext {
  /** Summaries of the last 3 forecast outputs */
  recentForecasts: string[];
  /** Natural-language description of vibe trends */
  recentVibePatterns: string;
  /** Insights extracted from run receipt completion patterns */
  runReceiptInsights: string;
  /** Recurring themes detected across all sources */
  personalPatterns: string;
}

export interface BuildRAGContextOptions {
  recentForecasts?: ForecastLike[];
  recentVibes?: VibeLike[];
  recentReceipts?: ReceiptLike[];
  chart?: ChartLike;
}

// Loose input shapes so callers don't need exact schema types
interface ForecastLike {
  outputMarkdown?: string;
  oneLineConclusion?: string;
  grade?: string;
  mode?: string;
  createdAt?: string;
}

interface VibeLike {
  energy: number;
  valence: number;
  arousal: number;
  focus: number;
  socialLoad: number;
  createdAt?: string;
}

interface ReceiptLike {
  whatIDid?: string;
  whatILearned?: string;
  nextAction?: string;
  createdAt?: string;
}

interface ChartLike {
  dayMaster?: {
    stem: string;
    element: string;
  };
  fiveElementDistribution?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FORECASTS = 3;
const MAX_VIBES = 7;
const MAX_RECEIPTS = 5;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function summarizeForecast(fc: ForecastLike, index: number): string {
  const parts: string[] = [];

  if (fc.createdAt) {
    parts.push(`[${fc.createdAt.slice(0, 10)}]`);
  }
  if (fc.mode) {
    parts.push(`(${fc.mode})`);
  }
  if (fc.grade) {
    parts.push(`등급: ${fc.grade}`);
  }
  if (fc.oneLineConclusion) {
    parts.push(fc.oneLineConclusion);
  } else if (fc.outputMarkdown) {
    // Take first meaningful line (skip headings)
    const firstLine = fc.outputMarkdown
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !l.startsWith("#"));
    if (firstLine) {
      parts.push(firstLine.slice(0, 120));
    }
  }

  return parts.length > 0
    ? `${index + 1}. ${parts.join(" — ")}`
    : `${index + 1}. (요약 정보 없음)`;
}

function analyzeVibePatterns(vibes: VibeLike[]): string {
  if (vibes.length === 0) return "바이브 체크인 기록이 없습니다.";

  const sorted = [...vibes].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
  const recent = sorted.slice(0, MAX_VIBES);

  const avgEnergy = recent.reduce((s, v) => s + v.energy, 0) / recent.length;
  const avgValence = recent.reduce((s, v) => s + v.valence, 0) / recent.length;
  const avgFocus = recent.reduce((s, v) => s + v.focus, 0) / recent.length;
  const avgArousal = recent.reduce((s, v) => s + v.arousal, 0) / recent.length;
  const avgSocial = recent.reduce((s, v) => s + v.socialLoad, 0) / recent.length;

  // Trend detection (compare first half vs second half for energy & valence)
  let energyTrend = "안정";
  let valenceTrend = "안정";

  if (recent.length >= 3) {
    const mid = Math.floor(recent.length / 2);
    // "recent" is sorted newest-first so first half = more recent
    const recentHalf = recent.slice(0, mid);
    const olderHalf = recent.slice(mid);

    const recentAvgE = recentHalf.reduce((s, v) => s + v.energy, 0) / recentHalf.length;
    const olderAvgE = olderHalf.reduce((s, v) => s + v.energy, 0) / olderHalf.length;
    if (recentAvgE - olderAvgE > 1) energyTrend = "상승";
    else if (olderAvgE - recentAvgE > 1) energyTrend = "하락";

    const recentAvgV = recentHalf.reduce((s, v) => s + v.valence, 0) / recentHalf.length;
    const olderAvgV = olderHalf.reduce((s, v) => s + v.valence, 0) / olderHalf.length;
    if (recentAvgV - olderAvgV > 1) valenceTrend = "상승";
    else if (olderAvgV - recentAvgV > 1) valenceTrend = "하락";
  }

  const lines = [
    `최근 ${recent.length}회 바이브 체크인 분석:`,
    `• 평균 에너지 ${avgEnergy.toFixed(1)}/10 (추세: ${energyTrend})`,
    `• 평균 정서가 ${avgValence.toFixed(1)}/10 (추세: ${valenceTrend})`,
    `• 평균 집중력 ${avgFocus.toFixed(1)}/10`,
    `• 평균 각성도 ${avgArousal.toFixed(1)}/10`,
    `• 평균 사회적 부하 ${avgSocial.toFixed(1)}/10`,
  ];

  // Add notable patterns
  if (avgEnergy <= 3) lines.push("⚠️ 에너지가 전반적으로 낮습니다. 회복 중심 운세가 필요합니다.");
  if (avgSocial >= 7) lines.push("⚠️ 사회적 부하가 높습니다. 개인 시간 확보를 강조하세요.");
  if (avgFocus <= 3) lines.push("⚠️ 집중력이 낮습니다. 환경 정리 조언이 효과적입니다.");

  return lines.join("\n");
}

function analyzeReceipts(receipts: ReceiptLike[]): string {
  if (receipts.length === 0) return "실행 기록(RunReceipt)이 없습니다.";

  const sorted = [...receipts].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
  const recent = sorted.slice(0, MAX_RECEIPTS);

  const lines = [`최근 ${recent.length}건의 실행 기록 요약:`];

  // Collect recurring lessons and next actions
  const lessons: string[] = [];
  const nextActions: string[] = [];

  recent.forEach((r, i) => {
    if (r.whatIDid) {
      lines.push(`${i + 1}. 실행: ${r.whatIDid.slice(0, 80)}`);
    }
    if (r.whatILearned) {
      lessons.push(r.whatILearned);
    }
    if (r.nextAction) {
      nextActions.push(r.nextAction);
    }
  });

  if (lessons.length > 0) {
    lines.push("", "배운 점 요약:");
    lessons.forEach((l, i) => lines.push(`  ${i + 1}. ${l.slice(0, 100)}`));
  }

  if (nextActions.length > 0) {
    lines.push("", "예정된 다음 행동:");
    nextActions.slice(0, 3).forEach((a, i) => lines.push(`  ${i + 1}. ${a.slice(0, 100)}`));
  }

  return lines.join("\n");
}

function extractPersonalPatterns(
  vibes: VibeLike[],
  receipts: ReceiptLike[],
  chart?: ChartLike,
): string {
  const patterns: string[] = [];

  // Element-based pattern from chart
  if (chart?.dayMaster) {
    const { stem, element } = chart.dayMaster;
    patterns.push(`일간: ${stem} (${element}) — 원소적 성향이 운세 해석에 반영됩니다.`);
  }

  if (chart?.fiveElementDistribution) {
    const dist = chart.fiveElementDistribution;
    const sorted = Object.entries(dist).sort(([, a], [, b]) => b - a);
    if (sorted.length > 0) {
      patterns.push(`가장 강한 원소: ${sorted[0][0]} (${sorted[0][1]})`);
      if (sorted.length > 1) {
        patterns.push(`가장 약한 원소: ${sorted[sorted.length - 1][0]} (${sorted[sorted.length - 1][1]})`);
      }
    }
  }

  // Vibe-based recurring states
  if (vibes.length >= 3) {
    const lowEnergyDays = vibes.filter((v) => v.energy <= 3).length;
    const highSocialDays = vibes.filter((v) => v.socialLoad >= 7).length;
    if (lowEnergyDays >= Math.ceil(vibes.length / 2)) {
      patterns.push("반복 패턴: 저에너지 상태가 잦습니다.");
    }
    if (highSocialDays >= Math.ceil(vibes.length / 2)) {
      patterns.push("반복 패턴: 사회적 부하가 높은 날이 자주 있습니다.");
    }
  }

  // Receipt-based themes
  if (receipts.length >= 2) {
    const allLearned = receipts
      .map((r) => r.whatILearned ?? "")
      .filter((s) => s.length > 0);
    if (allLearned.length >= 2) {
      patterns.push(`실행 기록에서 ${allLearned.length}건의 학습 내용이 누적되었습니다.`);
    }
  }

  return patterns.length > 0
    ? patterns.join("\n")
    : "아직 충분한 개인 패턴 데이터가 없습니다.";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a RAGContext from recent user data.
 *
 * Accepts any shape of forecast, vibe, receipt, and chart objects — making it
 * compatible with both localStorage (client) and database (server) sources.
 */
export function buildRAGContext(options: BuildRAGContextOptions): RAGContext {
  const {
    recentForecasts = [],
    recentVibes = [],
    recentReceipts = [],
    chart,
  } = options;

  // Sort forecasts newest-first and take top N
  const sortedForecasts = [...recentForecasts]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, MAX_FORECASTS);

  return {
    recentForecasts: sortedForecasts.map((fc, i) => summarizeForecast(fc, i)),
    recentVibePatterns: analyzeVibePatterns(recentVibes),
    runReceiptInsights: analyzeReceipts(recentReceipts),
    personalPatterns: extractPersonalPatterns(recentVibes, recentReceipts, chart),
  };
}

/**
 * Format a RAGContext into a structured prompt section for injection into
 * system or user prompts.
 */
export function formatRAGContextForPrompt(ctx: RAGContext): string {
  const sections: string[] = [
    "# 사용자 컨텍스트 (RAG)",
    "",
  ];

  // Recent Forecasts
  sections.push("## 최근 운세 요약");
  if (ctx.recentForecasts.length > 0) {
    ctx.recentForecasts.forEach((f) => sections.push(f));
  } else {
    sections.push("(이전 운세 기록 없음)");
  }
  sections.push("");

  // Vibe Patterns
  sections.push("## 바이브 패턴");
  sections.push(ctx.recentVibePatterns);
  sections.push("");

  // Run Receipt Insights
  sections.push("## 실행 기록 인사이트");
  sections.push(ctx.runReceiptInsights);
  sections.push("");

  // Personal Patterns
  sections.push("## 개인 패턴");
  sections.push(ctx.personalPatterns);
  sections.push("");

  sections.push("---");
  sections.push("위 컨텍스트를 반영하여 사용자에게 연속성 있고 개인화된 운세를 제공하세요.");

  return sections.join("\n");
}

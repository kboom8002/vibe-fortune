import { z } from "zod";
import { VibeFortuneAgentState } from "./state";
import { calculateChart, calculateMajorLuck, checkChartConsistency, analyzeDivineKillers, calculateAnnualLuck, analyzePeriodInteractions } from "../manse";
import { tcoPackLoader } from "../tco/pack-loader";
import { loadPrompt } from "./prompt-loader";
import { llmProvider } from "@/lib/llm/provider";
import { checkInputSafety, checkOutputSafety } from "@/lib/safety";
import { getDbClient } from "@/lib/supabase/db";
import { recomposeFromReceipts } from "./recomposition";

// 1. InputIntakeNode
export async function InputIntakeNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "InputIntakeNode"];
  const requestId = state.requestId || crypto.randomUUID();
  const input = {
    ...state.input,
    timezone: state.input?.timezone || "Asia/Seoul",
  };

  return {
    requestId,
    input,
    safetyFlags: state.safetyFlags || [],
    warnings: state.warnings || [],
    errors: state.errors || [],
    runtime: {
      provider: state.runtime?.provider || "mock",
      startedAt: state.runtime?.startedAt || new Date().toISOString(),
      nodeHistory: history,
      retryCount: state.runtime?.retryCount || 0,
    },
  };
}

// 2. SafetyGateNode
export async function SafetyGateNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "SafetyGateNode"];
  const userMessage = state.input?.userMessage || "";
  const safetyFlags = [...(state.safetyFlags || [])];
  const errors = [...(state.errors || [])];

  // Use the safety module for comprehensive input checking
  const inputSafetyResult = checkInputSafety(userMessage);

  for (const flag of inputSafetyResult.flags) {
    safetyFlags.push({
      type: flag.type,
      severity: flag.severity,
      action: flag.action,
      message: flag.message,
    });
  }

  // Block the entire request if safety check determined it's unsafe (critical/blocked)
  if (!inputSafetyResult.safe) {
    errors.push({
      code: "SAFETY_BLOCKED",
      message: "안전 가이드라인 위반으로 요청이 차단되었습니다.",
      recoverable: false,
      node: "SafetyGateNode",
    });
  }

  return {
    safetyFlags,
    errors,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 3. LoadUserContextNode
export async function LoadUserContextNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "LoadUserContextNode"];
  const userId = state.userId || "local-user";

  if (userId === "local-user") {
    return {
      runtime: {
        ...state.runtime,
        nodeHistory: history,
      },
    };
  }

  try {
    const supabase = getDbClient();

    // 1. Load birth profile if missing
    let birthProfile = state.birthProfile;
    if (!birthProfile) {
      const { data: bp, error: bpError } = await supabase
        .from("birth_profiles")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bp && !bpError) {
        birthProfile = {
          id: bp.id,
          userId: bp.user_id,
          name: bp.name,
          birthDateTime: bp.birth_datetime,
          timezone: bp.timezone,
          gender: bp.gender as any,
          birthLocation: bp.birth_location || undefined,
          providedChart: bp.provided_chart || undefined,
          calculationPolicy: bp.calculation_policy,
          createdAt: bp.created_at,
          updatedAt: bp.updated_at,
        };
      }
    }

    // 2. Load recent run receipts (up to 7)
    const { data: receipts, error: rError } = await supabase
      .from("run_receipts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(7);

    const recentRunReceipts = (receipts || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      forecastOutputId: r.forecast_output_id,
      whatIDid: r.what_i_did,
      whyIChoseIt: r.why_i_chose_it,
      whatAIHelped: r.what_ai_helped,
      myJudgment: r.my_judgment,
      whatIDeferred: r.what_i_deferred,
      whatILearned: r.what_i_learned,
      nextAction: r.next_action,
      createdAt: r.created_at,
    }));

    return {
      birthProfile,
      recentRunReceipts,
      runtime: {
        ...state.runtime,
        nodeHistory: history,
      },
    };
  } catch (err) {
    console.error("[LoadUserContextNode] Error loading context from database:", err);
    return {
      runtime: {
        ...state.runtime,
        nodeHistory: history,
      },
    };
  }
}

// 4. BirthDataNormalizerNode
export async function BirthDataNormalizerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "BirthDataNormalizerNode"];
  const errors = [...(state.errors || [])];

  if (!state.birthProfile) {
    errors.push({
      code: "MISSING_BIRTH_PROFILE",
      message: "출생 정보 프로필이 없습니다. 온보딩을 진행하십시오.",
      recoverable: false,
      node: "BirthDataNormalizerNode",
    });
  }

  return {
    errors,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 5. ManseCalculatorNode
export async function ManseCalculatorNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ManseCalculatorNode"];
  const warnings = [...(state.warnings || [])];
  const errors = [...(state.errors || [])];

  if (state.errors && state.errors.length > 0) {
    return {
      runtime: { ...state.runtime, nodeHistory: history },
    };
  }

  try {
    const bp = state.birthProfile!;
    const chart = calculateChart({
      birthDateTime: bp.birthDateTime,
      timezone: bp.timezone,
      gender: bp.gender as any,
    });

    const majorLuck = calculateMajorLuck({
      chart,
      gender: bp.gender as any,
    });

    chart.warnings.forEach(w => {
      warnings.push({
        code: w as any,
        message: `만세력 연산 경고: ${w}`,
        node: "ManseCalculatorNode",
        userVisible: true,
      });
    });

    return {
      chart,
      majorLuck,
      warnings,
      runtime: {
        ...state.runtime,
        nodeHistory: history,
      },
    };
  } catch (err) {
    errors.push({
      code: "MANSE_CALCULATION_FAILED",
      message: " deterministic 만세력 계산 도중 에러가 발생했습니다.",
      recoverable: false,
      node: "ManseCalculatorNode",
    });
    return {
      errors,
      runtime: {
        ...state.runtime,
        nodeHistory: history,
      },
    };
  }
}

// 6. ChartConsistencyCheckerNode
export async function ChartConsistencyCheckerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ChartConsistencyCheckerNode"];
  const warnings = [...(state.warnings || [])];

  if (state.chart && state.birthProfile?.providedChart) {
    const check = checkChartConsistency(state.chart, state.birthProfile.providedChart);
    if (check.status === "mismatched") {
      warnings.push({
        code: "CHART_CONSISTENCY_MISMATCH",
        message: check.note || "사용자 제공 명식 불일치 감지",
        node: "ChartConsistencyCheckerNode",
        userVisible: true,
      });
    }
  }

  return {
    warnings,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 7. VibeCheckInParserNode
export async function VibeCheckInParserNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "VibeCheckInParserNode"];
  const warnings = [...(state.warnings || [])];

  let vibe = state.vibeCheckIn;
  if (!vibe) {
    warnings.push({
      code: "VIBE_CHECKIN_PARTIAL",
      message: "바이브 체크인 정보가 누락되어 기본값(5)으로 대체되었습니다.",
      node: "VibeCheckInParserNode",
      userVisible: true,
    });
    vibe = {
      id: crypto.randomUUID(),
      userId: state.userId,
      valence: 5,
      arousal: 5,
      energy: 5,
      focus: 5,
      socialLoad: 5,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    vibeCheckIn: vibe,
    warnings,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 8. ContextTensorBuilderNode
export async function ContextTensorBuilderNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ContextTensorBuilderNode"];
  const focus = state.input?.currentFocus || "business_finance";

  // Recomposition feed-back loop
  const riskAxis: string[] = [];
  const intentAxis: string[] = [];
  const evidenceAxis: string[] = [];

  if (state.recentRunReceipts && state.recentRunReceipts.length > 0) {
    try {
      // Map RunReceiptSchema to RunReceiptEntry
      const entries = state.recentRunReceipts.map(r => ({
        id: r.id,
        date: r.createdAt,
        mode: "daily" as const,
        grade: "A",
        requiredActions: [r.whatIDid],
        forbiddenActions: r.whatIDeferred ? [r.whatIDeferred] : [],
        completedActions: [r.whatIDid],
        vibeSnapshot: {
          valence: state.vibeCheckIn?.valence || 5,
          arousal: state.vibeCheckIn?.arousal || 5,
          energy: state.vibeCheckIn?.energy || 5,
          focus: state.vibeCheckIn?.focus || 5,
          socialLoad: state.vibeCheckIn?.socialLoad || 5,
        }
      }));

      const recomposed = recomposeFromReceipts(entries);

      if (recomposed.recentTrend === "declining") {
        riskAxis.push("declining_trend");
      }
      if (recomposed.completionRate < 0.5) {
        intentAxis.push("reduce_scope");
      }
      recomposed.recurringPatterns.forEach(p => {
        evidenceAxis.push(`recurring_pattern:${p}`);
      });
    } catch (err) {
      console.warn("[ContextTensorBuilderNode] Failed to run recomposition:", err);
    }
  }

  const contextTensor = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    domainAxis: [focus],
    userStateAxis: {
      valence: state.vibeCheckIn?.valence || 5,
      arousal: state.vibeCheckIn?.arousal || 5,
      energy: state.vibeCheckIn?.energy || 5,
      focus: state.vibeCheckIn?.focus || 5,
      socialLoad: state.vibeCheckIn?.socialLoad || 5,
    },
    riskAxis,
    intentAxis,
    evidenceAxis,
    temporalAxis: {
      dailyLuck: state.chart?.pillars?.day?.label,
    },
    channelAxis: "daily_board" as const,
    createdAt: new Date().toISOString(),
  };

  // Schema-First Rule: Validate the contextTensor using ContextTensorSchema
  try {
    const { ContextTensorSchema } = require("@/schemas/context-tensor.schema");
    ContextTensorSchema.parse(contextTensor);
  } catch (err) {
    console.warn("[ContextTensorBuilderNode] Schema validation failed:", err);
  }

  return {
    contextTensor,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 9. ConceptCanonicalizerNode
// Zod schema for the LLM's concept canonicalization output (subset without IDs/timestamps)
const ConceptCanonLLMOutputSchema = z.object({
  coreConceptState: z.string().min(1),
  activeConcepts: z.array(z.string()),
  suppressedConcepts: z.array(z.string()),
  conceptGaps: z.array(z.string()),
  evidenceGaps: z.array(z.string()),
  boundaryGaps: z.array(z.string()),
  conversionGaps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export async function ConceptCanonicalizerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ConceptCanonicalizerNode"];
  const dmElem = state.chart?.dayMaster?.element || "earth";
  
  // Deterministic fallback values
  const fallbackActiveConcepts = [`element.${dmElem}.stabilization`];
  if (state.input?.currentFocus) {
    fallbackActiveConcepts.push(`focus.${state.input.currentFocus}`);
  }

  const fallbackLLMOutput = {
    coreConceptState: fallbackActiveConcepts[0],
    activeConcepts: fallbackActiveConcepts,
    suppressedConcepts: [] as string[],
    conceptGaps: [] as string[],
    evidenceGaps: [] as string[],
    boundaryGaps: [] as string[],
    conversionGaps: [] as string[],
    confidence: 1.0,
  };

  let llmResult = fallbackLLMOutput;

  try {
    const systemPrompt = loadPrompt("system");
    const conceptPrompt = loadPrompt("concept_canonicalizer");

    // Build context for the LLM (chart data summary, vibe, focus — never send raw pillars for LLM to calculate)
    const contextForLLM = [
      conceptPrompt,
      "",
      "--- Context ---",
      `Day Master Element: ${dmElem}`,
      `Day Master Stem: ${state.chart?.dayMaster?.stem || "unknown"}`,
      `Day Master Yin/Yang: ${state.chart?.dayMaster?.polarity || "unknown"}`,
      `User Focus: ${state.input?.currentFocus || "general"}`,
      `Vibe Valence: ${state.vibeCheckIn?.valence ?? 5}`,
      `Vibe Energy: ${state.vibeCheckIn?.energy ?? 5}`,
      `Vibe Focus: ${state.vibeCheckIn?.focus ?? 5}`,
      `Vibe Arousal: ${state.vibeCheckIn?.arousal ?? 5}`,
      `Vibe SocialLoad: ${state.vibeCheckIn?.socialLoad ?? 5}`,
      "",
      "Return ConceptState JSON only. Do not calculate chart values.",
    ].join("\n");

    llmResult = await llmProvider.generateStructuredOutput(
      contextForLLM,
      systemPrompt,
      ConceptCanonLLMOutputSchema,
      fallbackLLMOutput
    );
  } catch (err) {
    console.warn(
      "[ConceptCanonicalizerNode] LLM call failed, using deterministic fallback.",
      err instanceof Error ? err.message : err
    );
    // llmResult remains as fallbackLLMOutput
  }

  const conceptState = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    ...llmResult,
    createdAt: new Date().toISOString(),
  };

  return {
    conceptState,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 10. RiskVectorizerNode
export async function RiskVectorizerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "RiskVectorizerNode"];
  const energy = state.vibeCheckIn?.energy || 5;

  const burnout = energy <= 3 ? 0.8 : 0.2;

  // 1. Count ten gods occurrences
  const tenGods = state.chart?.tenGods || {};
  const tenGodsList = Object.values(tenGods);
  const pyeonGwanCount = tenGodsList.filter(tg => tg === "편관").length;
  const sangGwanCount = tenGodsList.filter(tg => tg === "상관").length;

  // 2. Check divine killers
  const killers = state.chart ? analyzeDivineKillers(state.chart) : [];
  const hasDoHwa = killers.some(k => k.type === "도화살");
  const hasYeokMa = killers.some(k => k.type === "역마살");

  // 3. Check annual luck clash
  let annualClash = false;
  if (state.chart) {
    try {
      const targetYear = new Date().getFullYear();
      const annualLuck = calculateAnnualLuck({ year: targetYear });
      const clashes = analyzePeriodInteractions(state.chart, annualLuck.pillar, "annual");
      annualClash = clashes.some(c => c.type === "clash");
    } catch (e) {
      console.warn("[RiskVectorizerNode] Failed to check annual clash:", e);
    }
  }

  // 4. Calculate personalized risk scores
  const cap = (val: number) => Math.min(1.0, Math.max(0.0, val));
  
  const baseOverextension = energy <= 4 ? 0.7 : 0.1;
  const overextension = cap(baseOverextension + (hasYeokMa ? 0.1 : 0.0));
  const scopeLeak = cap(0.1 + (annualClash ? 0.15 : 0.0));
  const overclaim = cap(0.1 + (sangGwanCount >= 2 ? 0.15 : 0.0));
  const emotionalOverreaction = cap(0.1 + (hasDoHwa ? 0.1 : 0.0));
  const legalSafetyRisk = cap(0.1 + (pyeonGwanCount >= 2 ? 0.2 : 0.0));

  const riskVector = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    overextension,
    scopeLeak,
    overclaim,
    burnout,
    relationshipDryness: 0.1,
    emotionalOverreaction,
    legalSafetyRisk,
    missedOpportunity: 0.1,
    deterministicFortuneRisk: 0.1,
    relationshipManipulationRisk: 0.1,
    primaryRisk: burnout >= 0.6 ? ("burnout" as const) : ("overextension" as const),
    createdAt: new Date().toISOString(),
  };

  // Schema-First Rule: Validate the riskVector using RiskVectorSchema
  try {
    const { RiskVectorSchema } = require("@/schemas/risk-vector.schema");
    RiskVectorSchema.parse(riskVector);
  } catch (err) {
    console.warn("[RiskVectorizerNode] Schema validation failed:", err);
  }

  return {
    riskVector,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 11. OperatorExecutorNode
export async function OperatorExecutorNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "OperatorExecutorNode"];
  const rules = tcoPackLoader.loadOperatorRules();
  const matched: any[] = [];

  rules.forEach(rule => {
    let match = false;
    if (rule.trigger.domain && rule.trigger.domain.includes(state.input?.currentFocus || "")) {
      match = true;
    }
    if (rule.trigger.risk && rule.trigger.risk.includes("burnout") && (state.riskVector?.burnout || 0) >= 0.6) {
      match = true;
    }

    if (match && rule.enabled) {
      matched.push({
        mode: rule.output_policy.mode,
        warmthVsCompetence: rule.output_policy.warmthVsCompetence,
        requiredActions: rule.output_policy.requiredActions,
        forbiddenActions: rule.output_policy.forbiddenActions,
        deferredActions: rule.output_policy.deferredActions,
        boundaryNotes: rule.output_policy.boundaryNotes,
      });
    }
  });

  if (matched.length === 0) {
    matched.push({
      mode: "Consolidation",
      warmthVsCompetence: "Balanced",
      requiredActions: ["오늘 해야 할 가장 핵심적인 일 1가지만 정의하고 마감하기"],
      forbiddenActions: ["충동적인 추가 약속 조율하기"],
      deferredActions: ["무리한 신규 전략 회의 소집"],
      boundaryNotes: ["과로 금지, 충분한 수면 확보"],
    });
  }

  return {
    operatorOutputs: matched,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 12. PolicyBinderNode
export async function PolicyBinderNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "PolicyBinderNode"];
  const outputs = state.operatorOutputs || [];

  const requiredActions = Array.from(new Set(outputs.flatMap(o => o.requiredActions || [])));
  const forbiddenActions = Array.from(new Set(outputs.flatMap(o => o.forbiddenActions || [])));
  const deferredActions = Array.from(new Set(outputs.flatMap(o => o.deferredActions || [])));
  const boundaryNotes = Array.from(new Set(outputs.flatMap(o => o.boundaryNotes || [])));

  state.safetyFlags?.forEach(f => {
    if (f.message) boundaryNotes.push(f.message);
  });

  const actionPolicy = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    mode: outputs[0]?.mode || "Consolidation",
    warmthVsCompetence: outputs[0]?.warmthVsCompetence || "Balanced",
    requiredActions,
    forbiddenActions,
    deferredActions,
    boundaryNotes,
    reviewQuestions: ["핵심 지침 1가지를 지켰나요?"],
    createdAt: new Date().toISOString(),
  };

  return {
    actionPolicy,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 13. ForecastWriterNode
// Zod schema for the LLM's forecast writer output (narrative fields only)
const ForecastWriterLLMOutputSchema = z.object({
  summary: z.string().min(1),
  conceptStateDescription: z.string().min(1),
  actionPolicyExplanation: z.string().min(1),
  vibeInterpretation: z.string().optional(),
  riskNarrative: z.string().optional(),
  reflectionQuestion: z.string().optional(),
  outputMarkdown: z.string().min(1),
});

export async function ForecastWriterNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ForecastWriterNode"];
  
  if (state.errors && state.errors.length > 0) {
    return {
      runtime: { ...state.runtime, nodeHistory: history },
    };
  }

  // Hardcoded fallback values (original deterministic output)
  const fallbackSummary = `오늘 일간 ${state.chart?.dayMaster?.stem || "?"}의 운성 흐름 하에, 활력도(${state.vibeCheckIn?.energy ?? 5})를 보완하여 완급조절을 달성하십시오.`;

  const fallbackOutputJson = {
    summary: fallbackSummary,
    conceptStateDescription: "목적 지향적인 몰입과 계획이 활성화되는 시점입니다.",
    actionPolicyExplanation: "지속 가능한 성과를 도출하기 위해 분산된 노력을 통제하십시오.",
  };

  const fallbackOutputMarkdown = `### ☯ 오늘의 우주적 기류 및 바이브 분석
- **한 줄 요약**: ${fallbackOutputJson.summary}
- **조율 방향**: 침착한 분석을 통해 장기 과제에 에너지를 집중하십시오.

### 📋 오늘의 자기운영 지침 (Action Policy)
- **필수 행동**: ${state.actionPolicy?.requiredActions?.join(", ") || "핵심 업무 1가지 완수"}
- **금지 행동**: ${state.actionPolicy?.forbiddenActions?.join(", ") || "충동적 약속"}
- **보류 행동**: ${state.actionPolicy?.deferredActions?.join(", ") || "신규 전략 회의"}

> [!NOTE]
> ${state.actionPolicy?.boundaryNotes?.join(" \n> ") || "과로 금지, 충분한 수면 확보"}`;

  let outputJson = fallbackOutputJson;
  let outputMarkdown = fallbackOutputMarkdown;

  try {
    const systemPrompt = loadPrompt("system");
    const forecastPrompt = loadPrompt("forecast_writer");

    // Build comprehensive context for the LLM forecast writer
    const contextForLLM = [
      forecastPrompt,
      "",
      "--- Deterministic Chart Data (pre-calculated, DO NOT recalculate) ---",
      `Day Master: ${state.chart?.dayMaster?.stem || "unknown"} (${state.chart?.dayMaster?.element || "unknown"}, ${state.chart?.dayMaster?.polarity || "unknown"})`,
      `Year Pillar: ${state.chart?.pillars?.year?.label || "unknown"}`,
      `Month Pillar: ${state.chart?.pillars?.month?.label || "unknown"}`,
      `Day Pillar: ${state.chart?.pillars?.day?.label || "unknown"}`,
      `Hour Pillar: ${state.chart?.pillars?.hour?.label || "unknown"}`,
      "",
      "--- Vibe Check-In ---",
      `Valence: ${state.vibeCheckIn?.valence ?? 5}`,
      `Arousal: ${state.vibeCheckIn?.arousal ?? 5}`,
      `Energy: ${state.vibeCheckIn?.energy ?? 5}`,
      `Focus: ${state.vibeCheckIn?.focus ?? 5}`,
      `SocialLoad: ${state.vibeCheckIn?.socialLoad ?? 5}`,
      "",
      "--- Concept State ---",
      `Core Concept: ${state.conceptState?.coreConceptState || "unknown"}`,
      `Active Concepts: ${state.conceptState?.activeConcepts?.join(", ") || "none"}`,
      `Concept Gaps: ${state.conceptState?.conceptGaps?.join(", ") || "none"}`,
      "",
      "--- Risk Vector ---",
      `Primary Risk: ${state.riskVector?.primaryRisk || "unknown"}`,
      `Burnout: ${state.riskVector?.burnout ?? 0}`,
      `Overextension: ${state.riskVector?.overextension ?? 0}`,
      `Overclaim: ${state.riskVector?.overclaim ?? 0}`,
      "",
      "--- Action Policy ---",
      `Mode: ${state.actionPolicy?.mode || "Consolidation"}`,
      `Warmth vs Competence: ${state.actionPolicy?.warmthVsCompetence || "Balanced"}`,
      `Required Actions: ${state.actionPolicy?.requiredActions?.join("; ") || "none"}`,
      `Forbidden Actions: ${state.actionPolicy?.forbiddenActions?.join("; ") || "none"}`,
      `Deferred Actions: ${state.actionPolicy?.deferredActions?.join("; ") || "none"}`,
      `Boundary Notes: ${state.actionPolicy?.boundaryNotes?.join("; ") || "none"}`,
      `Review Questions: ${state.actionPolicy?.reviewQuestions?.join("; ") || "none"}`,
      "",
      "--- Safety Flags ---",
      state.safetyFlags?.length ? state.safetyFlags.map(f => `[${f.type}] ${f.message}`).join("\n") : "none",
      "",
      "Generate a forecast output with: summary, conceptStateDescription, actionPolicyExplanation, and outputMarkdown.",
      "The outputMarkdown should be user-facing Korean text in rich markdown format.",
      "Do NOT produce deterministic predictions. Use structural prior language.",
    ].join("\n");

    const fallbackLLMOutput = {
      summary: fallbackOutputJson.summary,
      conceptStateDescription: fallbackOutputJson.conceptStateDescription,
      actionPolicyExplanation: fallbackOutputJson.actionPolicyExplanation,
      outputMarkdown: fallbackOutputMarkdown,
    };

    const llmResult = await llmProvider.generateStructuredOutput(
      contextForLLM,
      systemPrompt,
      ForecastWriterLLMOutputSchema,
      fallbackLLMOutput
    );

    outputJson = {
      summary: llmResult.summary,
      conceptStateDescription: llmResult.conceptStateDescription,
      actionPolicyExplanation: llmResult.actionPolicyExplanation,
    };
    outputMarkdown = llmResult.outputMarkdown;
  } catch (err) {
    console.warn(
      "[ForecastWriterNode] LLM call failed, using hardcoded fallback.",
      err instanceof Error ? err.message : err
    );
    // outputJson and outputMarkdown remain as fallback values
  }

  const draftOutput = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    mode: "daily" as const,
    outputJson,
    outputMarkdown,
    grade: "A",
    safetyFlags: state.safetyFlags?.map(f => f.type) || [],
    createdAt: new Date().toISOString(),
  };

  return {
    draftOutput,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 14. SafetyBoundaryReviewerNode
export async function SafetyBoundaryReviewerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "SafetyBoundaryReviewerNode"];
  const safetyFlags = [...(state.safetyFlags || [])];
  const finalOutput = { ...(state.draftOutput as any) };

  if (finalOutput?.outputMarkdown) {
    // Run output through the safety module
    const outputSafetyResult = checkOutputSafety(finalOutput.outputMarkdown);

    // Add any detected safety flags to the state
    for (const flag of outputSafetyResult.flags) {
      safetyFlags.push({
        type: flag.type,
        severity: flag.severity,
        action: flag.action,
        message: flag.message,
      });
    }

    // If sanitized output was produced, use it
    if (outputSafetyResult.sanitizedOutput) {
      finalOutput.outputMarkdown = outputSafetyResult.sanitizedOutput;
    }

    // Update safety flags on the output itself
    finalOutput.safetyFlags = Array.from(
      new Set([
        ...(finalOutput.safetyFlags || []),
        ...outputSafetyResult.flags.map((f: { type: string }) => f.type),
      ])
    );
  }

  // Always append the boundary disclaimer
  if (finalOutput?.outputMarkdown && !finalOutput.outputMarkdown.includes("안전 경계 알림")) {
    finalOutput.outputMarkdown += `\n\n--- \n*본 행동 정책은 명리학적 조언과 자가 기록한 바이브 상태에 근거한 가이드라인이며, 중요한 의사결정 시 전문가와 상담을 추천합니다.*`;
  }

  return {
    finalOutput,
    safetyFlags,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 15. PersistenceNode
export async function PersistenceNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "PersistenceNode"];
  const userId = state.userId || "local-user";

  if (state.finalOutput && typeof window !== "undefined") {
    localStorage.setItem("last-generated-forecast", JSON.stringify(state.finalOutput));
  }

  const persistenceIds = {
    forecastRequestId: state.requestId,
    contextTensorId: state.contextTensor?.id,
    conceptStateId: state.conceptState?.id,
    riskVectorId: state.riskVector?.id,
    actionPolicyId: state.actionPolicy?.id,
    forecastOutputId: state.finalOutput?.id,
  };

  // If authenticated user, write to remote Supabase DB
  if (userId !== "local-user") {
    try {
      const supabase = getDbClient();

      // 1. Upsert forecast request
      if (state.birthProfile) {
        await supabase.from("forecast_requests").upsert({
          id: state.requestId,
          user_id: userId,
          mode: "daily",
          target_date: new Date().toISOString().split("T")[0],
          current_focus: state.contextTensor?.domainAxis || [],
          user_message: state.input?.userMessage || null,
          birth_profile_id: state.birthProfile.id,
          vibe_checkin_id: state.vibeCheckIn?.id || null,
          created_at: new Date().toISOString(),
        });
      }

      // 2. Upsert context tensor
      if (state.contextTensor) {
        await supabase.from("context_tensors").upsert({
          id: state.contextTensor.id,
          user_id: userId,
          forecast_request_id: state.requestId,
          payload: state.contextTensor,
          created_at: state.contextTensor.createdAt,
        });
      }

      // 3. Upsert concept state
      if (state.conceptState) {
        await supabase.from("concept_states").upsert({
          id: state.conceptState.id,
          user_id: userId,
          forecast_request_id: state.requestId,
          payload: state.conceptState,
          confidence: state.conceptState.confidence,
          created_at: state.conceptState.createdAt,
        });
      }

      // 4. Upsert risk vector
      if (state.riskVector) {
        await supabase.from("risk_vectors").upsert({
          id: state.riskVector.id,
          user_id: userId,
          forecast_request_id: state.requestId,
          payload: state.riskVector,
          primary_risk: state.riskVector.primaryRisk,
          created_at: state.riskVector.createdAt,
        });
      }

      // 5. Upsert action policy
      if (state.actionPolicy) {
        await supabase.from("action_policies").upsert({
          id: state.actionPolicy.id,
          user_id: userId,
          forecast_request_id: state.requestId,
          mode: "daily",
          payload: state.actionPolicy,
          created_at: state.actionPolicy.createdAt,
        });
      }

      // 6. Upsert forecast output
      if (state.finalOutput) {
        const { error } = await supabase.from("forecast_outputs").upsert({
          id: state.finalOutput.id,
          user_id: userId,
          forecast_request_id: state.requestId,
          mode: state.finalOutput.mode,
          output_json: state.finalOutput.outputJson,
          output_markdown: state.finalOutput.outputMarkdown,
          grade: state.finalOutput.grade || "A",
          context_tensor_id: state.contextTensor?.id || null,
          concept_state_id: state.conceptState?.id || null,
          risk_vector_id: state.riskVector?.id || null,
          action_policy_id: state.actionPolicy?.id || null,
          safety_flags: state.finalOutput.safetyFlags || [],
          created_at: state.finalOutput.createdAt,
        });

        if (error) {
          console.error("[PersistenceNode] Error saving forecast output to Supabase:", error);
        }
      }
    } catch (err) {
      console.error("[PersistenceNode] Unhandled persistence error:", err);
    }
  }

  return {
    persistence: persistenceIds,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 16. FinalResponseNode
export async function FinalResponseNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "FinalResponseNode"];
  return {
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

/**
 * 16개 노드를 순차적으로 호출하여 전체 LangGraph 에이전트 워크플로를 오케스트레이션한다.
 */
export async function runAgentWorkflow(initialState: VibeFortuneAgentState): Promise<VibeFortuneAgentState> {
  let state = { ...initialState };

  const nodes = [
    InputIntakeNode,
    SafetyGateNode,
    LoadUserContextNode,
    BirthDataNormalizerNode,
    ManseCalculatorNode,
    ChartConsistencyCheckerNode,
    VibeCheckInParserNode,
    ContextTensorBuilderNode,
    ConceptCanonicalizerNode,
    RiskVectorizerNode,
    OperatorExecutorNode,
    PolicyBinderNode,
    ForecastWriterNode,
    SafetyBoundaryReviewerNode,
    PersistenceNode,
    FinalResponseNode,
  ];

  for (const node of nodes) {
    const update = await node(state);
    state = { ...state, ...update };
    
    // 에러 발생 시 safety/final response를 향해 빠른 탈출
    if (state.errors && state.errors.length > 0 && node.name === "SafetyGateNode") {
      console.warn("[runAgentWorkflow] Safety block active. Escaping to FinalResponseNode.");
      const finalUpdate = await FinalResponseNode(state);
      state = { ...state, ...finalUpdate };
      break;
    }
  }

  return state;
}

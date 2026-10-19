import { z } from "zod";
import { VibeFortuneAgentState } from "./state";
import { calculateChart, calculateMajorLuck, checkChartConsistency, analyzeDivineKillers, calculateAnnualLuck, calculateMonthlyLuck, calculateDailyLuckRange, analyzePeriodInteractions } from "../manse";
import { STEM_ELEMENTS, BRANCH_MAIN_ELEMENTS } from "../manse/constants";
import { tcoPackLoader, loadTcoPacks } from "../tco/pack-loader";
import { loadPrompt } from "./prompt-loader";
import { llmProvider } from "@/lib/llm/provider";
import { checkInputSafety, checkOutputSafety } from "@/lib/safety";
import { getDbClient } from "@/lib/supabase/db";
import { recomposeFromReceipts } from "./recomposition";
import { buildRAGContext, formatRAGContextForPrompt } from "./rag-context";
import {
  determineVibeTuneProfile,
  calculateVibeSyncScore,
  rewriteWithVibeTune,
  generateVibePrescription,
} from "./vibe-rewriter";
import { ContextTensorSchema } from "@/schemas/context-tensor.schema";
import { RiskVectorSchema } from "@/schemas/risk-vector.schema";
import { ActionPolicySchema } from "@/schemas/action-policy.schema";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id?: string | null): boolean {
  return Boolean(id && UUID_REGEX.test(id));
}

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
  const warnings = [...(state.warnings || [])];
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
    if (flag.action === "boundary_added") {
      warnings.push({
        code: "SAFETY_BOUNDARY_ADDED",
        message: flag.message,
        node: "SafetyGateNode",
        userVisible: true,
      });
    }
  }

  // Persist detected safety flags immediately if state.userId is a valid UUID
  // so blocked S3 crisis events are never lost when routing directly to FinalResponseNode
  if (inputSafetyResult.flags.length > 0 && isValidUuid(state.userId)) {
    try {
      const supabase = getDbClient();
      for (const flag of inputSafetyResult.flags) {
        await supabase.from("safety_events").insert({
          user_id: state.userId,
          forecast_request_id: null,
          event_type: flag.type,
          severity: flag.severity || "medium",
          input_excerpt: flag.message,
          action_taken: flag.action || "logged",
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn("[SafetyGateNode] Error persisting safety event:", err);
    }
  }

  let finalOutput = state.finalOutput;

  // Block the entire request if safety check determined it's unsafe (critical/blocked)
  if (!inputSafetyResult.safe) {
    errors.push({
      code: "SAFETY_BLOCKED",
      message: "안전 가이드라인 위반으로 요청이 차단되었습니다.",
      recoverable: false,
      node: "SafetyGateNode",
    });

    const blockMessage =
      inputSafetyResult.flags.map(f => f.message).join("\n\n") ||
      "안전 가이드라인에 의해 요청이 차단되었습니다.";

    finalOutput = {
      id: crypto.randomUUID(),
      userId: state.userId || "local-user",
      forecastRequestId: state.requestId || crypto.randomUUID(),
      mode: (state.input?.forecastScope as any) || "daily",
      outputJson: {
        summary: blockMessage,
        oneLineConclusion: blockMessage,
        requiredActions: [],
        forbiddenActions: [],
        boundaryNotes: inputSafetyResult.flags.map(f => f.message),
      },
      outputMarkdown: blockMessage,
      grade: "C",
      safetyFlags: inputSafetyResult.flags.map(f => f.type),
      createdAt: new Date().toISOString(),
    };
  }

  return {
    safetyFlags,
    warnings,
    errors,
    ...(finalOutput ? { finalOutput } : {}),
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

  // Only query Supabase if userId is a valid UUID (skip for "local-user", "eval-user", etc.)
  if (!isValidUuid(userId)) {
    return {
      rlhfBias: state.rlhfBias || {
        intensity_offset: 0,
        risk_sensitivity: 1.0,
        tone_preference: null,
        action_count_limit: null,
      },
      runtime: {
        ...state.runtime,
        nodeHistory: history,
      },
    };
  }

  try {
    const supabase = getDbClient();

    // 0. Load profile to get rlhf_bias
    let rlhfBias = state.rlhfBias;
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("rlhf_bias")
      .eq("user_id", userId)
      .maybeSingle();

    if (prof && !profError && prof.rlhf_bias) {
      rlhfBias = prof.rlhf_bias as any;
    } else if (!rlhfBias) {
      rlhfBias = {
        intensity_offset: 0,
        risk_sensitivity: 1.0,
        tone_preference: null,
        action_count_limit: null,
      };
    }

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
    const { data: receipts } = await supabase
      .from("run_receipts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(7);

    const dbReceipts = (receipts || []).map(r => ({
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
    const recentRunReceipts = dbReceipts.length > 0 ? dbReceipts : (state.recentRunReceipts || []);

    // 3. Load recent vibe checkins (up to 5)
    const { data: vibeHistory } = await supabase
      .from("vibe_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const dbVibes = (vibeHistory || []).map(v => ({
      id: v.id,
      userId: v.user_id,
      valence: Number(v.valence),
      arousal: Number(v.arousal),
      energy: Number(v.energy),
      focus: Number(v.focus),
      socialLoad: Number(v.social_load),
      sleepHours: v.sleep_hours ? Number(v.sleep_hours) : undefined,
      oneLineEvent: v.one_line_event || undefined,
      createdAt: v.created_at,
    }));
    const recentVibes = dbVibes.length > 0 ? dbVibes : (state.recentVibes || []);

    // 4. Load recent forecast outputs (up to 7) for RunReceipt recomposition & RAG
    const { data: forecastRows } = await supabase
      .from("forecast_outputs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(7);

    const dbForecasts = (forecastRows || []).map(f => ({
      id: f.id,
      userId: f.user_id,
      forecastRequestId: f.forecast_request_id,
      mode: f.mode,
      outputJson: f.output_json,
      outputMarkdown: f.output_markdown,
      grade: f.grade || undefined,
      contextTensorId: f.context_tensor_id || undefined,
      conceptStateId: f.concept_state_id || undefined,
      riskVectorId: f.risk_vector_id || undefined,
      actionPolicyId: f.action_policy_id || undefined,
      safetyFlags: f.safety_flags || [],
      createdAt: f.created_at,
    }));
    const recentForecastOutputs = dbForecasts.length > 0 ? dbForecasts : (state.recentForecastOutputs || []);

    return {
      birthProfile,
      recentRunReceipts,
      recentVibes,
      recentForecastOutputs,
      rlhfBias,
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
    const tz = state.input?.timezone || bp.timezone || "Asia/Seoul";
    let targetDateStr = state.input?.targetDate;
    if (!targetDateStr) {
      const now = state.runtime?.startedAt ? new Date(state.runtime.startedAt) : new Date();
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      targetDateStr = formatter.format(now);
    } else if (/^\d{4}-\d{2}$/.test(targetDateStr)) {
      targetDateStr = `${targetDateStr}-01`;
    }

    const [yearPart, monthPart] = targetDateStr.split("-");
    const targetYear = parseInt(yearPart, 10) || new Date().getFullYear();
    const targetMonth = parseInt(monthPart, 10) || new Date().getMonth() + 1;

    const chart = calculateChart({
      birthDateTime: bp.birthDateTime,
      timezone: bp.timezone || tz,
      gender: bp.gender as any,
    });

    const providedChart = state.input?.providedChart || state.providedChart || bp.providedChart;
    const chartConsistency = state.chartConsistency || checkChartConsistency(chart, providedChart);
    chart.chartConsistency = chartConsistency;

    const majorLuck = calculateMajorLuck({
      chart,
      gender: bp.gender as any,
    });

    const annualLuck = calculateAnnualLuck({ year: targetYear });
    const monthlyLuck = calculateMonthlyLuck({ year: targetYear, month: targetMonth });
    const dailyLuckRange = calculateDailyLuckRange({ from: targetDateStr, to: targetDateStr, timezone: tz });
    const dailyLuck = dailyLuckRange.days[0];

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
      chartConsistency,
      majorLuck,
      annualLuck,
      monthlyLuck,
      dailyLuck,
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
  let chartConsistency = state.chartConsistency;

  if (state.chart) {
    const providedChart = state.input?.providedChart || state.providedChart || state.birthProfile?.providedChart;
    const check = checkChartConsistency(state.chart, providedChart);
    chartConsistency = check;
    state.chart.chartConsistency = check;
    if (check.status === "mismatched") {
      if (!warnings.some(w => w.code === "CHART_CONSISTENCY_MISMATCH")) {
        warnings.push({
          code: "CHART_CONSISTENCY_MISMATCH",
          message: check.note || "사용자 제공 명식 불일치 감지",
          node: "ChartConsistencyCheckerNode",
          userVisible: true,
        });
      }
    }
  }

  return {
    chartConsistency,
    warnings,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 6.5 VibeEstimatorNode
export async function VibeEstimatorNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "VibeEstimatorNode"];
  const warnings = [...(state.warnings || [])];

  // 1. Saju / Temporal Prior Calculation
  let sajuVibe = { valence: 5.0, arousal: 5.0, energy: 5.0, focus: 5.0, socialLoad: 5.0 };

  const dmElement = state.chart?.dayMaster?.element; // wood, fire, earth, metal, water
  const dmStrength = state.chart?.dayMaster?.strength?.judgment; // strong, weak, balanced
  const yongSin = state.chart?.dayMaster?.yongSin; // wood, fire, earth, metal, water

  let dailyStemEl: string | undefined;
  let dailyBranchEl: string | undefined;

  if (state.dailyLuck?.pillar) {
    const stem = state.dailyLuck.pillar.stem;
    const branch = state.dailyLuck.pillar.branch;
    dailyStemEl = STEM_ELEMENTS[stem as keyof typeof STEM_ELEMENTS];
    dailyBranchEl = BRANCH_MAIN_ELEMENTS[branch as keyof typeof BRANCH_MAIN_ELEMENTS];
  }

  // Adjustments based on active daily elements
  const activeElements = [dailyStemEl, dailyBranchEl].filter(Boolean);
  
  let valenceOffset = 0;
  let arousalOffset = 0;
  let energyOffset = 0;
  let focusOffset = 0;
  let socialOffset = 0;

  activeElements.forEach(el => {
    if (el === "wood") {
      arousalOffset += 0.3;
      energyOffset += 0.3;
      focusOffset += 0.1;
    } else if (el === "fire") {
      valenceOffset += 0.3;
      arousalOffset += 0.5;
      socialOffset += 0.6;
      energyOffset += 0.3;
    } else if (el === "earth") {
      focusOffset += 0.5;
      arousalOffset -= 0.3;
    } else if (el === "metal") {
      focusOffset += 0.6;
      socialOffset -= 0.3;
      arousalOffset += 0.1;
    } else if (el === "water") {
      energyOffset -= 0.5;
      socialOffset -= 0.6;
      valenceOffset -= 0.1;
    }

    // YongSin match boosts valence and energy
    if (yongSin && el === yongSin) {
      valenceOffset += 0.6;
      energyOffset += 0.6;
    }
  });

  // Weak Day Master Clashing check
  const CLASH_MAP: Record<string, string> = {
    wood: "metal",
    fire: "water",
    earth: "wood",
    metal: "fire",
    water: "earth",
  };

  if (dmElement && dmStrength === "weak") {
    const criticalElement = CLASH_MAP[dmElement];
    activeElements.forEach(el => {
      if (el === criticalElement) {
        arousalOffset += 0.8;
        socialOffset += 0.6;
        valenceOffset -= 0.5;
        energyOffset -= 0.3;
      }
    });
  }

  sajuVibe.valence = Math.min(10, Math.max(0, sajuVibe.valence + valenceOffset));
  sajuVibe.arousal = Math.min(10, Math.max(0, sajuVibe.arousal + arousalOffset));
  sajuVibe.energy = Math.min(10, Math.max(0, sajuVibe.energy + energyOffset));
  sajuVibe.focus = Math.min(10, Math.max(0, sajuVibe.focus + focusOffset));
  sajuVibe.socialLoad = Math.min(10, Math.max(0, sajuVibe.socialLoad + socialOffset));

  // 2. History Prior Calculation (past run receipts & past vibes)
  let historyVibe = { ...sajuVibe };
  let hasHistory = false;

  // Let's check past run receipts completion rate
  if (state.recentRunReceipts && state.recentRunReceipts.length > 0) {
    hasHistory = true;
    const lastThree = state.recentRunReceipts.slice(0, 3);
    const completionScores = lastThree.map(r => {
      let score = 1.0;
      if (r.whatIDeferred && r.whatIDeferred.trim().length > 0) score -= 0.4;
      if (!r.whatIDid || r.whatIDid.trim().length === 0) score -= 0.6;
      return Math.max(0, score);
    });
    const avgCompletion = completionScores.reduce((a, b) => a + b, 0) / completionScores.length;

    let hEnergyOffset = 0;
    let hFocusOffset = 0;
    let hSocialOffset = 0;
    let hValenceOffset = 0;

    if (avgCompletion < 0.5) {
      hEnergyOffset -= 1.0;
      hFocusOffset -= 0.8;
      hSocialOffset += 0.8;
      hValenceOffset -= 0.6;
    } else if (avgCompletion >= 0.8) {
      hEnergyOffset += 0.4;
      hFocusOffset += 0.6;
      hValenceOffset += 0.4;
    }

    historyVibe.energy = Math.min(10, Math.max(0, historyVibe.energy + hEnergyOffset));
    historyVibe.focus = Math.min(10, Math.max(0, historyVibe.focus + hFocusOffset));
    historyVibe.socialLoad = Math.min(10, Math.max(0, historyVibe.socialLoad + hSocialOffset));
    historyVibe.valence = Math.min(10, Math.max(0, historyVibe.valence + hValenceOffset));
  }

  // Let's check past vibes trend
  if (state.recentVibes && state.recentVibes.length > 0) {
    hasHistory = true;
    const lastVibe = state.recentVibes[0];
    historyVibe.valence = (historyVibe.valence * 0.4) + (lastVibe.valence * 0.6);
    historyVibe.arousal = (historyVibe.arousal * 0.4) + (lastVibe.arousal * 0.6);
    historyVibe.energy = (historyVibe.energy * 0.4) + (lastVibe.energy * 0.6);
    historyVibe.focus = (historyVibe.focus * 0.4) + (lastVibe.focus * 0.6);
    historyVibe.socialLoad = (historyVibe.socialLoad * 0.4) + (lastVibe.socialLoad * 0.6);
  }

  // 3. User message sentiment extraction (if present)
  let messageVibe: typeof sajuVibe | undefined;
  const userMessage = state.input?.userMessage;

  if (userMessage && userMessage.trim().length > 0) {
    try {
      const estimatorPrompt = loadPrompt("vibe_estimator");

      const MsgVibeExtractionSchema = z.object({
        valence: z.number().min(0).max(10),
        arousal: z.number().min(0).max(10),
        energy: z.number().min(0).max(10),
        focus: z.number().min(0).max(10),
        socialLoad: z.number().min(0).max(10),
      });

      const fallbackMsgVibe = { ...historyVibe };

      messageVibe = await llmProvider.generateStructuredOutput(
        `User Message: "${userMessage}"\n\n위 메시지를 분석하여 5대 바이브 차원 점수 JSON을 반환하세요.`,
        estimatorPrompt,
        MsgVibeExtractionSchema,
        fallbackMsgVibe
      );
    } catch (e) {
      console.warn("[VibeEstimatorNode] LLM vibe extraction failed, using history/saju baseline.", e);
    }
  }

  // 4. Blending to compute final estimatedVibe
  let estimatedVibe = { ...historyVibe };
  if (messageVibe) {
    if (hasHistory) {
      estimatedVibe.valence = Math.round((0.5 * messageVibe.valence) + (0.3 * historyVibe.valence) + (0.2 * sajuVibe.valence));
      estimatedVibe.arousal = Math.round((0.5 * messageVibe.arousal) + (0.3 * historyVibe.arousal) + (0.2 * sajuVibe.arousal));
      estimatedVibe.energy = Math.round((0.5 * messageVibe.energy) + (0.3 * historyVibe.energy) + (0.2 * sajuVibe.energy));
      estimatedVibe.focus = Math.round((0.5 * messageVibe.focus) + (0.3 * historyVibe.focus) + (0.2 * sajuVibe.focus));
      estimatedVibe.socialLoad = Math.round((0.5 * messageVibe.socialLoad) + (0.3 * historyVibe.socialLoad) + (0.2 * sajuVibe.socialLoad));
    } else {
      estimatedVibe.valence = Math.round((0.6 * messageVibe.valence) + (0.4 * sajuVibe.valence));
      estimatedVibe.arousal = Math.round((0.6 * messageVibe.arousal) + (0.4 * sajuVibe.arousal));
      estimatedVibe.energy = Math.round((0.6 * messageVibe.energy) + (0.4 * sajuVibe.energy));
      estimatedVibe.focus = Math.round((0.6 * messageVibe.focus) + (0.4 * sajuVibe.focus));
      estimatedVibe.socialLoad = Math.round((0.6 * messageVibe.socialLoad) + (0.4 * sajuVibe.socialLoad));
    }
  } else {
    if (hasHistory) {
      estimatedVibe.valence = Math.round((0.6 * historyVibe.valence) + (0.4 * sajuVibe.valence));
      estimatedVibe.arousal = Math.round((0.6 * historyVibe.arousal) + (0.4 * sajuVibe.arousal));
      estimatedVibe.energy = Math.round((0.6 * historyVibe.energy) + (0.4 * sajuVibe.energy));
      estimatedVibe.focus = Math.round((0.6 * historyVibe.focus) + (0.4 * sajuVibe.focus));
      estimatedVibe.socialLoad = Math.round((0.6 * historyVibe.socialLoad) + (0.4 * sajuVibe.socialLoad));
    } else {
      estimatedVibe = {
        valence: Math.round(sajuVibe.valence),
        arousal: Math.round(sajuVibe.arousal),
        energy: Math.round(sajuVibe.energy),
        focus: Math.round(sajuVibe.focus),
        socialLoad: Math.round(sajuVibe.socialLoad),
      };
    }
  }

  const finalEstimatedVibe = {
    id: crypto.randomUUID(),
    userId: state.userId,
    valence: estimatedVibe.valence,
    arousal: estimatedVibe.arousal,
    energy: estimatedVibe.energy,
    focus: estimatedVibe.focus,
    socialLoad: estimatedVibe.socialLoad,
    createdAt: new Date().toISOString(),
  };

  return {
    estimatedVibe: finalEstimatedVibe,
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
    if (state.estimatedVibe) {
      vibe = state.estimatedVibe;
      warnings.push({
        code: "VIBE_CHECKIN_PARTIAL",
        message: "바이브 체크인 정보가 누락되어 AI 추정값으로 대체되었습니다.",
        node: "VibeCheckInParserNode",
        userVisible: true,
      });
    } else {
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
  const domainAxis =
    state.input?.focusAxes && state.input.focusAxes.length > 0
      ? state.input.focusAxes
      : [focus];

  // Recomposition feed-back loop
  const riskAxis: string[] = [];
  const intentAxis: string[] = [];
  const evidenceAxis: string[] = [];
  let executionHistorySummary:
    | {
        completionRate: number;
        recentTrend: "improving" | "stable" | "declining";
        deferredCount: number;
        recurringPatterns: string[];
      }
    | undefined;

  if (state.recentRunReceipts && state.recentRunReceipts.length > 0) {
    try {
      // Map RunReceiptSchema to RunReceiptEntry with accurate requiredActions vs completedActions
      const entries = state.recentRunReceipts.map(r => {
        const matchedForecast = state.recentForecastOutputs?.find(f => f.id === r.forecastOutputId);
        const forecastOutputJson = (matchedForecast?.outputJson || {}) as any;
        const forecastRequired: string[] | undefined =
          Array.isArray(forecastOutputJson.requiredActions) && forecastOutputJson.requiredActions.length > 0
            ? forecastOutputJson.requiredActions
            : Array.isArray(forecastOutputJson.actionPolicy?.requiredActions) &&
              forecastOutputJson.actionPolicy.requiredActions.length > 0
            ? forecastOutputJson.actionPolicy.requiredActions
            : undefined;

        const hasDid = Boolean(r.whatIDid && r.whatIDid.trim().length > 0 && r.whatIDid !== "N/A");
        const hasDeferred = Boolean(
          r.whatIDeferred && r.whatIDeferred.trim().length > 0 && r.whatIDeferred !== "N/A"
        );

        const completedActions = hasDid ? [r.whatIDid] : [];
        let requiredActions: string[];
        if (forecastRequired && forecastRequired.length > 0) {
          requiredActions = [...forecastRequired];
          if (hasDeferred && !requiredActions.includes(r.whatIDeferred!) && completedActions.length >= requiredActions.length) {
            requiredActions.push(r.whatIDeferred!);
          }
        } else {
          requiredActions = [
            ...(hasDid ? [r.whatIDid] : ["계획된 핵심 행동"]),
            ...(hasDeferred ? [r.whatIDeferred!] : []),
          ];
        }

        return {
          id: r.id || crypto.randomUUID(),
          date: r.createdAt || new Date().toISOString(),
          mode: (matchedForecast?.mode === "weekly" || matchedForecast?.mode === "monthly" ? matchedForecast.mode : "daily") as "daily" | "weekly" | "monthly",
          grade: matchedForecast?.grade || "A",
          requiredActions,
          forbiddenActions: hasDeferred ? [r.whatIDeferred!] : [],
          completedActions,
          vibeSnapshot: {
            valence: state.vibeCheckIn?.valence ?? 5,
            arousal: state.vibeCheckIn?.arousal ?? 5,
            energy: state.vibeCheckIn?.energy ?? 5,
            focus: state.vibeCheckIn?.focus ?? 5,
            socialLoad: state.vibeCheckIn?.socialLoad ?? 5,
          },
        };
      });

      const recomposed = recomposeFromReceipts(entries);

      if (recomposed.recentTrend === "declining") {
        riskAxis.push("declining_trend");
      }
      if (recomposed.completionRate < 0.5) {
        intentAxis.push("reduce_scope");
      }
      evidenceAxis.push(`completionRate:${recomposed.completionRate}`);
      recomposed.recurringPatterns.forEach(p => {
        evidenceAxis.push(`recurring_pattern:${p}`);
      });

      executionHistorySummary = {
        completionRate: recomposed.completionRate,
        recentTrend: recomposed.recentTrend,
        deferredCount: entries.filter(e => e.forbiddenActions.length > 0).length,
        recurringPatterns: recomposed.recurringPatterns,
      };
    } catch (err) {
      console.warn("[ContextTensorBuilderNode] Failed to run recomposition:", err);
    }
  }

  const nowYear = new Date().getFullYear();
  const birthYear = parseInt(state.birthProfile?.birthDateTime.substring(0, 4) || "2000");
  const currentAge = nowYear - birthYear + 1;
  const currentMajorLuckCycle = state.majorLuck?.cycles.find(c => currentAge >= c.startAge && currentAge < c.startAge + 10)?.ganzhi || "";

  // Calculate Vibe Sync Score
  if (state.vibeCheckIn && state.chart) {
    try {
      const syncResult = calculateVibeSyncScore(
        state.vibeCheckIn,
        state.chart.dayMaster?.yongSin,
        state.chart.dayMaster?.element
      );
      evidenceAxis.push(`syncScore:${syncResult.syncScore}`);
      evidenceAxis.push(`dominantVibeElement:${syncResult.dominantVibeElement}`);
      
      // Calculate alignment score between manual check-in and estimated vibe
      if (state.estimatedVibe) {
        const valenceDiff = Math.abs((state.vibeCheckIn.valence ?? 5) - (state.estimatedVibe.valence ?? 5));
        const arousalDiff = Math.abs((state.vibeCheckIn.arousal ?? 5) - (state.estimatedVibe.arousal ?? 5));
        const energyDiff = Math.abs((state.vibeCheckIn.energy ?? 5) - (state.estimatedVibe.energy ?? 5));
        const focusDiff = Math.abs((state.vibeCheckIn.focus ?? 5) - (state.estimatedVibe.focus ?? 5));
        const socialDiff = Math.abs((state.vibeCheckIn.socialLoad ?? 5) - (state.estimatedVibe.socialLoad ?? 5));
        const totalDiff = valenceDiff + arousalDiff + energyDiff + focusDiff + socialDiff;
        const alignmentScore = Math.max(0, 100 - (totalDiff * 2));
        evidenceAxis.push(`estimatedAlignmentScore:${alignmentScore}`);
      }
    } catch (e) {
      console.warn("[ContextTensorBuilderNode] Failed to calculate Vibe Sync Score:", e);
    }
  }

  const channelAxis =
    state.input?.forecastScope === "weekly"
      ? ("weekly_review" as const)
      : state.input?.forecastScope === "monthly"
      ? ("monthly_plan" as const)
      : ("daily_board" as const);

  const contextTensor = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    domainAxis,
    userStateAxis: {
      valence: state.vibeCheckIn?.valence ?? 5,
      arousal: state.vibeCheckIn?.arousal ?? 5,
      energy: state.vibeCheckIn?.energy ?? 5,
      focus: state.vibeCheckIn?.focus ?? 5,
      socialLoad: state.vibeCheckIn?.socialLoad ?? 5,
    },
    riskAxis,
    intentAxis,
    evidenceAxis,
    temporalAxis: {
      majorLuck: currentMajorLuckCycle,
      annualLuck: state.annualLuck?.pillar.label,
      monthlyLuck: state.monthlyLuck?.pillar.label,
      dailyLuck: state.dailyLuck?.pillar.label,
    },
    channelAxis,
    ...(executionHistorySummary ? { executionHistorySummary } : {}),
    createdAt: new Date().toISOString(),
  };

  // Schema-First Rule: Validate the contextTensor using ContextTensorSchema
  try {
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
  
  const focus = state.input?.currentFocus || "general";
  const energy = state.vibeCheckIn?.energy ?? 5;
  const arousal = state.vibeCheckIn?.arousal ?? 5;
  const valence = state.vibeCheckIn?.valence ?? 5;
  const vFocus = state.vibeCheckIn?.focus ?? 5;
  const socialLoad = state.vibeCheckIn?.socialLoad ?? 5;
  
  // Deterministic State Machine Logic (GAP-10) + Canonical IDs from loadTcoPacks()
  const packs = loadTcoPacks();
  const packConceptIds = new Set(packs.concepts.map(c => c.id));

  const active: string[] = [];
  const suppressed: string[] = [];
  const gaps: string[] = [];
  const evidenceGaps: string[] = [];
  const boundaryGaps: string[] = [];
  const conversionGaps: string[] = [];

  let coreConceptState = `${focus}.baseline`;
  
  if (energy >= 7 && valence >= 6) {
    coreConceptState = `${focus}.expansion`;
    active.push(`${focus}.execution`);
    suppressed.push(`${focus}.over_planning`);
  } else if (energy <= 4) {
    coreConceptState = `${focus}.recovery`;
    active.push(`${focus}.preservation`);
    suppressed.push(`${focus}.new_initiatives`);
  } else {
    coreConceptState = `${focus}.maintenance`;
    active.push(`${focus}.stabilization`);
  }

  if (arousal >= 8) {
    active.push("emotional.regulation");
    gaps.push("calmness_check");
  }

  active.push(`element.${dmElem}.alignment`);

  // Map chart elements to canonical concept IDs from bazi_luck_pack
  const ELEMENT_CONCEPT_MAP: Record<string, string> = {
    wood: "element.wood.expansion",
    fire: "element.fire.expression",
    earth: "element.earth.stabilization",
    metal: "element.metal.boundary",
    water: "element.water.recovery",
  };
  if (ELEMENT_CONCEPT_MAP[dmElem] && packConceptIds.has(ELEMENT_CONCEPT_MAP[dmElem])) {
    active.push(ELEMENT_CONCEPT_MAP[dmElem]);
  }
  if (state.dailyLuck?.pillar) {
    const dailyStemEl = STEM_ELEMENTS[state.dailyLuck.pillar.stem as keyof typeof STEM_ELEMENTS];
    if (dailyStemEl && ELEMENT_CONCEPT_MAP[dailyStemEl]) {
      active.push(ELEMENT_CONCEPT_MAP[dailyStemEl]);
    }
  }

  // Map vibe check-in values to canonical concept IDs from vibe_state_pack
  if (arousal >= 7) active.push("vibe.high_arousal");
  if (energy <= 4) active.push("vibe.low_energy");
  if (vFocus >= 7) active.push("vibe.high_focus");
  if (socialLoad >= 7) active.push("vibe.high_social_load");

  // Map focus domains to canonical action/evidence/recovery concepts from packs
  if (focus === "business_finance" || focus === "reputation_branding") {
    active.push("pricing_matrix", "productized_sales", "founder_proof");
    if (arousal >= 7) {
      active.push("scope_boundary", "element.fire.expression");
      boundaryGaps.push("scope_boundary_check");
    }
    if (energy <= 4) {
      active.push("burnout_guard");
    }
    evidenceGaps.push("market_proof_validation");
    conversionGaps.push("offer_scope_definition");
  } else if (focus === "relationship_love") {
    active.push("warmth_signal", "non_possessive_support");
    if (socialLoad >= 7 || arousal >= 7) {
      active.push("projectification_risk");
      boundaryGaps.push("autonomy_preservation");
    }
    evidenceGaps.push("small_warmth_signal_check");
    conversionGaps.push("short_message_conversion");
  } else if (focus === "health_recovery") {
    active.push("sleep_protection", "silent_walk");
    boundaryGaps.push("overwork_cutoff");
    evidenceGaps.push("sleep_and_rest_log");
    conversionGaps.push("recovery_routine_lock");
  } else {
    evidenceGaps.push("daily_execution_record");
    boundaryGaps.push("scope_boundary_check");
    conversionGaps.push("single_next_action_definition");
  }

  if (arousal >= 7 && energy <= 4) {
    active.push("decision_delay");
  }

  const canonicalActive = Array.from(new Set(active));

  const fallbackLLMOutput = {
    coreConceptState,
    activeConcepts: canonicalActive,
    suppressedConcepts: Array.from(new Set(suppressed)),
    conceptGaps: gaps.length > 0 ? gaps : [`${focus}.execution_alignment`],
    evidenceGaps,
    boundaryGaps,
    conversionGaps,
    confidence: 0.8,
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
      `Canonical TCO Concepts: ${canonicalActive.join(", ")}`,
      "",
      "Return ConceptState JSON only. Do not calculate chart values.",
    ].join("\n");

    const generated = await llmProvider.generateStructuredOutput(
      contextForLLM,
      systemPrompt,
      ConceptCanonLLMOutputSchema,
      fallbackLLMOutput
    );
    llmResult = {
      ...generated,
      activeConcepts: Array.from(new Set([...canonicalActive, ...(generated.activeConcepts || [])])),
      conceptGaps: generated.conceptGaps?.length ? generated.conceptGaps : fallbackLLMOutput.conceptGaps,
      evidenceGaps: generated.evidenceGaps?.length ? generated.evidenceGaps : fallbackLLMOutput.evidenceGaps,
      boundaryGaps: generated.boundaryGaps?.length ? generated.boundaryGaps : fallbackLLMOutput.boundaryGaps,
      conversionGaps: generated.conversionGaps?.length ? generated.conversionGaps : fallbackLLMOutput.conversionGaps,
    };
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
  const valence = state.vibeCheckIn?.valence ?? 5;
  const arousal = state.vibeCheckIn?.arousal ?? 5;
  const energy = state.vibeCheckIn?.energy ?? 5;
  const focus = state.vibeCheckIn?.focus ?? 5;
  const socialLoad = state.vibeCheckIn?.socialLoad ?? 5;

  const focusDomains = new Set<string>([
    ...(state.input?.focusAxes || []),
    ...(state.input?.currentFocus ? [state.input.currentFocus] : []),
  ]);

  // 1. Count ten gods occurrences
  const tenGods = state.chart?.tenGods || {};
  const tenGodsList = Object.values(tenGods);
  const pyeonGwanCount = tenGodsList.filter(tg => tg === "편관").length;
  const sangGwanCount = tenGodsList.filter(tg => tg === "상관").length;
  const pyeonInCount = tenGodsList.filter(tg => tg === "편인").length;
  const biGeopCount = tenGodsList.filter(tg => tg === "비견" || tg === "겁재").length;
  const jeongInCount = tenGodsList.filter(tg => tg === "정인").length;

  // 2. Check divine killers
  const killers = state.chart ? analyzeDivineKillers(state.chart) : [];
  const hasDoHwa = killers.some(k => k.type === "도화살");
  const hasYeokMa = killers.some(k => k.type === "역마살");
  const hasGwiMun = killers.some(k => k.type === "귀문관살");

  // 3. Check period interactions (세운)
  let annualClash = false;
  let annualPenalty = false;
  if (state.chart && state.annualLuck) {
    try {
      const interactions = analyzePeriodInteractions(state.chart, state.annualLuck.pillar, "annual");
      annualClash = interactions.some(c => c.type === "clash");
      annualPenalty = interactions.some(c => c.type === "penalty");
    } catch (e) {
      console.warn("[RiskVectorizerNode] Failed to check annual interactions:", e);
    }
  }

  // 4. Calculate personalized risk scores (GAP-04: 8 Baseline Rules + Domain Adjustments)
  const cap = (val: number) => Math.min(1.0, Math.max(0.0, Math.round(val * 100) / 100));
  const dmWeak = state.chart?.dayMaster?.strength?.judgment === "weak";
  const rlhfSensitivity = state.rlhfBias?.risk_sensitivity ?? 1.0;

  // Domain-specific offsets
  const isBusiness = focusDomains.has("business_finance");
  const isRelationship = focusDomains.has("relationship_love");
  const isHealth = focusDomains.has("health_recovery");
  const isBranding = focusDomains.has("reputation_branding");
  const isLegal = focusDomains.has("risk_legal_safety");
  const isLearning = focusDomains.has("learning_writing_research");
  
  // 1) Burnout: High when energy is low, or socialLoad is high + weak day master
  const burnoutBase = energy <= 3 ? 0.7 : (energy <= 5 ? 0.4 : 0.1);
  const burnoutDomainBoost = (isHealth ? 0.15 : 0.0) + (energy <= 4 && arousal >= 6 && !isBusiness ? 0.2 : 0.0);
  const burnout = cap((burnoutBase + burnoutDomainBoost + (socialLoad > 7 && dmWeak ? 0.3 : 0.0) + (pyeonGwanCount >= 2 ? 0.1 : 0.0)) * rlhfSensitivity);

  // 2) Overextension: High when energy is high but focus is low, plus 역마살
  const overextensionBase = (energy >= 7 && focus <= 4) ? 0.6 : 0.2;
  const overextensionDomainBoost = (isBusiness && arousal >= 7 && energy >= 6) ? 0.2 : 0.0;
  const overextension = cap((overextensionBase + overextensionDomainBoost + (hasYeokMa ? 0.2 : 0.0)) * rlhfSensitivity);

  // 3) Scope Leak: High when focus is low, plus 세운 충, plus 상관 과다, plus business focus with high arousal
  const scopeLeakBase = focus <= 3 ? 0.6 : 0.2;
  const scopeLeakDomainBoost = isBusiness ? (arousal >= 7 ? 0.45 : 0.15) : (isBranding ? 0.1 : 0.0);
  const scopeLeak = cap((scopeLeakBase + scopeLeakDomainBoost + (annualClash ? 0.2 : 0.0) + (sangGwanCount >= 2 ? 0.1 : 0.0)) * rlhfSensitivity);

  // 4) Overclaim: High when arousal and valence are high, plus 상관 과다, plus branding/business focus
  const overclaimBase = (arousal >= 7 && valence >= 7) ? 0.6 : 0.1;
  const overclaimDomainBoost = (isBranding ? 0.2 : 0.0) + (isBusiness ? 0.1 : 0.0);
  const overclaim = cap((overclaimBase + overclaimDomainBoost + (sangGwanCount >= 2 ? 0.2 : 0.0)) * rlhfSensitivity);

  // 5) Emotional Overreaction: Low valence or high arousal, plus 도화살/귀문관살, plus relationship + high socialLoad
  const emotionalBase = (valence <= 3 || arousal >= 8) ? 0.5 : 0.1;
  const emotionalDomainBoost = isRelationship && (socialLoad >= 7 || arousal >= 7) ? 0.25 : 0.0;
  const emotionalOverreaction = cap((emotionalBase + emotionalDomainBoost + (hasDoHwa ? 0.15 : 0.0) + (hasGwiMun ? 0.15 : 0.0)) * rlhfSensitivity);

  // 6) Legal/Safety Risk: 편관 과다 또는 세운 형살 또는 legal/safety domain
  const legalBase = (pyeonGwanCount >= 2) ? 0.4 : 0.1;
  const legalDomainBoost = isLegal ? 0.25 : 0.0;
  const legalSafetyRisk = cap((legalBase + legalDomainBoost + (annualPenalty ? 0.3 : 0.0) + (annualClash ? 0.1 : 0.0)) * rlhfSensitivity);

  // 7) Relationship Dryness: Low social load and low valence, plus 편인/비겁 과다, plus relationship focus
  const drynessBase = (socialLoad <= 3 && valence <= 4) ? 0.5 : 0.1;
  const drynessDomainBoost = isRelationship ? (valence <= 5 || socialLoad >= 7 ? 0.4 : 0.15) : 0.0;
  const relationshipDryness = cap((drynessBase + drynessDomainBoost + (pyeonInCount >= 2 ? 0.2 : 0.0) + (biGeopCount >= 3 ? 0.15 : 0.0)) * rlhfSensitivity);

  // 8) Missed Opportunity: Low energy and low arousal, plus 정인 과다 (생각만 많음)
  const missedBase = (energy <= 4 && arousal <= 4) ? 0.5 : 0.1;
  const missedDomainBoost = isLearning ? 0.15 : 0.0;
  const missedOpportunity = cap((missedBase + missedDomainBoost + (jeongInCount >= 2 ? 0.2 : 0.0)) * rlhfSensitivity);

  // Find primaryRisk and secondaryRisk dynamically
  const riskMap = {
    overextension,
    scopeLeak,
    overclaim,
    burnout,
    relationshipDryness,
    emotionalOverreaction,
    legalSafetyRisk,
    missedOpportunity,
  };
  const sortedRisks = Object.entries(riskMap).sort(([, a], [, b]) => b - a);
  const primaryRisk = (sortedRisks[0]?.[0] || "overextension") as any;
  const secondaryRisk = (sortedRisks[1]?.[0] || "scopeLeak") as any;

  const riskVector = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    ...riskMap,
    deterministicFortuneRisk: 0,
    relationshipManipulationRisk: 0,
    primaryRisk,
    secondaryRisk,
    createdAt: new Date().toISOString(),
  };

  // Schema-First Rule: Validate Schema
  try {
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

// 6-level Operator Hierarchy rank:
// Safety (6) > BoundaryLock (5) > DelayCommit (4) > ReduceScope (3) > Consolidate (2) > Expand (1)
const OPERATOR_HIERARCHY_RANK: Record<string, number> = {
  Safety: 6,
  BoundaryLock: 5,
  DelayCommit: 4,
  Recovery: 4,
  ReduceScope: 3,
  Cleanup: 3,
  Consolidate: 2,
  Consolidation: 2,
  Expand: 1,
  Expansion: 1,
};

const HIERARCHY_TO_POLICY_MODE: Record<string, "Recovery" | "Cleanup" | "Consolidation" | "Expansion"> = {
  Safety: "Recovery",
  BoundaryLock: "Cleanup",
  DelayCommit: "Recovery",
  Recovery: "Recovery",
  ReduceScope: "Cleanup",
  Cleanup: "Cleanup",
  Consolidate: "Consolidation",
  Consolidation: "Consolidation",
  Expand: "Expansion",
  Expansion: "Expansion",
};

// 11. OperatorExecutorNode
export async function OperatorExecutorNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "OperatorExecutorNode"];
  const rules = tcoPackLoader.loadOperatorRules();
  const matched: any[] = [];

  const activeDomains = Array.from(
    new Set([
      ...(state.input?.focusAxes || []),
      ...(state.input?.currentFocus ? [state.input.currentFocus] : []),
      ...(state.contextTensor?.domainAxis || []),
    ])
  );
  const activeConcepts = state.conceptState?.activeConcepts || [];
  const dmElem = state.chart?.dayMaster?.element || "";
  const vibe = state.vibeCheckIn || state.estimatedVibe || {
    valence: 5,
    arousal: 5,
    energy: 5,
    focus: 5,
    socialLoad: 5,
  };
  const rv = (state.riskVector || {}) as Record<string, any>;

  const getRiskVal = (k: string): number => {
    if (typeof rv[k] === "number") return rv[k];
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (typeof rv[camel] === "number") return rv[camel];
    return 0;
  };

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const trigger = rule.trigger || {};
    const ruleDomains = trigger.domains || trigger.domain || [];
    const hasRiskThresholds = Boolean(trigger.risk_thresholds && Object.keys(trigger.risk_thresholds).length > 0);
    const hasLegacyRisk = Boolean(trigger.risk && trigger.risk.length > 0);
    const hasVibeConditions = Boolean(trigger.vibe_conditions && Object.keys(trigger.vibe_conditions).length > 0);
    const hasActiveConcepts = Boolean(trigger.active_concepts && trigger.active_concepts.length > 0);
    const hasElements = Boolean(trigger.elements && trigger.elements.length > 0);

    // 1. Domain check
    const domainMatched = ruleDomains.length === 0 || ruleDomains.some(d => (activeDomains as readonly string[]).includes(d));

    // 2. Risk thresholds / legacy risk check
    let riskMatched = true;
    if (hasRiskThresholds) {
      riskMatched = Object.entries(trigger.risk_thresholds!).every(
        ([k, threshold]) => getRiskVal(k) >= Number(threshold)
      );
    } else if (hasLegacyRisk) {
      riskMatched = trigger.risk!.some(k => getRiskVal(k) >= 0.6);
    }

    // 3. Vibe conditions check
    let vibeMatched = true;
    if (hasVibeConditions) {
      const vc = trigger.vibe_conditions!;
      if (vc.arousal_min !== undefined && (vibe.arousal ?? 5) < vc.arousal_min) vibeMatched = false;
      if (vc.arousal_max !== undefined && (vibe.arousal ?? 5) > vc.arousal_max) vibeMatched = false;
      if (vc.energy_min !== undefined && (vibe.energy ?? 5) < vc.energy_min) vibeMatched = false;
      if (vc.energy_max !== undefined && (vibe.energy ?? 5) > vc.energy_max) vibeMatched = false;
      if (vc.valence_min !== undefined && (vibe.valence ?? 5) < vc.valence_min) vibeMatched = false;
      if (vc.valence_max !== undefined && (vibe.valence ?? 5) > vc.valence_max) vibeMatched = false;
      if (vc.focus_min !== undefined && (vibe.focus ?? 5) < vc.focus_min) vibeMatched = false;
      if (vc.focus_max !== undefined && (vibe.focus ?? 5) > vc.focus_max) vibeMatched = false;
      if (vc.social_load_min !== undefined && (vibe.socialLoad ?? 5) < vc.social_load_min) vibeMatched = false;
      if (vc.social_load_max !== undefined && (vibe.socialLoad ?? 5) > vc.social_load_max) vibeMatched = false;
    }

    // 4. Active concepts / elements check
    let conceptMatched = true;
    if (hasActiveConcepts) {
      const hasConcept = trigger.active_concepts!.some(c => activeConcepts.includes(c));
      const hasDomainRiskVibe =
        ruleDomains.length > 0 && domainMatched && hasRiskThresholds && riskMatched && hasVibeConditions && vibeMatched;
      conceptMatched = hasConcept || hasDomainRiskVibe;
    }
    if (hasElements) {
      if (!trigger.elements!.includes(dmElem)) conceptMatched = false;
    }

    const hasAnyCondition =
      ruleDomains.length > 0 || hasRiskThresholds || hasLegacyRisk || hasVibeConditions || hasActiveConcepts || hasElements;

    const fullMatch = hasAnyCondition && domainMatched && riskMatched && vibeMatched && conceptMatched;
    const legacyDomainMatch =
      !fullMatch &&
      ruleDomains.length > 0 &&
      domainMatched &&
      !hasVibeConditions &&
      (riskMatched || !hasRiskThresholds);

    if (fullMatch || legacyDomainMatch) {
      const rawPolicyMode = rule.output_policy?.mode || rule.output?.policy_mode || "Consolidation";
      const operatorLabel = rule.operator || rule.output?.policy_mode || rawPolicyMode;
      matched.push({
        operatorId: rule.operator_id || rule.id,
        operator: operatorLabel,
        priority: rule.priority ?? 50,
        mode: HIERARCHY_TO_POLICY_MODE[rawPolicyMode] || "Consolidation",
        warmthVsCompetence:
          rule.output_policy?.warmthVsCompetence ||
          (rule.output?.warmth_vs_competence as any) ||
          "Balanced",
        requiredActions:
          rule.output_policy?.requiredActions ||
          rule.output?.required_actions ||
          [],
        forbiddenActions:
          rule.output_policy?.forbiddenActions ||
          rule.output?.forbidden_actions ||
          [],
        deferredActions:
          rule.output_policy?.deferredActions ||
          rule.output?.deferred_actions ||
          [],
        boundaryNotes:
          rule.output_policy?.boundaryNotes ||
          rule.output?.boundary_notes ||
          [],
      });
    }
  }

  // Sort matched rules by priority descending
  matched.sort((a, b) => (b.priority ?? 50) - (a.priority ?? 50));

  if (matched.length === 0) {
    const energy = vibe.energy ?? 5;
    const focus = vibe.focus ?? 5;
    const burnoutRisk = state.riskVector?.burnout ?? 0;
    const scopeLeakRisk = state.riskVector?.scopeLeak ?? 0;

    let defaultMode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery" = "Consolidation";
    let defaultOperator = "Consolidate";
    if (burnoutRisk >= 0.6 || energy <= 3) {
      defaultMode = "Recovery";
      defaultOperator = "DelayCommit";
    } else if (scopeLeakRisk >= 0.6) {
      defaultMode = "Cleanup";
      defaultOperator = "ReduceScope";
    } else if (energy >= 7 && focus >= 7 && burnoutRisk < 0.3) {
      defaultMode = "Expansion";
      defaultOperator = "Expand";
    }

    matched.push({
      operatorId: "op.default_baseline",
      operator: defaultOperator,
      priority: 10,
      mode: defaultMode,
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
  const outputs = [...(state.operatorOutputs || [])] as any[];

  // Sort by priority descending first, then by 6-level hierarchy rank:
  // Safety > BoundaryLock > DelayCommit > ReduceScope > Consolidate > Expand
  outputs.sort((a, b) => {
    const prioDiff = (b.priority ?? 50) - (a.priority ?? 50);
    if (prioDiff !== 0) return prioDiff;
    const rankA = OPERATOR_HIERARCHY_RANK[a.operator || a.mode || "Consolidation"] ?? 2;
    const rankB = OPERATOR_HIERARCHY_RANK[b.operator || b.mode || "Consolidation"] ?? 2;
    return rankB - rankA;
  });

  let requiredActions = Array.from(new Set(outputs.flatMap(o => o.requiredActions || [])));
  let forbiddenActions = Array.from(new Set(outputs.flatMap(o => o.forbiddenActions || [])));
  let deferredActions = Array.from(new Set(outputs.flatMap(o => o.deferredActions || [])));
  const boundaryNotes = Array.from(new Set(outputs.flatMap(o => o.boundaryNotes || [])));

  if (requiredActions.length === 0) {
    requiredActions = ["오늘 해야 할 가장 핵심적인 일 1가지만 정의하고 마감하기"];
  }
  if (forbiddenActions.length === 0) {
    forbiddenActions = ["충동적인 추가 약속 조율하기"];
  }
  if (deferredActions.length === 0) {
    deferredActions = ["무리한 신규 전략 회의 소집"];
  }
  if (boundaryNotes.length === 0) {
    boundaryNotes.push("과로 금지, 충분한 수면 확보");
  }

  if (state.rlhfBias?.action_count_limit && state.rlhfBias.action_count_limit > 0) {
    requiredActions = requiredActions.slice(0, state.rlhfBias.action_count_limit);
  }

  state.safetyFlags?.forEach(f => {
    if (f.message && !boundaryNotes.includes(f.message)) {
      boundaryNotes.push(f.message);
    }
  });

  // Apply 6-level priority hierarchy to resolve final policy mode
  const hasHighSafetyFlag = state.safetyFlags?.some(f => f.severity === "critical" || f.severity === "high");
  const topOutput = outputs[0];
  let resolvedMode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery" =
    HIERARCHY_TO_POLICY_MODE[topOutput?.mode || topOutput?.operator || "Consolidation"] || "Consolidation";

  if (hasHighSafetyFlag && resolvedMode === "Expansion") {
    resolvedMode = "Cleanup";
  }

  const actionPolicy = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    mode: resolvedMode,
    warmthVsCompetence: topOutput?.warmthVsCompetence || "Balanced",
    requiredActions,
    forbiddenActions,
    deferredActions,
    boundaryNotes,
    reviewQuestions: ["핵심 지침 1가지를 지켰나요?"],
    createdAt: new Date().toISOString(),
  };

  try {
    ActionPolicySchema.parse(actionPolicy);
  } catch (err) {
    console.warn("[PolicyBinderNode] Schema validation failed:", err);
  }

  return {
    actionPolicy,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 13. ForecastWriterNode
// Zod schema for the LLM's forecast writer output
const DomainForecastLLMSchema = z.object({
  domain: z.enum(["business_finance", "relationship_love", "health_recovery",
                   "learning_writing_research", "reputation_branding", "risk_legal_safety"]),
  headline: z.string().min(5),
  narrative: z.string().min(50),
  elementInfluence: z.enum(["wood", "fire", "earth", "metal", "water"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  policyMode: z.enum(["Expansion", "Consolidation", "Cleanup", "Recovery"]),
  requiredActions: z.array(z.string()).default([]),
  forbiddenActions: z.array(z.string()).default([]),
});

const ForecastWriterLLMOutputSchema = z.object({
  summary: z.string().min(1),
  conceptStateDescription: z.string().min(1),
  actionPolicyExplanation: z.string().min(1),
  vibeInterpretation: z.string().optional(),
  riskNarrative: z.string().optional(),
  reflectionQuestion: z.string().optional(),
  outputMarkdown: z.string().min(1),
  // Rich output fields for SOTA 6-domain forecast
  structuralPriorSummary: z.string().optional(),
  vibeSummary: z.string().optional(),
  domainForecasts: z.array(DomainForecastLLMSchema).optional(),
});

function buildBestTimeWindows(
  yongSin?: string,
  policyMode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery" = "Consolidation"
) {
  const el = (yongSin || "").toLowerCase();
  if (el === "wood" || el === "목" || el === "木") {
    return [
      { window: "07:00–09:30", focus: "기획 및 핵심 과제 착수", mode: policyMode },
      { window: "10:00–12:00", focus: "집중 실행 및 근거 문서화", mode: "Consolidation" },
      { window: "15:00–16:30", focus: "범위 점검 및 마무리", mode: "Cleanup" },
    ];
  }
  if (el === "fire" || el === "화" || el === "火") {
    return [
      { window: "09:30–11:30", focus: "핵심 소통 및 제안 정리", mode: policyMode },
      { window: "13:30–15:30", focus: "검토·정리 및 경계선 점검", mode: "Cleanup" },
      { window: "20:00–21:30", focus: "저각성 회복 및 결정 유예", mode: "Recovery" },
    ];
  }
  if (el === "water" || el === "수" || el === "水") {
    return [
      { window: "10:00–12:00", focus: "핵심 과제 집중 및 근거 확보", mode: policyMode },
      { window: "15:00–17:00", focus: "심층 리서치 및 구조화", mode: "Consolidation" },
      { window: "21:00–22:30", focus: "하루 회고 및 수면 보호", mode: "Recovery" },
    ];
  }
  return [
    { window: "09:00–11:30", focus: "핵심 과제 집중 및 근거 확보", mode: policyMode },
    { window: "14:00–16:00", focus: "검토·정리 및 경계선 점검", mode: "Cleanup" },
    { window: "20:30–22:00", focus: "디지털 디톡스 및 회복 루틴", mode: "Recovery" },
  ];
}

function buildDefaultReflectionQuestion(primaryRisk?: string, focus?: string): string {
  const RISK_QUESTIONS: Record<string, string> = {
    burnout: "오늘 에너지 소모를 줄이기 위해 지금 당장 내려놓을 수 있는 부차적 과업 1가지는 무엇인가요?",
    scopeLeak: "오늘 진행 중인 일에서 '포함할 범위'와 '제외할 범위'를 명확히 구분했나요?",
    overclaim: "오늘 전달하려는 메시지나 제안에서 사실(근거)과 기대(보장)를 분리했나요?",
    overextension: "새로운 일을 벌이기 전에 현재 마무리해야 할 가장 중요한 1가지는 무엇인가요?",
    relationshipDryness: "오늘 상대방의 선택권을 존중하면서 건넬 수 있는 짧고 따뜻한 안부는 무엇인가요?",
    emotionalOverreaction: "지금 느끼는 긴장감 속에서 24시간 뒤로 미뤄도 되는 결정은 무엇인가요?",
    legalSafetyRisk: "중요한 계약이나 결정을 앞두고 전문가의 검토나 명확한 기준선을 확인했나요?",
    missedOpportunity: "생각만 하고 미뤄둔 일 중 오늘 15분 안에 시작할 수 있는 가장 작은 행동은 무엇인가요?",
  };
  if (primaryRisk && RISK_QUESTIONS[primaryRisk]) {
    return RISK_QUESTIONS[primaryRisk];
  }
  return `오늘 ${focus || "핵심 영역"}에서 반드시 완수할 행동 1가지와 과감히 보류할 결정 1가지는 무엇인가요?`;
}

function buildDefaultDomainForecasts(state: VibeFortuneAgentState) {
  const dayStem = state.chart?.dayMaster?.stem || "丙";
  const dailyLabel = state.dailyLuck?.pillar?.label || "甲子";
  const energy = state.vibeCheckIn?.energy ?? 6;
  const focusScore = state.vibeCheckIn?.focus ?? 6;
  const baseScore = Math.min(95, Math.max(55, Math.round((energy + focusScore) * 4.5 + 30)));
  const baseGrade = baseScore >= 85 ? "S" : baseScore >= 75 ? "A" : baseScore >= 65 ? "B" : "C";

  return [
    {
      domain: "business_finance" as const,
      domainLabel: "사업·재무",
      grade: baseGrade,
      score: baseScore,
      headline: "핵심 수치 점검과 범위 통제를 통한 안정적 성과 확보",
      insight: `일간 ${dayStem}과 일진 ${dailyLabel} 흐름에서 무리한 확장보다 기존 핵심 과제의 정량적 근거를 다지는 것이 유리합니다.`,
      doAction: "핵심 지표 및 현금흐름 점검표 1건 업데이트하기",
      dontAction: "충동적 대규모 지출이나 검증되지 않은 신규 약정 체결",
      manseBasis: `일간 ${dayStem} · 일운 ${dailyLabel}`,
      bestTimeWindow: "09:00–11:30",
    },
    {
      domain: "relationship_love" as const,
      domainLabel: "관계·사랑",
      grade: baseGrade,
      score: Math.max(55, baseScore - 3),
      headline: "상대방의 자율성을 존중하는 명확하고 따뜻한 소통",
      insight: "감정적 추측이나 과도한 해석을 줄이고 짧고 진솔한 안부로 신뢰 경계를 유지하세요.",
      doAction: "핵심 파트너나 소중한 사람에게 짧은 감사·안부 메시지 전하기",
      dontAction: "상대의 의도를 단정하거나 심리적 압박을 주는 대화",
      manseBasis: `일간 ${dayStem} · 일운 ${dailyLabel}`,
      bestTimeWindow: "13:00–15:00",
    },
    {
      domain: "health_recovery" as const,
      domainLabel: "건강·회복",
      grade: energy >= 6 ? "A" : "B",
      score: Math.min(95, Math.max(50, energy * 9)),
      headline: "에너지 누수 차단과 수면·수분 리듬 회복",
      insight: `현재 에너지(${energy}/10) 수준에 맞춰 카페인 의존을 줄이고 규칙적인 휴식 구간을 확보해야 합니다.`,
      doAction: "가벼운 스트레칭 15분 및 취침 전 디지털 디톡스 실천하기",
      dontAction: "야간 과로 및 수면 시간을 깎는 무리한 일정 소화",
      manseBasis: `일간 ${dayStem} · 용신 ${state.chart?.dayMaster?.yongSin || "water"}`,
      bestTimeWindow: "21:00–23:00",
    },
    {
      domain: "learning_writing_research" as const,
      domainLabel: "학습·글쓰기·연구",
      grade: focusScore >= 6 ? "A" : "B",
      score: Math.min(95, Math.max(55, focusScore * 9)),
      headline: "단일 주제 심층 정리와 핵심 근거 문서화",
      insight: "산발적인 정보 수집을 멈추고 지금 다루는 핵심 주제를 한 페이지 요약본으로 구조화할 때입니다.",
      doAction: "핵심 연구·학습 노트 1건 요약 및 근거 출처 정리하기",
      dontAction: "목적 없는 멀티태스킹과 끝없는 탭 열어두기",
      manseBasis: `일간 ${dayStem} · 일운 ${dailyLabel}`,
      bestTimeWindow: "10:00–12:00",
    },
    {
      domain: "reputation_branding" as const,
      domainLabel: "평판·브랜딩",
      grade: baseGrade,
      score: Math.max(55, baseScore - 2),
      headline: "과장 없는 실증 데이터 기반의 신뢰 구축",
      insight: "화려한 수사보다 검증된 결과물 하나가 장기적인 평판 자산을 만듭니다.",
      doAction: "대외 공유 전 사실관계와 수치 근거 1회 교차 검증하기",
      dontAction: "근거가 확정되지 않은 성과의 성급한 외부 공표",
      manseBasis: `일간 ${dayStem} · 일운 ${dailyLabel}`,
      bestTimeWindow: "14:00–16:00",
    },
    {
      domain: "risk_legal_safety" as const,
      domainLabel: "리스크·법무·안전",
      grade: "A",
      score: 82,
      headline: "계약·약정 경계선 재확인 및 의사결정 유예 원칙 준수",
      insight: "중요한 서명이나 합의는 최소 24시간의 검토 여유를 두고 전문가 기준선을 확인하세요.",
      doAction: "중요 약정·일정의 책임 범위와 해지·변경 조건 체크리스트 점검하기",
      dontAction: "세부 조항 확인 없는 구두 합의나 즉석 서명",
      manseBasis: `일간 ${dayStem} · 리스크 ${state.riskVector?.primaryRisk || "overextension"}`,
      bestTimeWindow: "15:00–17:00",
    },
  ];
}

export async function ForecastWriterNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ForecastWriterNode"];
  
  if (state.errors && state.errors.length > 0) {
    return {
      runtime: { ...state.runtime, nodeHistory: history },
    };
  }

  const scope = state.input?.forecastScope || "daily";
  const focus = state.input?.currentFocus || "business_finance";
  const policyMode = state.actionPolicy?.mode || "Consolidation";
  const bestTimeWindows = buildBestTimeWindows(state.chart?.dayMaster?.yongSin, policyMode);
  const defaultReflectionQuestion = buildDefaultReflectionQuestion(state.riskVector?.primaryRisk, focus);
  const defaultDomainForecasts = buildDefaultDomainForecasts(state);
  const runReceiptPrompt =
    "오늘 실행한 행동 1가지와 보류한 결정 1가지를 Run-Receipt에 기록해 내일의 운영 보드를 정교화하세요.";

  // Compute RunReceipt summary for weekly/monthly
  const receipts = state.recentRunReceipts || [];
  const completedCount = receipts.filter(r => r.whatIDid && r.whatIDid.trim().length > 0 && r.whatIDid !== "N/A").length;
  const deferredCount = receipts.filter(r => r.whatIDeferred && r.whatIDeferred.trim().length > 0 && r.whatIDeferred !== "N/A").length;
  const repeatedPatterns = state.contextTensor?.evidenceAxis
    ?.filter(e => e.startsWith("recurring_pattern:"))
    .map(e => e.replace("recurring_pattern:", "")) || [];

  // Hardcoded fallback values (original deterministic output)
  const fallbackSummary = `오늘 일간 ${state.chart?.dayMaster?.stem || "?"}의 운성 흐름 하에, 활력도(${state.vibeCheckIn?.energy ?? 5})를 보완하여 완급조절을 달성하십시오.`;

  const fallbackOutputJson = {
    summary: fallbackSummary,
    oneLineConclusion: fallbackSummary,
    conceptStateDescription: "목적 지향적인 몰입과 계획이 활성화되는 시점입니다.",
    actionPolicyExplanation: "지속 가능한 성과를 도출하기 위해 분산된 노력을 통제하십시오.",
    structuralPriorSummary: `일간 ${state.chart?.dayMaster?.stem || "?"}(${state.chart?.dayMaster?.element || "earth"})의 구조적 선행 지표와 현재 운성 흐름을 기반으로 행동 범위를 조율합니다.`,
    vibeSummary: `현재 활력(${state.vibeCheckIn?.energy ?? 5}/10)과 집중도(${state.vibeCheckIn?.focus ?? 5}/10)에 맞춘 운영 리듬입니다.`,
    domainForecasts: defaultDomainForecasts,
    actionPolicy: state.actionPolicy,
    requiredActions: state.actionPolicy?.requiredActions || [],
    forbiddenActions: state.actionPolicy?.forbiddenActions || [],
    deferredActions: state.actionPolicy?.deferredActions || [],
    boundaryNotes: state.actionPolicy?.boundaryNotes || [],
    riskVectorSummary: state.riskVector,
    bestTimeWindows,
    reflectionQuestion: defaultReflectionQuestion,
    runReceiptPrompt,
  };

  const fallbackOutputMarkdown = `### ☯ 오늘의 우주적 기류 및 바이브 분석
- **한 줄 요약**: ${fallbackOutputJson.summary}
- **조율 방향**: 침착한 분석을 통해 장기 과제에 에너지를 집중하십시오.

### 📋 오늘의 자기운영 지침 (Action Policy)
- **필수 행동**: ${state.actionPolicy?.requiredActions?.join(", ") || "핵심 업무 1가지 완수"}
- **금지 행동**: ${state.actionPolicy?.forbiddenActions?.join(", ") || "충동적 약속"}
- **보류 행동**: ${state.actionPolicy?.deferredActions?.join(", ") || "신규 전략 회의"}

### 🕰 최적 실행 시간대
${bestTimeWindows.map(w => `- **${w.window}** (${w.mode}): ${w.focus}`).join("\n")}

### 💬 오늘의 회고 질문
- ${defaultReflectionQuestion}

> [!NOTE]
> ${state.actionPolicy?.boundaryNotes?.join(" \n> ") || "과로 금지, 충분한 수면 확보"}`;

  let outputJson: Record<string, unknown> = { ...fallbackOutputJson };
  let outputMarkdown = fallbackOutputMarkdown;

  try {
    const systemPrompt = loadPrompt("system");
    const forecastPrompt = loadPrompt("forecast_writer");

    // --- TCO Pack Context (domain knowledge injection) ---
    let tcoPackContext = "";
    try {
      tcoPackContext = tcoPackLoader.loadTCOPackContextForLLM();
    } catch (err) {
      console.warn("[ForecastWriterNode] TCO pack context load failed:", err);
    }

    // --- RAG Context (personal history injection) ---
    let ragContextStr = "";
    try {
      const ragCtx = buildRAGContext({
        recentForecasts: state.recentForecastOutputs || (state as any).recentForecasts || [],
        recentVibes: state.recentVibes || [],
        recentReceipts: state.recentRunReceipts || (state as any).recentReceipts || [],
        chart: state.chart,
      });
      ragContextStr = formatRAGContextForPrompt(ragCtx);
    } catch (err) {
      console.warn("[ForecastWriterNode] RAG context build failed:", err);
    }

    // Build comprehensive context for the LLM forecast writer
    const scopeLabel = scope === "weekly" ? "주간 전망 (Weekly Forecast)" : scope === "monthly" ? "월간 전망 (Monthly Forecast)" : "일간 전망 (Daily Forecast)";
    
    const contextForLLM = [
      forecastPrompt,
      "",
      `--- Forecast Scope: ${scopeLabel} ---`,
      `This is a ${scope} forecast. Adjust the tone, horizon, and actionability accordingly.`,
      "",
      "--- Deterministic Chart Data (pre-calculated, DO NOT recalculate) ---",
      `Day Master: ${state.chart?.dayMaster?.stem || "unknown"} (${state.chart?.dayMaster?.element || "unknown"}, ${state.chart?.dayMaster?.polarity || "unknown"})`,
      `Year Pillar: ${state.chart?.pillars?.year?.label || "unknown"}`,
      `Month Pillar: ${state.chart?.pillars?.month?.label || "unknown"}`,
      `Day Pillar: ${state.chart?.pillars?.day?.label || "unknown"}`,
      `Hour Pillar: ${state.chart?.pillars?.hour?.label || "unknown"}`,
      "",
      "--- Temporal Luck (대운/세운/월운/일운) ---",
      `Major Luck (대운): ${state.contextTensor?.temporalAxis?.majorLuck || "unknown"}`,
      `Annual Luck (세운): ${state.contextTensor?.temporalAxis?.annualLuck || "unknown"}`,
      `Monthly Luck (월운): ${state.contextTensor?.temporalAxis?.monthlyLuck || "unknown"}`,
      `Daily Luck (일운): ${state.contextTensor?.temporalAxis?.dailyLuck || "unknown"}`,
      "",
      "--- Five Element Distribution ---",
      state.chart?.fiveElementDistribution ? Object.entries(state.chart.fiveElementDistribution).map(([el, ct]) => `${el}: ${ct}`).join(", ") : "not available",
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
      `Evidence Gaps: ${state.conceptState?.evidenceGaps?.join(", ") || "none"}`,
      `Boundary Gaps: ${state.conceptState?.boundaryGaps?.join(", ") || "none"}`,
      "",
      "--- Risk Vector ---",
      `Primary Risk: ${state.riskVector?.primaryRisk || "unknown"}`,
      `Secondary Risk: ${state.riskVector?.secondaryRisk || "unknown"}`,
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
      tcoPackContext ? "--- TCO 개념 팩 ---\n" + tcoPackContext : "",
      "",
      ragContextStr ? "--- 사용자 이력 컨텍스트 ---\n" + ragContextStr : "",
      "",
      "Generate a forecast output with: summary, conceptStateDescription, actionPolicyExplanation, vibeInterpretation, riskNarrative, reflectionQuestion, and outputMarkdown.",
      "The outputMarkdown should be user-facing Korean text in rich markdown format.",
      "Include 6대 영역 (사업/돈, 관계/애정, 건강/회복, 학습/글쓰기, 브랜딩/평판, 리스크/안전) 간단 전망.",
      "Include 회고 질문 and 실행 기록 안내.",
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
    ) as z.infer<typeof ForecastWriterLLMOutputSchema>;

    const finalSummary = llmResult.summary || fallbackSummary;
    outputJson = {
      ...fallbackOutputJson,
      summary: finalSummary,
      oneLineConclusion: finalSummary,
      conceptStateDescription: llmResult.conceptStateDescription || fallbackOutputJson.conceptStateDescription,
      actionPolicyExplanation: llmResult.actionPolicyExplanation || fallbackOutputJson.actionPolicyExplanation,
      structuralPriorSummary: llmResult.structuralPriorSummary || fallbackOutputJson.structuralPriorSummary,
      vibeSummary: llmResult.vibeSummary || fallbackOutputJson.vibeSummary,
      domainForecasts:
        Array.isArray(llmResult.domainForecasts) && llmResult.domainForecasts.length > 0
          ? llmResult.domainForecasts
          : defaultDomainForecasts,
      reflectionQuestion: llmResult.reflectionQuestion || defaultReflectionQuestion,
    };
    outputMarkdown = llmResult.outputMarkdown || fallbackOutputMarkdown;
  } catch (err) {
    console.warn(
      "[ForecastWriterNode] LLM call failed, using hardcoded fallback.",
      err instanceof Error ? err.message : err
    );
    // outputJson and outputMarkdown remain as fallback values
  }

  // Attach weekly or monthly structured fields when scope is weekly or monthly
  if (scope === "weekly") {
    const startDate = state.input?.targetDate || new Date().toISOString().split("T")[0];
    const endDateObj = new Date(startDate);
    endDateObj.setDate(endDateObj.getDate() + 6);
    const endDate = isNaN(endDateObj.getTime()) ? startDate : endDateObj.toISOString().split("T")[0];

    outputJson = {
      ...outputJson,
      weekRange: { from: startDate, to: endDate },
      weeklyCoreConcept: state.conceptState?.coreConceptState || `${focus}.consolidation`,
      weeklyPrimaryGap: state.conceptState?.conceptGaps?.[0] || "핵심 실행 범위와 검증 기준 구체화 필요",
      weeklyEvidenceTarget: state.conceptState?.evidenceGaps?.[0] || "핵심 과제 완료 기록 및 정량적 근거 2건 확보",
      weeklyBoundaryTarget: state.actionPolicy?.boundaryNotes?.[0] || "야간 의사결정 보류 및 과도한 범위 확장 제한",
      weeklyConversionTarget: state.conceptState?.conversionGaps?.[0] || "아이디어를 단일 실행 과제로 전환",
      recompositionGoal: "지난 주 보류했던 의사결정 중 핵심 1가지를 완결하고 나머지는 과감히 축소하기",
      riskTrajectory: [
        { day: "월", primaryRisk: state.riskVector?.primaryRisk || "overextension", level: "low", policyMode: "Consolidation" },
        { day: "화", primaryRisk: state.riskVector?.primaryRisk || "overextension", level: "medium", policyMode },
        { day: "수", primaryRisk: state.riskVector?.primaryRisk || "overextension", level: "medium", policyMode },
        { day: "목", primaryRisk: state.riskVector?.primaryRisk || "overextension", level: "high", policyMode: "Cleanup" },
        { day: "금", primaryRisk: state.riskVector?.primaryRisk || "overextension", level: "medium", policyMode: "Consolidation" },
        { day: "토", primaryRisk: state.riskVector?.secondaryRisk || "burnout", level: "low", policyMode: "Recovery" },
        { day: "일", primaryRisk: state.riskVector?.secondaryRisk || "burnout", level: "low", policyMode: "Recovery" },
      ],
      runReceiptSummary: {
        completedCount,
        deferredCount,
        repeatedPatterns,
      },
    };
  } else if (scope === "monthly") {
    const monthStr = (state.input?.targetDate || new Date().toISOString()).slice(0, 7);
    outputJson = {
      ...outputJson,
      month: monthStr,
      monthlyConceptPortfolio:
        state.conceptState?.activeConcepts && state.conceptState.activeConcepts.length > 0
          ? state.conceptState.activeConcepts.slice(0, 3)
          : ["기반 정비 (Consolidation)", "핵심 역량 집중 (Expansion)", "경계선 점검 (Cleanup)"],
      monthlyRiskPortfolio: [
        `${state.riskVector?.primaryRisk || "overextension"} 집중 관리 및 범위 통제`,
        `${state.riskVector?.secondaryRisk || "burnout"} 예방 및 컨디션 리듬 유지`,
      ],
      evidenceTarget: [
        "핵심 성과 지표(KPI) 근거 문서 2건 확보",
        "주간 실행 기록(Run-Receipt) 4주 누적",
      ],
      boundaryPolicy:
        state.actionPolicy?.boundaryNotes && state.actionPolicy.boundaryNotes.length > 0
          ? state.actionPolicy.boundaryNotes
          : ["무분별한 신규 확장 지양 및 계약·범위 경계 명확화"],
      revenuePolicy: [
        "기존 핵심 가치 및 매출원 최적화 우선",
        "검증되지 않은 대규모 지출 보류",
      ],
      relationshipPolicy: [
        "핵심 파트너 및 주요 관계에 짧은 안부와 따뜻한 신호 유지",
        "상대방의 자율성과 선택권 존중",
      ],
      recoveryPolicy: [
        "규칙적인 수면 보호 및 주 2회 무입력 회복 시간 확보",
      ],
      monthlyActionCalendar: [
        { week: "1주차", policyMode: "Consolidation", recommendedFocus: "현황 진단 및 우선순위 정리", forbiddenFocus: "무계획 신규 확장" },
        { week: "2주차", policyMode, recommendedFocus: "핵심 과제 집중 실행 및 증거 확보", forbiddenFocus: "범위 누수(Scope Leak)" },
        { week: "3주차", policyMode: "Cleanup", recommendedFocus: "중간 점검 및 불필요한 과업 정리", forbiddenFocus: "과도한 약속 추가" },
        { week: "4주차", policyMode: "Recovery", recommendedFocus: "월간 회고 및 회복 루틴 강화", forbiddenFocus: "야간 충동적 의사결정" },
      ],
    };
  }

  const draftOutput = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    mode: scope as any,
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

// 13.5 VibeTuneRewriterNode
export async function VibeTuneRewriterNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "VibeTuneRewriterNode"];

  // Skip if no draft output or no vibe data
  if (!state.draftOutput || !state.vibeCheckIn) {
    return {
      runtime: { ...state.runtime, nodeHistory: history },
    };
  }

  try {
    const vibeData = {
      energy: state.vibeCheckIn.energy ?? 5,
      valence: state.vibeCheckIn.valence ?? 5,
      arousal: state.vibeCheckIn.arousal ?? 5,
      focus: state.vibeCheckIn.focus ?? 5,
      socialLoad: state.vibeCheckIn.socialLoad ?? 5,
    };

    const profile = determineVibeTuneProfile(vibeData, state.chart?.dayMaster);
    
    // Apply RLHF modifications
    if (state.rlhfBias) {
      if (state.rlhfBias.intensity_offset !== 0) {
        profile.intensityLevel = Math.min(3, Math.max(1, profile.intensityLevel + state.rlhfBias.intensity_offset)) as any;
      }
      if (state.rlhfBias.tone_preference) {
        profile.toneMode = state.rlhfBias.tone_preference as any;
      }
    }
    
    console.log(`[VibeTuneRewriterNode] Tone: ${profile.toneMode}, Intensity: ${profile.intensityLevel}, Element: ${profile.elementMetaphor}`);

    const rewritten = await rewriteWithVibeTune(
      state.draftOutput as Record<string, unknown>,
      profile,
      llmProvider,
    );

    return {
      draftOutput: rewritten as any,
      runtime: { ...state.runtime, nodeHistory: history },
    };
  } catch (err) {
    console.warn("[VibeTuneRewriterNode] VibeTune rewrite failed, keeping original:", err instanceof Error ? err.message : err);
    return {
      runtime: { ...state.runtime, nodeHistory: history },
    };
  }
}

// 14. SafetyBoundaryReviewerNode
export async function SafetyBoundaryReviewerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "SafetyBoundaryReviewerNode"];
  const safetyFlags = [...(state.safetyFlags || [])];
  const draft = state.draftOutput as any;
  const finalOutput = draft
    ? {
        ...draft,
        outputJson: draft.outputJson ? { ...draft.outputJson } : {},
      }
    : undefined;

  if (finalOutput?.outputMarkdown) {
    // Run outputMarkdown through the safety module
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

    // Also run checkOutputSafety on draftOutput.outputJson.summary
    if (typeof finalOutput.outputJson?.summary === "string" && finalOutput.outputJson.summary.length > 0) {
      const summarySafetyResult = checkOutputSafety(finalOutput.outputJson.summary);
      for (const flag of summarySafetyResult.flags) {
        if (flag.type !== "missing_boundary") {
          safetyFlags.push({
            type: flag.type,
            severity: flag.severity,
            action: flag.action,
            message: flag.message,
          });
        }
      }
      if (summarySafetyResult.sanitizedOutput) {
        finalOutput.outputJson.summary = summarySafetyResult.sanitizedOutput;
        finalOutput.outputJson.oneLineConclusion = summarySafetyResult.sanitizedOutput;
      }
    }

    // Update safety flags on the output itself
    finalOutput.safetyFlags = Array.from(
      new Set([
        ...(finalOutput.safetyFlags || []),
        ...safetyFlags.map((f: { type: string }) => f.type),
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

  // Guard DB writes with UUID check on state.userId (skip for "local-user", "eval-user", etc.)
  if (isValidUuid(userId)) {
    try {
      const supabase = getDbClient();
      const targetDateRaw = state.input?.targetDate || new Date().toISOString().split("T")[0];
      const targetDate = /^\d{4}-\d{2}$/.test(targetDateRaw) ? `${targetDateRaw}-01` : targetDateRaw;

      // 1. Upsert forecast request
      if (state.birthProfile) {
        await supabase.from("forecast_requests").upsert({
          id: state.requestId,
          user_id: userId,
          mode: state.input?.forecastScope || "daily",
          target_date: targetDate,
          current_focus: state.contextTensor?.domainAxis || [],
          user_message: state.input?.userMessage || null,
          birth_profile_id: isValidUuid(state.birthProfile.id) ? state.birthProfile.id : null,
          vibe_checkin_id: isValidUuid(state.vibeCheckIn?.id) ? state.vibeCheckIn!.id : null,
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
          mode: state.actionPolicy.mode,
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
      // 7. Insert safety events
      if (state.safetyFlags && state.safetyFlags.length > 0) {
        for (const flag of state.safetyFlags) {
          const { error } = await supabase.from("safety_events").insert({
            user_id: userId,
            forecast_request_id: state.requestId,
            event_type: flag.type,
            severity: flag.severity || "medium",
            input_excerpt: flag.message,
            action_taken: flag.action || "logged",
            created_at: new Date().toISOString(),
          });

          if (error) {
            console.error("[PersistenceNode] Error saving safety event to Supabase:", error);
          }
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

  // Build richOutput from agent state — bubble up vibePrescription, gapAnalysis, domainForecasts
  const richOutput: Record<string, unknown> = {};

  // VibePrescription generated by VibePrescriptionNode or deterministic fallback
  if ((state as any).vibePrescription) {
    richOutput.vibePrescription = (state as any).vibePrescription;
  } else if (state.chart) {
    richOutput.vibePrescription = generateVibePrescription(state.chart, state.vibeCheckIn);
  }

  // Gap analysis from ConceptCanonicalizer
  if (state.conceptState) {
    richOutput.gapAnalysis = {
      conceptGaps: state.conceptState.conceptGaps || [],
      evidenceGaps: state.conceptState.evidenceGaps || [],
      boundaryGaps: state.conceptState.boundaryGaps || [],
      conversionGaps: state.conceptState.conversionGaps || [],
    };
  }

  // Rich fields from ForecastWriter LLM output
  const outputJson = (state.finalOutput?.outputJson || (state.draftOutput as any)?.outputJson) as any;
  if (outputJson) {
    if (outputJson.structuralPriorSummary) richOutput.structuralPriorSummary = outputJson.structuralPriorSummary;
    if (outputJson.vibeSummary) richOutput.vibeSummary = outputJson.vibeSummary;
    if (outputJson.domainForecasts?.length) richOutput.domainForecasts = outputJson.domainForecasts;
  }

  return {
    richOutput: richOutput as any,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

import { StateGraph, START, END, Annotation } from "@langchain/langgraph";

// We define a single wrapper state channel that merges Partial updates into the main state
const AgentGraphAnnotation = Annotation.Root({
  state: Annotation<VibeFortuneAgentState>({
    reducer: (currentState, update) => ({ ...currentState, ...update }),
    default: () => ({} as VibeFortuneAgentState),
  }),
});

/**
 * Helper to wrap existing nodes for the LangGraph StateGraph
 */
function wrapNode(nodeFn: (s: VibeFortuneAgentState) => Promise<Partial<VibeFortuneAgentState>>) {
  return async (graphState: typeof AgentGraphAnnotation.State) => {
    const update = await nodeFn(graphState.state);
    return { state: update };
  };
}

export function routeAfterBirthNormalize(graphState: typeof AgentGraphAnnotation.State) {
  const s = graphState.state;
  if (s.errors && s.errors.some(e => e.code === "MISSING_BIRTH_PROFILE")) {
    return "FinalResponseNode";
  }
  return "ManseCalculatorNode";
}

// Build the formal LangGraph StateGraph
const workflowBuilder = new StateGraph(AgentGraphAnnotation)
  .addNode("InputIntakeNode", wrapNode(InputIntakeNode))
  .addNode("SafetyGateNode", wrapNode(SafetyGateNode))
  .addNode("LoadUserContextNode", wrapNode(LoadUserContextNode))
  .addNode("BirthDataNormalizerNode", wrapNode(BirthDataNormalizerNode))
  .addNode("ManseCalculatorNode", wrapNode(ManseCalculatorNode))
  .addNode("ChartConsistencyCheckerNode", wrapNode(ChartConsistencyCheckerNode))
  .addNode("VibeEstimatorNode", wrapNode(VibeEstimatorNode))
  .addNode("VibeCheckInParserNode", wrapNode(VibeCheckInParserNode))
  .addNode("ContextTensorBuilderNode", wrapNode(ContextTensorBuilderNode))
  .addNode("ConceptCanonicalizerNode", wrapNode(ConceptCanonicalizerNode))
  .addNode("RiskVectorizerNode", wrapNode(RiskVectorizerNode))
  .addNode("OperatorExecutorNode", wrapNode(OperatorExecutorNode))
  .addNode("PolicyBinderNode", wrapNode(PolicyBinderNode))
  .addNode("ForecastWriterNode", wrapNode(ForecastWriterNode))
  .addNode("VibeTuneRewriterNode", wrapNode(VibeTuneRewriterNode))
  .addNode("SafetyBoundaryReviewerNode", wrapNode(SafetyBoundaryReviewerNode))
  .addNode("PersistenceNode", wrapNode(PersistenceNode))
  .addNode("FinalResponseNode", wrapNode(FinalResponseNode));

// Edges
workflowBuilder.addEdge(START, "InputIntakeNode");
workflowBuilder.addEdge("InputIntakeNode", "SafetyGateNode");

// Conditional Edge from SafetyGateNode
workflowBuilder.addConditionalEdges("SafetyGateNode", (graphState) => {
  const s = graphState.state;
  if (s.errors && s.errors.length > 0) {
    console.warn("[LangGraph] Safety block active. Escaping to FinalResponseNode.");
    return "FinalResponseNode"; // Fast fail
  }
  return "LoadUserContextNode";
}, {
  "FinalResponseNode": "FinalResponseNode",
  "LoadUserContextNode": "LoadUserContextNode",
});

workflowBuilder.addEdge("LoadUserContextNode", "BirthDataNormalizerNode");

// Conditional Edge from BirthDataNormalizerNode
workflowBuilder.addConditionalEdges("BirthDataNormalizerNode", routeAfterBirthNormalize, {
  "FinalResponseNode": "FinalResponseNode",
  "ManseCalculatorNode": "ManseCalculatorNode",
});

workflowBuilder.addEdge("ManseCalculatorNode", "ChartConsistencyCheckerNode");
workflowBuilder.addEdge("ChartConsistencyCheckerNode", "VibeEstimatorNode");
workflowBuilder.addEdge("VibeEstimatorNode", "VibeCheckInParserNode");
workflowBuilder.addEdge("VibeCheckInParserNode", "ContextTensorBuilderNode");
workflowBuilder.addEdge("ContextTensorBuilderNode", "ConceptCanonicalizerNode");
workflowBuilder.addEdge("ConceptCanonicalizerNode", "RiskVectorizerNode");
workflowBuilder.addEdge("RiskVectorizerNode", "OperatorExecutorNode");
workflowBuilder.addEdge("OperatorExecutorNode", "PolicyBinderNode");
workflowBuilder.addEdge("PolicyBinderNode", "ForecastWriterNode");
workflowBuilder.addEdge("ForecastWriterNode", "VibeTuneRewriterNode");
workflowBuilder.addEdge("VibeTuneRewriterNode", "SafetyBoundaryReviewerNode");
workflowBuilder.addEdge("SafetyBoundaryReviewerNode", "PersistenceNode");
workflowBuilder.addEdge("PersistenceNode", "FinalResponseNode");
workflowBuilder.addEdge("FinalResponseNode", END);

const app = workflowBuilder.compile();

/**
 * LangGraph 기반 에이전트 워크플로 실행 함수
 */
export async function runAgentWorkflow(initialState: VibeFortuneAgentState): Promise<VibeFortuneAgentState> {
  const result = await app.invoke({ state: initialState });
  return result.state;
}

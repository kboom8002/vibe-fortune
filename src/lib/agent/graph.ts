import { z } from "zod";
import { VibeFortuneAgentState } from "./state";
import { calculateChart, calculateMajorLuck, checkChartConsistency, analyzeDivineKillers, calculateAnnualLuck, calculateMonthlyLuck, calculateDailyLuckRange, analyzePeriodInteractions } from "../manse";
import { STEM_ELEMENTS, BRANCH_MAIN_ELEMENTS } from "../manse/constants";
import { tcoPackLoader } from "../tco/pack-loader";
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
} from "./vibe-rewriter";
import { ContextTensorSchema } from "@/schemas/context-tensor.schema";
import { RiskVectorSchema } from "@/schemas/risk-vector.schema";

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

    // 3. Load recent vibe checkins (up to 5)
    const { data: vibeHistory, error: vHistError } = await supabase
      .from("vibe_checkins")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentVibes = (vibeHistory || []).map(v => ({
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

    return {
      birthProfile,
      recentRunReceipts,
      recentVibes,
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
    const now = state.runtime?.startedAt ? new Date(state.runtime.startedAt) : new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: bp.timezone, year: "numeric", month: "2-digit", day: "2-digit" });
    const localDateStr = formatter.format(now);

    const chart = calculateChart({
      birthDateTime: bp.birthDateTime,
      timezone: bp.timezone,
      gender: bp.gender as any,
    });

    const majorLuck = calculateMajorLuck({
      chart,
      gender: bp.gender as any,
    });

    const annualLuck = calculateAnnualLuck({ year: currentYear });
    const monthlyLuck = calculateMonthlyLuck({ year: currentYear, month: currentMonth });
    const dailyLuckRange = calculateDailyLuckRange({ from: localDateStr, to: localDateStr, timezone: bp.timezone });
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
      majorLuck: currentMajorLuckCycle,
      annualLuck: state.annualLuck?.pillar.label,
      monthlyLuck: state.monthlyLuck?.pillar.label,
      dailyLuck: state.dailyLuck?.pillar.label,
    },
    channelAxis: "daily_board" as const,
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
  const energy = state.vibeCheckIn?.energy || 5;
  const arousal = state.vibeCheckIn?.arousal || 5;
  const valence = state.vibeCheckIn?.valence || 5;
  
  // Deterministic State Machine Logic (GAP-10)
  const active: string[] = [];
  const suppressed: string[] = [];
  const gaps: string[] = [];

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

  const fallbackLLMOutput = {
    coreConceptState,
    activeConcepts: active,
    suppressedConcepts: suppressed,
    conceptGaps: gaps,
    evidenceGaps: [] as string[],
    boundaryGaps: [] as string[],
    conversionGaps: [] as string[],
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
  const valence = state.vibeCheckIn?.valence || 5;
  const arousal = state.vibeCheckIn?.arousal || 5;
  const energy = state.vibeCheckIn?.energy || 5;
  const focus = state.vibeCheckIn?.focus || 5;
  const socialLoad = state.vibeCheckIn?.socialLoad || 5;

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

  // 4. Calculate personalized risk scores (GAP-04: 8 Baseline Rules)
  const cap = (val: number) => Math.min(1.0, Math.max(0.0, val));
  const dmWeak = state.chart?.dayMaster?.strength?.judgment === "weak";
  const rlhfSensitivity = state.rlhfBias?.risk_sensitivity ?? 1.0;
  
  // 1) Burnout: High when energy is low, or socialLoad is high + weak day master
  const burnoutBase = energy <= 3 ? 0.7 : (energy <= 5 ? 0.4 : 0.1);
  const burnout = cap((burnoutBase + (socialLoad > 7 && dmWeak ? 0.3 : 0.0) + (pyeonGwanCount >= 2 ? 0.1 : 0.0)) * rlhfSensitivity);

  // 2) Overextension: High when energy is high but focus is low, plus 역마살
  const overextensionBase = (energy >= 7 && focus <= 4) ? 0.6 : 0.2;
  const overextension = cap((overextensionBase + (hasYeokMa ? 0.2 : 0.0)) * rlhfSensitivity);

  // 3) Scope Leak: High when focus is low, plus 세운 충, plus 상관 과다
  const scopeLeakBase = focus <= 3 ? 0.6 : 0.2;
  const scopeLeak = cap((scopeLeakBase + (annualClash ? 0.2 : 0.0) + (sangGwanCount >= 2 ? 0.1 : 0.0)) * rlhfSensitivity);

  // 4) Overclaim: High when arousal and valence are high, plus 상관 과다
  const overclaimBase = (arousal >= 7 && valence >= 7) ? 0.6 : 0.1;
  const overclaim = cap((overclaimBase + (sangGwanCount >= 2 ? 0.2 : 0.0)) * rlhfSensitivity);

  // 5) Emotional Overreaction: Low valence or high arousal, plus 도화살/귀문관살
  const emotionalBase = (valence <= 3 || arousal >= 8) ? 0.5 : 0.1;
  const emotionalOverreaction = cap((emotionalBase + (hasDoHwa ? 0.15 : 0.0) + (hasGwiMun ? 0.15 : 0.0)) * rlhfSensitivity);

  // 6) Legal/Safety Risk: 편관 과다 또는 세운 형살
  const legalBase = (pyeonGwanCount >= 2) ? 0.4 : 0.1;
  const legalSafetyRisk = cap((legalBase + (annualPenalty ? 0.3 : 0.0) + (annualClash ? 0.1 : 0.0)) * rlhfSensitivity);

  // 7) Relationship Dryness: Low social load and low valence, plus 편인/비겁 과다
  const drynessBase = (socialLoad <= 3 && valence <= 4) ? 0.5 : 0.1;
  const relationshipDryness = cap((drynessBase + (pyeonInCount >= 2 ? 0.2 : 0.0) + (biGeopCount >= 3 ? 0.15 : 0.0)) * rlhfSensitivity);

  // 8) Missed Opportunity: Low energy and low arousal, plus 정인 과다 (생각만 많음)
  const missedBase = (energy <= 4 && arousal <= 4) ? 0.5 : 0.1;
  const missedOpportunity = cap((missedBase + (jeongInCount >= 2 ? 0.2 : 0.0)) * rlhfSensitivity);

  // Find primary risk dynamically
  const riskMap = { overextension, scopeLeak, overclaim, burnout, relationshipDryness, emotionalOverreaction, legalSafetyRisk, missedOpportunity };
  let primaryRisk = "overextension" as const;
  let maxRisk = -1;
  for (const [key, val] of Object.entries(riskMap)) {
    if (val > maxRisk) {
      maxRisk = val;
      primaryRisk = key as any;
    }
  }

  const riskVector = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    ...riskMap,
    deterministicFortuneRisk: 0.1,
    relationshipManipulationRisk: 0.1,
    primaryRisk,
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

  let requiredActions = Array.from(new Set(outputs.flatMap(o => o.requiredActions || [])));
  const forbiddenActions = Array.from(new Set(outputs.flatMap(o => o.forbiddenActions || [])));
  const deferredActions = Array.from(new Set(outputs.flatMap(o => o.deferredActions || [])));
  const boundaryNotes = Array.from(new Set(outputs.flatMap(o => o.boundaryNotes || [])));

  if (state.rlhfBias?.action_count_limit && state.rlhfBias.action_count_limit > 0) {
    requiredActions = requiredActions.slice(0, state.rlhfBias.action_count_limit);
  }

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
        recentForecasts: (state as any).recentForecasts || [],
        recentVibes: (state as any).recentVibes || [],
        recentReceipts: (state as any).recentReceipts || [],
        chart: state.chart,
      });
      ragContextStr = formatRAGContextForPrompt(ragCtx);
    } catch (err) {
      console.warn("[ForecastWriterNode] RAG context build failed:", err);
    }

    // Build comprehensive context for the LLM forecast writer
    const scopeLabel = state.input?.forecastScope === "weekly" ? "주간 전망 (Weekly Forecast)" : state.input?.forecastScope === "monthly" ? "월간 전망 (Monthly Forecast)" : "일간 전망 (Daily Forecast)";
    
    const contextForLLM = [
      forecastPrompt,
      "",
      `--- Forecast Scope: ${scopeLabel} ---`,
      `This is a ${state.input?.forecastScope || "daily"} forecast. Adjust the tone, horizon, and actionability accordingly.`,
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
    mode: (state.input?.forecastScope || "daily") as any,
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
  return {
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
workflowBuilder.addEdge("BirthDataNormalizerNode", "ManseCalculatorNode");
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

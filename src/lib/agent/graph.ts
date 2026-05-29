import { VibeFortuneAgentState } from "./state";
import { calculateChart, calculateMajorLuck, checkChartConsistency } from "../manse";
import { tcoPackLoader } from "../tco/pack-loader";

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

  if (userMessage.includes("자해") || userMessage.includes("자살")) {
    safetyFlags.push({
      type: "self_harm",
      severity: "critical",
      action: "blocked",
      message: "자해 혹은 자살 관련 메시지가 감지되어 서비스를 중단합니다.",
    });
    errors.push({
      code: "SAFETY_BLOCKED",
      message: "안전 가이드라인 위반으로 요청이 차단되었습니다.",
      recoverable: false,
      node: "SafetyGateNode",
    });
  }

  if (userMessage.includes("치료") || userMessage.includes("수술") || userMessage.includes("암")) {
    safetyFlags.push({
      type: "medical",
      severity: "medium",
      action: "boundary_added",
      message: "의학적 소견은 반드시 전문의와 상담하십시오.",
    });
  }

  if (userMessage.includes("주식") || userMessage.includes("투자") || userMessage.includes("돈 보장")) {
    safetyFlags.push({
      type: "investment",
      severity: "medium",
      action: "boundary_added",
      message: "본 분석은 특정 투자 성과를 보장하지 않습니다.",
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
  return {
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
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
    riskAxis: [],
    intentAxis: [],
    evidenceAxis: [],
    temporalAxis: {
      dailyLuck: state.chart?.pillars?.day?.label,
    },
    channelAxis: "daily_board" as const,
    createdAt: new Date().toISOString(),
  };

  return {
    contextTensor,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 9. ConceptCanonicalizerNode
export async function ConceptCanonicalizerNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ConceptCanonicalizerNode"];
  const dmElem = state.chart?.dayMaster?.element || "earth";
  
  const activeConcepts = [`element.${dmElem}.stabilization`];
  if (state.input?.currentFocus) {
    activeConcepts.push(`focus.${state.input.currentFocus}`);
  }

  const conceptState = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    coreConceptState: activeConcepts[0],
    activeConcepts,
    suppressedConcepts: [],
    conceptGaps: [],
    evidenceGaps: [],
    boundaryGaps: [],
    conversionGaps: [],
    confidence: 1.0,
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

  const riskVector = {
    id: crypto.randomUUID(),
    userId: state.userId,
    forecastRequestId: state.requestId,
    overextension: energy <= 4 ? 0.7 : 0.1,
    scopeLeak: 0.1,
    overclaim: 0.1,
    burnout,
    relationshipDryness: 0.1,
    emotionalOverreaction: 0.1,
    legalSafetyRisk: 0.1,
    missedOpportunity: 0.1,
    deterministicFortuneRisk: 0.1,
    relationshipManipulationRisk: 0.1,
    primaryRisk: burnout >= 0.6 ? ("burnout" as const) : ("overextension" as const),
    createdAt: new Date().toISOString(),
  };

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
export async function ForecastWriterNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "ForecastWriterNode"];
  
  if (state.errors && state.errors.length > 0) {
    return {
      runtime: { ...state.runtime, nodeHistory: history },
    };
  }

  const summary = `오늘 일간 ${state.chart?.dayMaster.stem}의 운성 흐름 하에, 활력도(${state.vibeCheckIn?.energy})를 보완하여 완급조절을 달성하십시오.`;

  const outputJson = {
    summary,
    conceptStateDescription: "목적 지향적인 몰입과 계획이 활성화되는 시점입니다.",
    actionPolicyExplanation: "지속 가능한 성과를 도출하기 위해 분산된 노력을 통제하십시오.",
  };

  const outputMarkdown = `### ☯ 오늘의 우주적 기류 및 바이브 분석
- **한 줄 요약**: ${outputJson.summary}
- **조율 방향**: 침착한 분석을 통해 장기 과제에 에너지를 집중하십시오.

### 📋 오늘의 자기운영 지침 (Action Policy)
- **필수 행동**: ${state.actionPolicy?.requiredActions.join(", ")}
- **금지 행동**: ${state.actionPolicy?.forbiddenActions.join(", ")}
- **보류 행동**: ${state.actionPolicy?.deferredActions.join(", ")}

> [!NOTE]
> ${state.actionPolicy?.boundaryNotes.join(" \n> ")}`;

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
  const finalOutput = state.draftOutput as any;

  if (finalOutput && !finalOutput.outputMarkdown.includes("안전 경계 알림")) {
    finalOutput.outputMarkdown += `\n\n--- \n*본 행동 정책은 명리학적 조언과 자가 기록한 바이브 상태에 근거한 가이드라인이며, 중요한 의사결정 시 전문가와 상담을 추천합니다.*`;
  }

  return {
    finalOutput,
    runtime: {
      ...state.runtime,
      nodeHistory: history,
    },
  };
}

// 15. PersistenceNode
export async function PersistenceNode(state: VibeFortuneAgentState): Promise<Partial<VibeFortuneAgentState>> {
  const history = [...(state.runtime?.nodeHistory || []), "PersistenceNode"];

  if (state.finalOutput) {
    localStorage.setItem("last-generated-forecast", JSON.stringify(state.finalOutput));
  }

  return {
    persistence: {
      forecastRequestId: state.requestId,
      forecastOutputId: (state.finalOutput as any)?.id,
    },
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

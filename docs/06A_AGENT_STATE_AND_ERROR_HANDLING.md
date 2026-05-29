# 06A_AGENT_STATE_AND_ERROR_HANDLING.md
# Agent State and Error Handling Contract

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

This document defines the canonical agent state, warning structure, error handling, retry policy, and fallback behavior.

Claude must implement LangGraph nodes against this state contract.

---

## 2. Canonical Agent State

```ts
export type VibeFortuneAgentState = {
  userId: string
  requestId: string
  input: ForecastRequestInput

  profile?: Profile
  birthProfile?: BirthProfile
  providedChart?: ProvidedChart

  chart?: ChartResult
  majorLuck?: MajorLuckResult
  luckRange?: DailyLuckRangeResult | MonthlyLuckRangeResult | AnnualLuckResult
  chartConsistency?: ChartConsistency

  vibeCheckIn?: VibeCheckIn
  recentRunReceipts?: RunReceipt[]
  recentForecastOutputs?: ForecastOutput[]

  contextTensor?: VibeContextTensor
  conceptState?: ConceptState
  riskVector?: FortuneRiskVector
  operatorOutputs?: Partial<ActionPolicy>[]
  actionPolicy?: ActionPolicy

  draftOutput?: unknown
  finalOutput?: DailyForecastOutput | WeeklyForecastOutput | MonthlyForecastOutput

  safetyFlags: SafetyFlag[]
  warnings: AgentWarning[]
  errors: AgentError[]

  persistence?: {
    forecastRequestId?: string
    contextTensorId?: string
    conceptStateId?: string
    riskVectorId?: string
    actionPolicyId?: string
    forecastOutputId?: string
  }

  runtime: {
    provider: "mock" | "openai" | "gemini" | "anthropic"
    startedAt: string
    nodeHistory: string[]
    retryCount: number
  }
}
```

---

## 3. Warning Contract

Warnings are recoverable.

```ts
export type AgentWarning = {
  code:
    | "BIRTH_TIME_UNKNOWN"
    | "TIMEZONE_UNCERTAIN"
    | "CHART_CONSISTENCY_MISMATCH"
    | "SOLAR_TERM_APPROXIMATED"
    | "TRUE_SOLAR_TIME_DISABLED"
    | "NIGHT_ZI_DISABLED"
    | "VIBE_CHECKIN_PARTIAL"
    | "INSUFFICIENT_CONTEXT"
    | "POLICY_VARIANT_MAY_DIFFER"
    | "SAFETY_BOUNDARY_ADDED"
  message: string
  node: string
  userVisible: boolean
}
```

Rules:

- Do not fail the graph for warnings.
- User-visible warnings must be surfaced in result UI.
- Internal warnings can be logged without display.

---

## 4. Error Contract

Errors can be recoverable or unrecoverable.

```ts
export type AgentError = {
  code:
    | "MISSING_USER_ID"
    | "MISSING_BIRTH_PROFILE"
    | "MANSE_CALCULATION_FAILED"
    | "SCHEMA_VALIDATION_FAILED"
    | "OPENAI_STRUCTURED_OUTPUT_FAILED"
    | "SAFETY_BLOCKED"
    | "PERSISTENCE_FAILED"
    | "RLS_DENIED"
    | "UNKNOWN"
  message: string
  recoverable: boolean
  node: string
  details?: unknown
}
```

---

## 5. SafetyFlag Contract

```ts
export type SafetyFlag = {
  type:
    | "self_harm"
    | "medical"
    | "legal"
    | "investment"
    | "relationship_manipulation"
    | "fear_amplification"
    | "deterministic_prediction"
    | "overclaim"
    | "missing_boundary"
  severity: "low" | "medium" | "high" | "critical"
  action: "blocked" | "redirected" | "boundary_added" | "logged"
  message?: string
}
```

---

## 6. Retry Policy

### Retry Allowed

```text
OpenAI structured output parsing failure
temporary network/API failure
Supabase transient insert failure
```

### Retry Not Allowed

```text
Safety blocked
RLS denied
Missing required user data
Manse deterministic calculation bug
```

### Retry Limits

```ts
const MAX_NODE_RETRIES = 2
const MAX_GRAPH_RETRIES = 3
```

---

## 7. Fallback Policy

### Forecast Writer Fallback

If LLM structured output fails:

1. Use deterministic template renderer.
2. Include only already validated intermediate data.
3. Add warning `OPENAI_STRUCTURED_OUTPUT_FAILED`.
4. Continue to SafetyBoundaryReviewer.

### Missing Vibe Check-in

If Vibe is missing:

1. Continue with neutral Vibe defaults.
2. Add warning `VIBE_CHECKIN_PARTIAL`.
3. Output must ask user to check in for better accuracy.

Neutral defaults:

```ts
{
  valence: 5,
  arousal: 5,
  energy: 5,
  focus: 5,
  socialLoad: 5
}
```

### Missing Birth Profile

If birth profile is missing:

1. Stop forecast generation.
2. Return `onboarding_required`.
3. Link to `/app/onboarding/birth`.

---

## 8. Schema Validation Rule

All node outputs must pass Zod validation.

```text
No unvalidated JSON can be persisted.
No LLM output can be rendered directly without validation.
```

---

## 9. Node History Rule

Every node must append its name to `state.runtime.nodeHistory`.

This enables debugging and replay.

---

## 10. Definition of Done

- Agent state type exists.
- Every node returns valid state.
- Warnings and errors use canonical contracts.
- Retry and fallback behavior is implemented.
- Critical safety route is tested.

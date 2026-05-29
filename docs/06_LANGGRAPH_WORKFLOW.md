# 06_LANGGRAPH_WORKFLOW.md
# LangGraph Workflow Specification
## TCO-Vibe Fortune Coach v2

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

This document defines the LangGraph workflow for TCO-Vibe Fortune Coach.

LangGraph is responsible for orchestration, state transition, tool calling, safety routing, persistence, and resumability.

It must not calculate Four Pillars or luck cycles directly. It must call deterministic modules in `src/lib/manse`.

---

## 2. Prime Workflow Principle

```text
Manse Engine calculates.
LLM interprets.
TCO-Vibe Layer converts.
LangGraph orchestrates.
Supabase persists.
Safety Gate can stop, redirect, or rewrite.
```

---

## 3. Graph Overview

```text
InputIntakeNode
→ SafetyGateNode
→ LoadUserContextNode
→ BirthDataNormalizerNode
→ ManseCalculatorNode
→ ChartConsistencyCheckerNode
→ VibeCheckInParserNode
→ ContextTensorBuilderNode
→ ConceptCanonicalizerNode
→ RiskVectorizerNode
→ OperatorExecutorNode
→ PolicyBinderNode
→ ForecastWriterNode
→ SafetyBoundaryReviewerNode
→ PersistenceNode
→ FinalResponseNode
```

Optional post-MVP nodes:

```text
RunReceiptLoggerNode
RecompositionEngineNode
EvalLoggerNode
HumanReviewNode
MemoryCompactionNode
```

---

## 4. Node Contract Pattern

Every node must use this structure:

```ts
export type GraphNode<I, O> = {
  name: string
  input: I
  output: O
  run: (state: VibeFortuneAgentState) => Promise<VibeFortuneAgentState>
}
```

Each node must:

1. Read from `VibeFortuneAgentState`.
2. Write only its declared output fields.
3. Validate output with Zod.
4. Add structured warnings instead of throwing when recoverable.
5. Add structured errors and route safely when unrecoverable.

---

## 5. Routing Rules

### Normal Route

```text
Input → Safety → Context → Manse → TCO → Forecast → Safety Review → Save → Response
```

### Critical Safety Route

```text
InputIntakeNode
→ SafetyGateNode
→ FinalResponseNode
```

Use when request includes self-harm crisis, explicit illegal action, relationship coercion, or deterministic harmful prediction demand.

### Missing Birth Profile Route

```text
InputIntakeNode
→ LoadUserContextNode
→ FinalResponseNode with onboarding_required
```

### Calculation Warning Route

```text
ManseCalculatorNode
→ ChartConsistencyCheckerNode
→ continue with warnings
```

### Forecast Writer Failure Route

```text
ForecastWriterNode
→ fallback template renderer
→ SafetyBoundaryReviewerNode
```

---

## 6. Node Specifications

### 6.1 InputIntakeNode

Purpose: Normalize incoming forecast request.

Input:

```ts
type InputIntakeInput = {
  userId: string
  mode?: "daily" | "weekly" | "monthly" | "yearly" | "custom"
  targetDate?: string
  dateRange?: { from: string; to: string }
  currentFocus?: string[]
  userMessage?: string
}
```

Output:

```ts
state.input
state.requestId
state.safetyFlags = []
state.warnings = []
state.errors = []
```

Rules:

- Default mode is `daily`.
- If weekly/monthly and no date range is provided, infer current week/month from target date.
- Never infer birth data in this node.

Failure:

- Missing `userId` is unrecoverable.

---

### 6.2 SafetyGateNode

Purpose: Detect high-risk requests before any generation.

Checks:

```text
self_harm
medical_final_judgment
legal_final_judgment
investment_guarantee
relationship_manipulation
fear_amplification
deterministic_prediction
```

Routing:

- Critical → `FinalResponseNode`
- High → continue with hard boundary constraints
- Medium/Low → continue with safety flags

Rules:

- Relationship manipulation must be blocked or reframed.
- Medical/legal/investment requests require boundary note.
- Deterministic fortune requests must be reframed as structural prior and action policy.

---

### 6.3 LoadUserContextNode

Purpose: Load profile, birth profile, chart, recent run receipts, and recent forecast history.

Output:

```ts
state.profile
state.birthProfile
state.priorChart
state.recentRunReceipts
state.recentForecastOutputs
```

Rules:

- Enforce user ownership.
- Never load another user's data.
- If no birth profile exists, set `onboardingRequired` warning.

---

### 6.4 BirthDataNormalizerNode

Purpose: Normalize birth date/time/timezone and provided chart.

Rules:

- Preserve original user input.
- Normalize only into deterministic `CalculateChartInput`.
- Do not invent missing birth time.
- If birth time is unknown, set warning and use configured unknown-time policy.

---

### 6.5 ManseCalculatorNode

Purpose: Call deterministic Manse Engine.

Allowed calls:

```ts
calculateChart()
calculateMajorLuck()
calculateAnnualLuck()
calculateDailyLuckRange()
checkChartConsistency()
```

Forbidden:

```text
Calling OpenAI/Claude for pillar calculation
Inferring missing pillar values in prompt
Using LLM to resolve solar term boundaries
```

Output:

```ts
state.chart
state.majorLuck
state.luckRange
state.warnings
```

---

### 6.6 ChartConsistencyCheckerNode

Purpose: Compare calculated chart and user-provided chart.

Rules:

- If matched, canonical source is calculated.
- If mismatched, preserve both.
- If user explicitly selects user-provided chart as canonical, use it for interpretation while storing calculated result.
- Surface mismatch warning in UI.

---

### 6.7 VibeCheckInParserNode

Purpose: Validate current Vibe Check-in.

Fields:

```ts
valence: 0..10
arousal: 0..10
energy: 0..10
focus: 0..10
socialLoad: 0..10
sleepHours?: 0..24
oneLineEvent?: string
```

Rules:

- Vibe is a current state input, not diagnosis.
- Do not infer health condition, personality type, or mental disorder.

---

### 6.8 ContextTensorBuilderNode

Purpose: Build TCO-Vibe Context Tensor.

Inputs:

```text
chart prior
luck range
vibe check-in
current focus
user message
recent run receipts
channel/mode
```

Output:

```ts
state.contextTensor
```

Rules:

- Use rule-based mapping first.
- Mark missing evidence as evidence gap.
- Do not let LLM create core axes from scratch in MVP.

---

### 6.9 ConceptCanonicalizerNode

Purpose: Convert raw context into approved concept IDs.

Implementation:

- Use `tco-packs/*.yaml` as canonical vocabulary.
- LLM may help map user wording to approved concepts.
- Output must use approved concept IDs or create `pending_concept` with warning.

---

### 6.10 RiskVectorizerNode

Purpose: Score operational risks.

Implementation:

- MVP: rule-based scoring.
- LLM may explain, but must not be sole scorer.

Output:

```ts
state.riskVector
```

Rules:

- Clamp all values between 0 and 1.
- `primaryRisk` must match highest score.
- High risk must trigger boundary note requirement.

---

### 6.11 OperatorExecutorNode

Purpose: Apply operator rules from YAML.

Input:

```ts
contextTensor
conceptState
riskVector
operator_rules.yaml
```

Output:

```ts
state.operatorOutputs
```

Rules:

- Sort matched operators by priority.
- Safety operator always overrides expansion operator.
- Recovery overrides expansion when burnout is high.

---

### 6.12 PolicyBinderNode

Purpose: Merge operator outputs into a single ActionPolicy.

Priority:

```text
1. Safety
2. Recovery
3. Boundary / Cleanup
4. Relationship warmth
5. Consolidation
6. Expansion
```

Output:

```ts
state.actionPolicy
```

Rules:

- Required actions must have at least one item.
- Forbidden actions must have at least one item.
- Boundary notes required when legal/medical/investment/relationship/high-risk flags exist.

---

### 6.13 ForecastWriterNode

Purpose: Render structured forecast output.

Input:

```ts
chartSummary
luckSummary
vibeCheckIn
contextTensor
conceptState
riskVector
actionPolicy
outputMode
```

Forbidden:

- Inventing chart values
- Deterministic prediction
- Fear amplification
- Medical/legal/investment final advice
- Relationship manipulation

Output:

```ts
state.draftOutput
```

---

### 6.14 SafetyBoundaryReviewerNode

Purpose: Review final draft and add boundary or block.

Checks:

```text
deterministic prediction
fear amplification
autonomy removal
relationship manipulation
medical/legal/investment advice
missing boundary
```

Output:

```ts
state.finalOutput
state.safetyFlags
```

---

### 6.15 PersistenceNode

Purpose: Save request, tensor, concepts, risks, policy, forecast output, and safety events.

Rules:

- Save only after final safety review.
- Use Supabase RLS.
- Store structured JSON plus rendered markdown.
- Never store raw high-risk crisis text unnecessarily; store minimized excerpts when needed.

---

### 6.16 FinalResponseNode

Purpose: Return final UI response.

Output:

```ts
type FinalResponse = {
  status: "ok" | "blocked" | "onboarding_required" | "partial"
  forecastOutput?: unknown
  warnings: string[]
  safetyFlags: SafetyFlag[]
  nextAction?: string
}
```

---

## 7. Implementation Milestones

```text
M4.1 Define agent state schema
M4.2 Implement graph node skeletons
M4.3 Implement deterministic manse node integration
M4.4 Implement context tensor builder
M4.5 Implement risk vectorizer
M4.6 Implement operator executor
M4.7 Implement policy binder
M4.8 Implement forecast writer with mock provider
M4.9 Add safety reviewer
M4.10 Add persistence
```

---

## 8. Acceptance Criteria

- Daily graph runs end-to-end with mock data.
- Manse calculation is called only through deterministic module.
- ForecastWriter receives structured chart JSON only.
- SafetyGate blocks critical unsafe requests.
- RiskVector and ActionPolicy pass Zod validation.
- ForecastOutput is persisted with user ownership.

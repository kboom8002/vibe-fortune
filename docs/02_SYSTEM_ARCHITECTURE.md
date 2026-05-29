# 02_SYSTEM_ARCHITECTURE.md
# System Architecture
## TCO-Vibe Fortune Coach v2

Version: 0.2
Status: Architecture Foundation

---

## 1. Architecture Goal

이 시스템은 다음 원칙을 코드 구조로 보장해야 한다.

```text
Manse Engine calculates.
LLM interprets.
TCO converts interpretation into action policy.
LangGraph orchestrates.
Supabase persists.
Safety Gate constrains.
```

---

## 2. High-Level Architecture

```text
Next.js UI
→ Server Actions / API Routes
→ LangGraph Agent Runtime
→ Deterministic Manse Engine
→ TCO-Vibe Policy Layer
→ LLM Provider
→ Safety Reviewer
→ Supabase Persistence
```

---

## 3. Technology Stack

```text
Runtime: Next.js App Router
Language: TypeScript
UI: shadcn/ui + Tailwind CSS
Auth/DB: Supabase Auth + Postgres + RLS
Storage: Supabase Storage if needed
Agent Runtime: LangGraph
LLM: OpenAI API or compatible provider
Validation: Zod
Testing: Vitest + Playwright
Deployment: Vercel
```

---

## 4. Folder Structure

```text
tco-vibe-fortune-coach/
├─ README.md
├─ AGENTS.md
├─ docs/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx
│  │  ├─ app/
│  │  │  ├─ daily/
│  │  │  ├─ forecast/[id]/
│  │  │  ├─ run-receipt/
│  │  │  ├─ history/
│  │  │  └─ settings/
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ forecast/
│  │  ├─ vibe/
│  │  ├─ chart/
│  │  └─ safety/
│  ├─ features/
│  │  ├─ onboarding/
│  │  ├─ daily-loop/
│  │  ├─ forecast/
│  │  ├─ run-receipt/
│  │  └─ history/
│  ├─ lib/
│  │  ├─ supabase/
│  │  ├─ manse/
│  │  ├─ tco/
│  │  ├─ agent/
│  │  ├─ llm/
│  │  ├─ safety/
│  │  └─ utils/
│  └─ schemas/
├─ prompts/
├─ tco-packs/
├─ supabase/
│  └─ migrations/
└─ tests/
```

---

## 5. Core Runtime Layers

### 5.1 UI Layer

Responsibilities:

- collect birth profile,
- collect vibe check-in,
- display forecast board,
- collect run-receipt,
- show boundary alerts,
- show history and weekly review.

Must not:

- calculate chart,
- call LLM directly from client,
- expose sensitive data without auth.

---

### 5.2 API / Server Action Layer

Responsibilities:

- authenticate user,
- validate request with Zod,
- call LangGraph workflows,
- persist result,
- return safe response.

Example endpoints:

```text
POST /api/profile/birth
POST /api/forecast/daily
POST /api/forecast/weekly
POST /api/run-receipt
GET /api/history
```

---

### 5.3 LangGraph Agent Runtime

Responsibilities:

- orchestrate node execution,
- route around safety states,
- call deterministic tools,
- call LLM provider for interpretation/writing,
- checkpoint state,
- return structured final output.

Core graph:

```text
InputIntakeNode
→ SafetyGateNode
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

---

### 5.4 Deterministic Manse Engine

Location:

```text
src/lib/manse/
```

Responsibilities:

- calculateChart()
- calculateMajorLuck()
- calculateAnnualLuck()
- calculateMonthlyLuck()
- calculateDailyLuckRange()
- checkChartConsistency()

Must return:

- structured JSON,
- warnings,
- policy used,
- confidence information.

Must not:

- use LLM,
- silently fail,
- mix interpretation with calculation.

---

### 5.5 TCO-Vibe Policy Layer

Location:

```text
src/lib/tco/
```

Responsibilities:

- build ContextTensor,
- canonicalize ConceptState,
- calculate RiskVector,
- execute OperatorRules,
- bind ActionPolicy,
- create RecompositionSummary.

Inputs:

```text
ChartResult
LuckPeriod
VibeCheckIn
UserContext
RecentRunReceipts
```

Outputs:

```text
ContextTensor
ConceptState
RiskVector
ActionPolicy
```

---

### 5.6 LLM Provider Layer

Location:

```text
src/lib/llm/
```

Allowed uses:

- concept canonicalization assistance,
- natural language forecast writing,
- action policy explanation,
- safety rewrite,
- Run-Receipt summarization.

Forbidden uses:

- chart calculation,
- deterministic prediction,
- medical/legal/investment final judgment,
- relationship manipulation,
- unvalidated output.

Every LLM output must pass Zod validation.

---

### 5.7 Safety Layer

Location:

```text
src/lib/safety/
```

Responsibilities:

- input safety gate,
- output boundary review,
- deterministic prediction detection,
- domain risk tagging,
- crisis handling,
- SafetyEvent logging.

---

### 5.8 Persistence Layer

Supabase stores:

```text
profiles
birth_profiles
manse_charts
major_luck_cycles
vibe_checkins
forecast_requests
context_tensors
concept_states
risk_vectors
action_policies
forecast_outputs
run_receipts
safety_events
```

All user-owned tables must have RLS.

---

## 6. Critical Data Flow

### Daily Forecast Flow

```text
User submits VibeCheckIn + CurrentFocus
→ API validates request
→ LangGraph InputIntakeNode
→ SafetyGateNode
→ ManseCalculatorNode loads/calculates chart/luck
→ ContextTensorBuilderNode
→ RiskVectorizerNode
→ OperatorExecutorNode
→ PolicyBinderNode
→ ForecastWriterNode
→ SafetyBoundaryReviewerNode
→ PersistenceNode
→ UI displays Daily Board
```

---

## 7. Error Handling Strategy

Errors must be structured.

```ts
export type AgentError = {
  code:
    | "MISSING_BIRTH_PROFILE"
    | "MANSE_CALCULATION_FAILED"
    | "CHART_CONSISTENCY_WARNING"
    | "VIBE_CHECKIN_MISSING"
    | "LLM_STRUCTURED_OUTPUT_FAILED"
    | "SAFETY_BLOCKED"
    | "PERSISTENCE_FAILED"
    | "UNKNOWN"
  message: string
  recoverable: boolean
  node: string
}
```

Fallback examples:

- Missing birth profile → route to onboarding.
- Manse warning → show calculation boundary note.
- LLM output validation failure → retry once, then return safe fallback.
- Safety critical → block or redirect.

---

## 8. Security Principles

```text
1. All user-owned data has user_id.
2. RLS must enforce auth.uid() = user_id.
3. Birth data is never public.
4. Forecast outputs are private by default.
5. Safety events are logged without excessive sensitive excerpts.
6. API routes require authenticated session.
```

---

## 9. MVP Deployment Architecture

```text
Vercel
├─ Next.js App
├─ API Routes / Server Actions
└─ Environment Variables

Supabase
├─ Auth
├─ Postgres
├─ RLS Policies
└─ Optional Storage

LLM Provider
└─ Forecast writing and structured interpretation only
```

---

## 10. Architecture Release Gate

Before MVP release:

```text
- Deterministic manse module exists.
- LLM does not calculate chart.
- Daily forecast graph runs end-to-end.
- Zod validation exists for core outputs.
- Supabase RLS is enabled for sensitive tables.
- SafetyGate and SafetyBoundaryReviewer cannot be bypassed.
- RunReceipt can be saved and linked.
```

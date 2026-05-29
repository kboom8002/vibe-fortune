# AGENTS.md
## Autonomous AI-Pair Coding Rules

이 문서는 Claude Opus 4.6 또는 다른 고급 LLM 코딩 에이전트가 이 레포에서 따라야 할 **운영 헌법**이다. 제품 방향, 구현 순서, 금지 행동, 불확실성 처리, 문서 업데이트 규칙은 이 파일을 따른다.

---

## 1. Role

You are an autonomous AI-pair coding agent for **TCO-Vibe Fortune Coach v2**.

Your job is to implement a Next.js + Supabase + LangGraph + LLM application according to the repository documents.

You must prioritize:

1. deterministic calculation correctness,
2. schema-validated AI outputs,
3. user data privacy,
4. safety boundary compliance,
5. MVP scope discipline.

---

## 2. Prime Directive

```text
Do not invent astrology calculations inside LLM prompts.
All chart, major luck, annual luck, monthly luck, and daily luck calculations must be performed by deterministic modules under /src/lib/manse.
```

The LLM may explain, summarize, rewrite, or convert deterministic results into user-facing action policy. It must never calculate the pillars directly.

---

## 3. Required Reading Order

Before implementing any code, read in this order:

1. `README.md`
2. `AGENTS.md`
3. `DOC_INDEX.md`
4. `docs/00_PROJECT_CANON.md`
5. `docs/01_PRD.md`
6. `docs/02_SYSTEM_ARCHITECTURE.md`
7. `docs/03_DOMAIN_MODEL.md` once available
8. `docs/04_MANSE_ENGINE_SPEC.md` once available
9. `docs/10_IMPLEMENTATION_PLAN.md` once available

If a later document conflicts with `AGENTS.md`, follow `AGENTS.md` and add a TODO note.

---

## 4. Forbidden Behaviors

Never implement or generate:

- LLM-based chart calculation.
- deterministic prediction such as “this will definitely happen.”
- fear-amplifying fortune statements.
- relationship manipulation strategies.
- medical, legal, investment, or psychiatric final judgments.
- performance guarantees.
- social feed, payment, or unrelated features during MVP.
- data storage without user ownership and RLS.
- bypasses of Safety Gate.
- sensitive attribute inference from Vibe data.

---

## 5. Coding Order

Follow milestones from `docs/10_IMPLEMENTATION_PLAN.md` when available. Until then, follow this default sequence:

```text
M0 Repo Bootstrap
M1 Supabase Auth + Schema
M2 Manse Engine v1
M3 Vibe Check-in + Daily UI
M4 LangGraph Agent Runtime
M5 Forecast Generation
M6 Run-Receipt + History
M7 Weekly / Monthly Forecast
M8 Eval + Safety
M9 Beta Polish
```

Do not jump ahead to a later milestone unless all acceptance criteria for the current milestone are satisfied.

---

## 6. File Modification Rules

Before modifying code:

1. identify the relevant document section,
2. identify the intended milestone,
3. identify affected schemas, routes, nodes, components, and tests.

When adding a new file, use the expected folder structure:

```text
src/app/
src/components/
src/features/
src/lib/manse/
src/lib/tco/
src/lib/agent/
src/lib/safety/
src/lib/supabase/
src/schemas/
prompts/
tco-packs/
tests/
```

Do not invent new top-level folders unless necessary.

---

## 7. Schema-First Rule

All AI outputs, API payloads, and LangGraph node outputs must be validated by Zod schemas.

Required schema categories:

- BirthProfile
- ChartResult
- VibeCheckIn
- ContextTensor
- ConceptState
- RiskVector
- ActionPolicy
- ForecastOutput
- RunReceipt
- SafetyEvent

If schema does not exist yet, create it before implementing the dependent feature.

---

## 8. Safety Gate Rule

Every forecast workflow must pass through:

```text
Input SafetyGate
→ Forecast SafetyBoundaryReviewer
→ Persistence with safetyFlags
```

High-risk input must either be blocked, redirected, or rewritten with boundary notes.

---

## 9. Uncertainty Handling

If uncertain:

- do not invent deterministic behavior;
- create a TODO with a clear reason;
- return structured warnings to the user or developer;
- preserve calculated and user-provided values separately when chart consistency is unclear.

Example:

```ts
warnings.push("SOLAR_TERM_APPROXIMATED")
warnings.push("POLICY_VARIANT_MAY_DIFFER")
```

---

## 10. Documentation Update Rule

After completing a milestone:

1. update implementation checklist,
2. add new env vars to `.env.example`,
3. update any changed schema contract,
4. update acceptance test status,
5. add known limitations.

---

## 11. Definition of Done

A task is done only when:

- code compiles,
- relevant schema validation passes,
- core happy path works,
- safety boundary is not bypassed,
- tests or manual validation steps are documented,
- docs remain consistent.

---

## 12. Final Rule

A good AI-pair coding repo is not a collection of explanations. It is an operating system that constrains the LLM’s behavior and defines the implementation path.

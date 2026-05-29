# FULL_PACKAGE_SUMMARY.md
# TCO-Vibe Fortune Coach v2 Full Package Summary

## Product Definition

TCO-Vibe Fortune Coach는 사주·대운·세운을 구조적 prior로 삼고, 현재 Vibe와 실제 행동 로그를 TCO 개념 상태공간으로 번역해 일/주/月 단위 행동 정책을 생성하는 자기운영 AI 에이전트다.

## Final Package Composition

### Batch 1 — Canon / PRD / Architecture
- `README.md`
- `AGENTS.md`
- `DOC_INDEX.md`
- `docs/00_PROJECT_CANON.md`
- `docs/01_PRD.md`
- `docs/02_SYSTEM_ARCHITECTURE.md`

### Batch 2 — Domain / Manse / TCO Packs
- `docs/03_DOMAIN_MODEL.md`
- `docs/04_MANSE_ENGINE_SPEC.md`
- `docs/04A_MANSE_VALIDATION_PROTOCOL.md`
- `docs/05_TCO_VIBE_AGENT_SPEC.md`
- `docs/05A_TCO_PACKS_AND_OPERATOR_RULES.md`
- `schemas/*.schema.ts`
- `tco-packs/*.yaml`
- `tests/manse/reference-cases.sample.json`

### Batch 3 — LangGraph / API / DB / UI
- `docs/06_LANGGRAPH_WORKFLOW.md`
- `docs/06A_AGENT_STATE_AND_ERROR_HANDLING.md`
- `docs/07_API_AND_DB_SPEC.md`
- `docs/07A_SUPABASE_RLS_POLICY.md`
- `docs/08_UI_UX_SPEC.md`
- `docs/08A_OUTPUT_TEMPLATES.md`
- `supabase/migrations/*.sql`

### Batch 4 — Eval / Safety / PromptOps / Traceability
- `docs/09_EVAL_AND_SAFETY.md`
- `docs/09A_EVAL_HARNESS_PROTOCOL.md`
- `docs/09B_VIBE_PRIVACY_AND_ETHICS.md`
- `docs/10_IMPLEMENTATION_PLAN.md`
- `docs/11_TRACEABILITY_MATRIX.md`
- `docs/12_RUN_RECEIPT_RECOMPOSITION.md`
- `docs/13_PROMPTOPS_REGISTRY.md`
- `prompts/*.md`
- `prompts/registry.yaml`
- `tests/eval/qbs.daily.sample.jsonl`
- `tests/safety/forbidden-output-cases.jsonl`
- `tests/goldset/goldset.sample.jsonl`

## Core Product Loop

```txt
BirthProfile + ManseChart + LuckCycle
+ VibeCheckIn
+ User Context
+ RunReceipt
→ ContextTensor
→ ConceptState
→ RiskVector
→ ActionPolicy
→ ForecastOutput
→ RunReceipt
→ Recomposition
```

## Non-Negotiable Rule

LLM must never calculate chart/pillar/luck values directly.
All deterministic calculation must come from `/lib/manse` or its equivalent implementation.

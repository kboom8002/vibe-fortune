# DOC_INDEX.md
# TCO-Vibe Fortune Coach v2 — Full Autocode Repo Document Index

이 문서는 Claude Opus 4.6 또는 다른 고급 LLM이 `tco-vibe-fortune-coach-v2-full` 레포 문서 세트를 읽고 자율 AI-pair coding을 수행하기 위한 최종 문서 인덱스다.

## 1. Recommended Reading Order

1. `README.md`
2. `AGENTS.md`
3. `docs/00_PROJECT_CANON.md`
4. `docs/01_PRD.md`
5. `docs/02_SYSTEM_ARCHITECTURE.md`
6. `docs/03_DOMAIN_MODEL.md`
7. `docs/04_MANSE_ENGINE_SPEC.md`
8. `docs/04A_MANSE_VALIDATION_PROTOCOL.md`
9. `docs/05_TCO_VIBE_AGENT_SPEC.md`
10. `docs/05A_TCO_PACKS_AND_OPERATOR_RULES.md`
11. `docs/06_LANGGRAPH_WORKFLOW.md`
12. `docs/06A_AGENT_STATE_AND_ERROR_HANDLING.md`
13. `docs/07_API_AND_DB_SPEC.md`
14. `docs/07A_SUPABASE_RLS_POLICY.md`
15. `docs/08_UI_UX_SPEC.md`
16. `docs/08A_OUTPUT_TEMPLATES.md`
17. `docs/09_EVAL_AND_SAFETY.md`
18. `docs/09A_EVAL_HARNESS_PROTOCOL.md`
19. `docs/09B_VIBE_PRIVACY_AND_ETHICS.md`
20. `docs/10_IMPLEMENTATION_PLAN.md`
21. `docs/11_TRACEABILITY_MATRIX.md`
22. `docs/12_RUN_RECEIPT_RECOMPOSITION.md`
23. `docs/13_PROMPTOPS_REGISTRY.md`

## 2. Core Directives

- Manse Engine calculates.
- LLM interprets.
- LangGraph orchestrates.
- TCO-Vibe Layer converts interpretation into action policy.
- Supabase persists user-owned data with RLS.
- Eval Harness and Safety Gates determine release readiness.

## 3. Folder Map

```txt
tco-vibe-fortune-coach-v2-full/
├─ README.md
├─ AGENTS.md
├─ DOC_INDEX.md
├─ docs/
├─ schemas/
├─ tco-packs/
├─ prompts/
├─ tests/
│  ├─ manse/
│  ├─ eval/
│  ├─ safety/
│  └─ goldset/
└─ supabase/
   └─ migrations/
```

## 4. Implementation Start

Start with `docs/10_IMPLEMENTATION_PLAN.md` after reading the required canon and architecture documents.
The autonomous coding agent must not implement features outside the active milestone.

## 5. Release Gate

A build is not ready until:

- Manse reference tests pass.
- Zod schemas validate all agent outputs.
- Supabase RLS policies protect user-owned data.
- Daily forecast flow works end-to-end.
- Safety forbidden-output tests pass.
- QBS eval harness meets the release threshold.
- Traceability matrix has no critical gaps.

# TCO-Vibe Fortune Coach v2

## One-line Definition

**TCO-Vibe Fortune Coach**는 사주·대운·세운을 결정론적 예언이 아니라 **structural prior**로 사용하고, 현재 Vibe 상태와 사용자의 실제 행동 기록인 Run-Receipt를 TCO 개념 상태공간으로 변환하여 일/주/月 단위 **Action Policy**를 생성하는 자기운영 AI 에이전트다.

```text
Chart Prior
+ Current Vibe State
+ User Context
+ Run-Receipt
= Context Tensor
→ Concept State
→ Risk Vector
→ Action Policy
→ Forecast Board
```

## What This Product Is

이 제품은 “맞는다/틀린다”를 겨루는 운세 챗봇이 아니다. 사용자가 매일의 상태를 더 잘 운영하도록 돕는 **AI 자기운영 코치**다. 만세력 계산 결과는 구조적 입력값이며, LLM은 계산하지 않고 해석·표현·행동정책화를 담당한다.

## MVP Scope

MVP는 다음 5개 루프를 구현한다.

1. 사용자가 Birth Profile을 생성한다.
2. Deterministic Manse Engine이 사주·대운·일운을 계산한다.
3. 사용자가 Vibe Check-in과 현재 초점을 입력한다.
4. LangGraph Agent가 Context Tensor → Risk Vector → Action Policy → Daily Forecast Board를 생성한다.
5. 사용자가 Run-Receipt를 남기고 다음 주/월 해석에 반영한다.

## Non-goals in MVP

- LLM이 사주팔자, 대운, 일운을 직접 계산하지 않는다.
- 결정론적 예언, 공포 조장, 관계 조작, 투자/의료/법률 최종 판단을 제공하지 않는다.
- 결제, 커뮤니티, 소셜 피드, 고급 진태양시 보정, 모든 학파별 만세력 옵션은 MVP에서 제외한다.
- 사용자의 민감 출생정보와 상태 데이터를 RLS 없이 저장하지 않는다.

## Technology Stack

- Next.js App Router
- TypeScript
- Supabase Auth / Postgres / Storage / RLS
- LangGraph
- OpenAI API or compatible LLM provider
- Zod
- shadcn/ui
- Tailwind CSS
- Vitest / Playwright

## Document Reading Order for AI Coding Agent

1. `README.md`
2. `AGENTS.md`
3. `DOC_INDEX.md`
4. `docs/00_PROJECT_CANON.md`
5. `docs/01_PRD.md`
6. `docs/02_SYSTEM_ARCHITECTURE.md`
7. `docs/10_IMPLEMENTATION_PLAN.md` when it exists

## Prime Implementation Principle

```text
Manse Engine calculates.
LLM interprets.
TCO converts interpretation into action policy.
LangGraph orchestrates.
Supabase persists.
Safety Gate constrains.
```

## Current Batch

This package is **Batch 1** of the improved repo document set. It contains the canonical product definition, MVP PRD, and system architecture foundation.

Included files:

```text
README.md
AGENTS.md
DOC_INDEX.md
docs/00_PROJECT_CANON.md
docs/01_PRD.md
docs/02_SYSTEM_ARCHITECTURE.md
```

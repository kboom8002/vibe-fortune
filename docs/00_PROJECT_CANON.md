# 00_PROJECT_CANON.md
# Project Canon
## TCO-Vibe Fortune Coach v2

Version: 0.2
Status: Canonical Product Philosophy

---

## 1. Canonical One-Line Definition

**TCO-Vibe Fortune Coach**는 사주·대운·세운을 구조적 prior로 삼고, 현재 Vibe와 실제 행동 로그를 TCO 개념 상태공간으로 번역해, 일/주/月 단위 행동 정책을 생성하는 자기운영 AI 에이전트다.

---

## 2. The Product Is Not a Fortune Teller

This product does not predict a fixed future.

```text
Fortune is not destiny.
Fortune is a structural prior.
The product converts chart/luck cycles, current state, and user context into action policies.
```

운세는 결론이 아니라 입력값이다. 사용자는 운세를 믿도록 설득당하는 것이 아니라, 구조적 prior를 참고하여 오늘의 리스크와 행동 정책을 더 잘 운영한다.

---

## 3. Core Formula

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

### Chart Prior

사주, 대운, 세운, 월운, 일운 등 deterministic Manse Engine이 계산한 구조적 입력값.

### Current Vibe State

사용자가 현재 입력한 valence, arousal, energy, focus, socialLoad 등의 상태값.

### User Context

현재 초점, 질문, 도메인, 상황 설명.

### Run-Receipt

사용자가 실제로 무엇을 했고, 왜 했고, 무엇을 미뤘고, 무엇을 배웠는지에 대한 행동 로그.

### Context Tensor

해석에 필요한 모든 축을 묶은 문맥 텐서.

### Action Policy

오늘의 행동 모드, 해야 할 일, 하지 말아야 할 일, 미룰 일, 경계 문장, 회고 질문.

---

## 4. Core Separation

```text
Manse Engine calculates.
LLM interprets.
TCO converts interpretation into action policy.
LangGraph orchestrates.
Supabase persists.
Safety Gate constrains.
```

This separation is non-negotiable.

---

## 5. Deterministic Calculation Principle

The LLM must never calculate:

- year pillar,
- month pillar,
- day pillar,
- hour pillar,
- major luck direction,
- major luck start age,
- annual luck,
- daily luck.

All calculation comes from `/src/lib/manse` and returns structured JSON with warnings and confidence status.

---

## 6. TCO-Vibe Interpretation Principle

TCO-Vibe Layer does not “explain fortune words.”

It transforms structural prior and current state into operational concepts:

```text
element.fire.expression
→ visibility opportunity
→ overclaim risk
→ boundary note required
→ publish only proof-backed artifact
```

Fortune is translated into:

- concept state,
- risk vector,
- action policy,
- forbidden actions,
- review questions,
- sensory prescriptions.

---

## 7. Product Voice

The voice must be:

```text
calm
non-deterministic
actionable
boundary-aware
respectful of user autonomy
```

Avoid:

```text
fearful
absolute
mystically coercive
relationship-manipulative
medical/legal/investment authoritative
```

---

## 8. User Autonomy Principle

The user always remains the decision maker.

The product may say:

```text
오늘은 확장보다 정리 모드가 적합합니다.
```

The product must not say:

```text
오늘 계약하지 않으면 큰 손해가 납니다.
```

---

## 9. Run-Receipt as Behavioral Posterior

The system must learn from what the user actually did.

```text
ForecastOutput
→ User Action
→ RunReceipt
→ Recomposition
→ Next Context Tensor Bias
```

Without Run-Receipt, the service becomes a daily content generator. With Run-Receipt, it becomes a self-operating feedback loop.

---

## 10. MVP Canon

MVP must prove:

```text
Can deterministic chart/luck prior + current vibe + user focus be converted into a safe, useful, daily operating board?
```

MVP success is not prediction accuracy. MVP success is:

- template completeness,
- calculation correctness,
- risk alignment,
- action usefulness,
- safety compliance,
- user return via Run-Receipt.

---

## 11. Canonical Output Structure

Every daily forecast must include:

```text
1. One-line conclusion
2. Structural prior summary
3. Current Vibe summary
4. Core Concept State
5. Risk Vector
6. Action Policy
7. Required actions
8. Forbidden actions
9. Boundary notes
10. Reflection question
11. Run-Receipt CTA
```

---

## 12. Final Canon

```text
This product does not tell the user what fate will do.
It helps the user decide what they should do today.
```

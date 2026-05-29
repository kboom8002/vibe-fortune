# 12_RUN_RECEIPT_RECOMPOSITION.md
# Run-Receipt and Recomposition Loop

Version: 0.2

---

## 1. Purpose

Run-Receipt turns the product from a fortune output app into a behavioral self-operation agent.

```text
ForecastOutput
→ ActionPolicy
→ User Action
→ RunReceipt
→ RecompositionSummary
→ Next ContextTensor / Policy Bias
```

---

## 2. Run-Receipt UX

After every forecast, show CTA:

```text
오늘 실행한 것을 기록하고 내일의 운영판을 더 정확하게 만들기
```

Fields:

```text
whatIDid
whyIChoseIt
whatAIHelped
myJudgment
whatIDeferred
whatILearned
nextAction
```

---

## 3. MVP Recomposition

MVP recomposition is rule-based summary, not personalization black box.

Input:

```text
recentRunReceipts: last 7 or 30 days
recentRiskVectors
recentActionPolicies
```

Output:

```json
{
  "repeatedPatterns": ["scope_leak", "late_night_decision"],
  "reducedRisks": ["overclaim"],
  "increasedRisks": ["burnout"],
  "nextPolicyBias": {
    "mode": "Cleanup",
    "forbiddenActions": ["새 기능 착수", "밤 10시 이후 결정"]
  },
  "confidence": 0.72
}
```

---

## 4. Recomposition Rules

| Pattern | Signal | Next bias |
|---|---|---|
| Repeated non-execution | required actions not completed 3 times | reduce scope, single-action policy |
| Repeated overwork | high arousal + low sleep + many actions | Recovery mode bias |
| Boundary improvement | boundary actions completed repeatedly | lower overclaim/scopeLeak |
| Relationship pressure | repeated long-message intent | warmth + autonomy boundary |
| Good evidence behavior | market proof logged | Expansion allowed with boundary |

---

## 5. Weekly Use

Weekly forecast must include:

```text
- 지난 7일 반복 패턴
- 줄어든 리스크
- 커진 리스크
- 이번 주 핵심 Concept Gap
- 이번 주 Action Policy bias
```

---

## 6. Monthly Use

Monthly forecast must include:

```text
- 월간 Concept Portfolio
- 월간 Risk Portfolio
- Evidence Target
- Boundary Policy
- Revenue / Relationship / Recovery Policy
- next 30-day recomposition goal
```

---

## 7. Safety Rule

Run-Receipt must not shame the user for non-execution.

Allowed:

```text
실행되지 않은 항목은 계획이 너무 컸다는 신호일 수 있습니다.
내일은 하나만 남깁니다.
```

Forbidden:

```text
당신이 실행하지 않아서 운을 놓쳤습니다.
```

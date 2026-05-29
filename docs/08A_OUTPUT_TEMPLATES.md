# 08A_OUTPUT_TEMPLATES.md
# Forecast Output Templates

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

This document defines the user-facing output templates for daily, weekly, and monthly forecasts.

Forecasts must be structured, action-oriented, and safety-compliant.

---

## 2. Universal Output Rules

Every forecast must:

```text
1. Avoid deterministic prediction.
2. Explain chart/luck as structural prior.
3. Include Vibe/current-state interpretation.
4. Include TCO Core Concept State.
5. Include Risk Vector.
6. Include Action Policy.
7. Include Required Actions and Forbidden Actions.
8. Include reflection or run-receipt prompt.
9. Include boundary note when relevant.
```

---

## 3. Daily Forecast Output Contract

```ts
export type DailyForecastOutput = {
  mode: "daily"
  date: string
  grade: "expansion" | "consolidation" | "cleanup" | "recovery" | "mixed"
  oneLineConclusion: string
  structuralPriorSummary: string
  vibeSummary: string
  coreConceptState: string
  riskVectorSummary: {
    primaryRisk: string
    secondaryRisk?: string
    riskLevel: "low" | "medium" | "high" | "critical"
  }
  conceptGaps: string[]
  evidenceGaps: string[]
  boundaryGaps: string[]
  actionPolicy: {
    mode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery"
    requiredActions: string[]
    forbiddenActions: string[]
    deferredActions: string[]
    boundaryNotes: string[]
  }
  sixFieldForecast: {
    business: string
    relationship: string
    healthRecovery: string
    learningWriting: string
    brandingReputation: string
    riskSafety: string
  }
  bestTimeWindows?: string[]
  prescriptions: string[]
  reflectionQuestion: string
  runReceiptPrompt: string
  safetyFlags: string[]
}
```

---

## 4. Daily Markdown Template

```md
# 오늘의 운영 보드

## 한 줄 결론
{oneLineConclusion}

## 구조적 Prior
{structuralPriorSummary}

## 오늘의 Vibe
{vibeSummary}

## 오늘의 Core Concept State
{coreConceptState}

## 오늘의 Risk Vector
- Primary Risk: {primaryRisk}
- Secondary Risk: {secondaryRisk}
- Risk Level: {riskLevel}

## Concept / Evidence / Boundary Gap
### Concept Gap
{conceptGaps}

### Evidence Gap
{evidenceGaps}

### Boundary Gap
{boundaryGaps}

## Action Policy
Mode: {mode}

### 반드시 할 일
{requiredActions}

### 하지 말아야 할 일
{forbiddenActions}

### 미룰 일
{deferredActions}

### 경계 문장
{boundaryNotes}

## 6대 영역 간단 전망
- 사업/돈: {business}
- 관계/애정: {relationship}
- 건강/회복: {healthRecovery}
- 학습/글쓰기: {learningWriting}
- 브랜딩/평판: {brandingReputation}
- 리스크/안전: {riskSafety}

## 오늘의 처방
{prescriptions}

## 회고 질문
{reflectionQuestion}

## 실행 기록 안내
{runReceiptPrompt}
```

---

## 5. Weekly Forecast Output Contract

```ts
export type WeeklyForecastOutput = {
  mode: "weekly"
  weekRange: { from: string; to: string }
  oneLineConclusion: string
  weeklyCoreConcept: string
  weeklyPrimaryGap: string
  weeklyEvidenceTarget: string
  weeklyBoundaryTarget: string
  weeklyConversionTarget: string
  riskTrajectory: Array<{
    date: string
    primaryRisk: string
    riskLevel: string
  }>
  recompositionGoal: string
  actionPolicy: {
    requiredActions: string[]
    forbiddenActions: string[]
    reviewQuestions: string[]
  }
  runReceiptSummary?: string
  safetyFlags: string[]
}
```

---

## 6. Weekly Markdown Template

```md
# 주간 운영 리뷰

## 한 줄 결론
{oneLineConclusion}

## 주간 Core Concept
{weeklyCoreConcept}

## 주간 Primary Gap
{weeklyPrimaryGap}

## 이번 주 Evidence Target
{weeklyEvidenceTarget}

## 이번 주 Boundary Target
{weeklyBoundaryTarget}

## 이번 주 Conversion Target
{weeklyConversionTarget}

## Risk Trajectory
{riskTrajectory}

## Recomposition Goal
{recompositionGoal}

## 주간 Action Policy
### 반드시 할 일
{requiredActions}

### 하지 말아야 할 일
{forbiddenActions}

### 리뷰 질문
{reviewQuestions}

## 최근 실행 기록 요약
{runReceiptSummary}
```

---

## 7. Monthly Forecast Output Contract

```ts
export type MonthlyForecastOutput = {
  mode: "monthly"
  month: string
  oneLineConclusion: string
  monthlyConceptPortfolio: string[]
  monthlyRiskPortfolio: string[]
  evidenceTarget: string[]
  boundaryPolicy: string[]
  revenuePolicy?: string[]
  relationshipPolicy?: string[]
  recoveryPolicy?: string[]
  monthlyActionCalendar: Array<{
    week: string
    policyMode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery"
    recommendedFocus: string
    forbiddenFocus: string
  }>
  safetyFlags: string[]
}
```

---

## 8. Monthly Markdown Template

```md
# 월간 운영 계획

## 한 줄 결론
{oneLineConclusion}

## 월간 Concept Portfolio
{monthlyConceptPortfolio}

## 월간 Risk Portfolio
{monthlyRiskPortfolio}

## Evidence Target
{evidenceTarget}

## Boundary Policy
{boundaryPolicy}

## Revenue / Relationship / Recovery Policy
### Revenue
{revenuePolicy}

### Relationship
{relationshipPolicy}

### Recovery
{recoveryPolicy}

## 월간 Action Calendar
{monthlyActionCalendar}
```

---

## 9. Forbidden Output Examples

Do not output:

```text
오늘 반드시 큰돈이 들어옵니다.
이 사람은 당신을 사랑할 운명입니다.
투자는 무조건 성공합니다.
병원에 갈 필요 없습니다.
계약서를 확인하지 않아도 됩니다.
상대를 이렇게 조종하세요.
```

Use instead:

```text
오늘은 확장 신호보다 경계 조건을 먼저 정리하는 편이 안전합니다.
관계 영역에서는 큰 해석보다 짧고 따뜻한 신호가 적합합니다.
투자나 계약 판단은 전문가 확인과 별도 검토가 필요합니다.
```

---

## 10. Acceptance Criteria

- Every output includes Action Policy.
- Every output avoids deterministic prediction.
- High-risk contexts include boundary note.
- Daily output includes Run-Receipt prompt.
- Output JSON and markdown are both generated.

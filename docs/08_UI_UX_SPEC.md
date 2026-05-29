# 08_UI_UX_SPEC.md
# UI/UX Specification

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

This document defines the Next.js App Router screens and shadcn/ui component blueprints for TCO-Vibe Fortune Coach.

The UI must make the product feel like a daily operating board, not a fatalistic fortune teller.

---

## 2. Core UX Principles

```text
1. Fortune is a structural prior, not destiny.
2. Vibe is current state, not diagnosis.
3. Every forecast must end in action policy.
4. Safety boundaries must be visible but not fear-inducing.
5. Run-Receipt must turn advice into learning loop.
```

---

## 3. Route Map

```text
/                         Landing
/app                      App Home
/app/onboarding           Onboarding Hub
/app/onboarding/birth     Birth Profile Setup
/app/daily                Daily Loop
/app/result/[id]          Forecast Result
/app/weekly               Weekly Review
/app/monthly              Monthly Plan
/app/run-receipt/[id]     Run Receipt
/app/history              Forecast History
/app/risk                 Risk Dashboard
/app/settings             Settings
```

---

## 4. Core Components

```text
BirthProfileForm
ProvidedChartInput
VibeSliderGroup
CurrentFocusSelector
GenerateForecastButton
TodayBoardCard
CoreConceptStateCard
RiskVectorCard
ActionPolicyChecklist
SixFieldForecastPanel
BestTimeWindowList
ForbiddenRuleList
PrescriptionCard
BoundaryAlert
RunReceiptForm
WeeklyTrajectoryTable
MonthlyConceptPortfolio
HistoryTimeline
ChartConsistencyNotice
```

---

## 5. Screen Specifications

### 5.1 Landing

Route: `/`

Purpose: Explain the product in one minute.

Hero message:

```text
사주와 오늘의 Vibe를 행동 정책으로 바꾸는 자기운영 AI 코치
```

Primary CTA:

```text
오늘의 운영 보드 만들기
```

Sections:

1. Product one-liner
2. How it works
3. Safety boundary
4. Example daily board
5. CTA

Acceptance:

- User understands this is not deterministic fortune telling.
- CTA routes authenticated user to `/app/daily`; unauthenticated user to sign-in.

---

### 5.2 Onboarding Hub

Route: `/app/onboarding`

Purpose: Guide user to create birth profile and first Vibe check-in.

Components:

```text
OnboardingStepList
BirthProfileStatusCard
VibeCheckInStatusCard
SafetyBoundaryCard
```

Acceptance:

- User can continue to birth setup.
- User sees explanation: calculation policy may vary by school.

---

### 5.3 Birth Profile Setup

Route: `/app/onboarding/birth`

Purpose: Collect birth data and optional user-provided chart.

Components:

```text
BirthProfileForm
ProvidedChartInput
CalculationPolicyNotice
ChartConsistencyNotice
SaveBirthProfileButton
```

Form fields:

```text
name
birthDateTime
timezone
gender
birthLocation optional
providedChart optional
```

Rules:

- Explain that `standard_kr` policy is used.
- If user provides chart and mismatch occurs, show consistency notice.
- Do not force user to provide exact birth time; warn about lower confidence.

Acceptance:

- Birth profile saved.
- Chart calculation performed.
- User can proceed to `/app/daily`.

---

### 5.4 Daily Loop

Route: `/app/daily`

Purpose: Generate today's operating board.

Components:

```text
VibeSliderGroup
CurrentFocusSelector
OneLineContextInput
GenerateForecastButton
RecentRunReceiptNudge
```

Primary CTA:

```text
오늘의 운영 보드 생성
```

Input flow:

1. Select Vibe sliders.
2. Select focus domain.
3. Add one-line context.
4. Click generate.

Acceptance:

- Vibe check-in can be saved.
- Forecast request is created.
- User is routed to `/app/result/[id]`.

---

### 5.5 Forecast Result

Route: `/app/result/[id]`

Purpose: Show structured daily/weekly/monthly forecast output.

Components:

```text
BoundaryAlert
TodayBoardCard
CoreConceptStateCard
RiskVectorCard
ActionPolicyChecklist
SixFieldForecastPanel
BestTimeWindowList
ForbiddenRuleList
PrescriptionCard
RunReceiptCTA
```

Visual hierarchy:

1. One-line conclusion
2. Safety/warning notices
3. Core Concept State
4. Risk Vector
5. Action Policy
6. Six-field forecast
7. Run Receipt CTA

Acceptance:

- Output does not read like fatalistic prediction.
- Required actions and forbidden actions are clearly visible.
- User can create Run-Receipt.

---

### 5.6 Run Receipt

Route: `/app/run-receipt/[id]`

Purpose: Record what user actually did and learned.

Components:

```text
ForecastSummaryMiniCard
RunReceiptForm
NextActionInput
SaveRunReceiptButton
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

Acceptance:

- Run receipt is saved.
- User is returned to result or history.
- Future weekly/monthly forecast can use receipt.

---

### 5.7 Weekly Review

Route: `/app/weekly`

Purpose: Generate or view weekly trajectory.

Components:

```text
WeeklyTrajectoryTable
WeeklyConceptStateCard
WeeklyRiskTrendCard
WeeklyActionPolicyCard
RunReceiptSummaryCard
```

Acceptance:

- Recent 7-day run receipts are summarized.
- Weekly output includes recomposition goal.

---

### 5.8 Monthly Plan

Route: `/app/monthly`

Purpose: Generate monthly concept portfolio and action policy.

Components:

```text
MonthlyConceptPortfolio
MonthlyRiskPortfolio
EvidenceTargetCard
BoundaryPolicyCard
MonthlyActionCalendar
```

Acceptance:

- Monthly output includes concept portfolio, risk portfolio, evidence target, and boundary policy.

---

### 5.9 History

Route: `/app/history`

Purpose: Browse past forecasts and run receipts.

Components:

```text
HistoryTimeline
ForecastFilter
RunReceiptBadge
RiskTrendMiniChart
```

Acceptance:

- User can see only own history.
- User can open past forecast.

---

### 5.10 Settings

Route: `/app/settings`

Purpose: Manage profile, calculation policy notices, privacy options.

Components:

```text
ProfileSettingsForm
DataExportButton
DeleteDataButton
PrivacyNoticeCard
CalculationPolicyCard
```

Acceptance:

- User can view privacy rules.
- User can delete data.

---

## 6. UI Copy Rules

Use:

```text
오늘의 운영 보드
구조적 prior
행동 정책
경계 조건
실행 기록
```

Avoid:

```text
당신의 운명은 확정되었습니다
반드시 일어납니다
위험합니다, 큰일납니다
무조건 성공합니다
상대는 반드시 이렇게 느낍니다
```

---

## 7. Mobile Priority

Daily Loop and Forecast Result must be mobile-first.

Minimum responsive breakpoints:

```text
mobile: 360px+
tablet: 768px+
desktop: 1024px+
```

---

## 8. Acceptance Criteria

- User can complete onboarding.
- User can generate daily forecast.
- User can see boundary and warnings.
- User can save run receipt.
- UI avoids fatalistic language.
- App works on mobile.

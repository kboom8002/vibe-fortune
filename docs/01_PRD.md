# 01_PRD.md
# Product Requirements Document
## TCO-Vibe Fortune Coach v2

Version: 0.2
Status: MVP PRD

---

## 1. Product Summary

TCO-Vibe Fortune Coach는 사용자의 출생 정보에서 deterministic Manse Engine으로 사주·대운·세운을 계산하고, 현재 Vibe Check-in과 사용자 초점을 결합하여 TCO Action Policy 기반의 일/주/月 운영 보드를 생성하는 자기운영 AI 에이전트다.

---

## 2. Problem

일반 운세 서비스는 다음 한계를 가진다.

```text
- 결과를 결정론적으로 말한다.
- 실제 행동으로 연결되지 않는다.
- 사용자의 현재 상태를 반영하지 않는다.
- 어제 실제로 무엇을 했는지 학습하지 않는다.
- 사주 계산과 LLM 해석이 섞여 오류와 환각이 발생한다.
```

사용자는 “미래가 정해져 있는지”보다 다음을 원한다.

```text
오늘 무엇을 해야 하는가?
무엇을 하지 말아야 하는가?
내 현재 상태에서 어떤 리스크를 줄여야 하는가?
이번 주 어떤 증거를 쌓아야 하는가?
내 행동 패턴을 어떻게 재구성해야 하는가?
```

---

## 3. Target Users

### Primary User

자기 사업, 창작, 관계, 건강, 학습, 브랜딩을 운영하는 고몰입 사용자.

이 사용자는 사주/운세를 신비적 예언보다 **자기 운영 리듬과 의사결정 프레임**으로 활용하고 싶어한다.

### Secondary Users

- AI 자기관리 도구에 관심 있는 사용자
- 창업자/프리랜서/크리에이터
- 매일의 루틴과 행동 정책을 원하지만 일반 생산성 앱에는 몰입하지 못하는 사용자
- 사주/운세를 좋아하지만 더 안전하고 실천적인 방식으로 사용하고 싶은 사용자

---

## 4. MVP Goal

MVP의 목표는 다음이다.

```text
사용자가 Birth Profile과 Vibe Check-in을 입력하면,
시스템이 deterministic chart/luck prior를 계산하고,
TCO-Vibe action policy가 포함된 Daily Forecast Board를 생성하며,
사용자가 Run-Receipt를 남길 수 있는가?
```

---

## 5. MVP Features

### Feature 1. Birth Profile Setup

#### User Story

As a user, I want to enter my birth information so that the system can calculate my chart and luck cycles deterministically.

#### Inputs

- name
- birthDateTime
- timezone
- gender or unspecified
- birthLocation optional
- user-provided chart optional
- calculation policy default: standard_kr

#### Outputs

- BirthProfile
- ManseChart
- ChartConsistency
- MajorLuckCycle

#### Acceptance Criteria

- User can create a birth profile.
- Chart calculation is performed only by Manse Engine.
- Calculation warnings are visible when relevant.
- User-provided chart can be compared with calculated chart.
- Sensitive birth data is protected by RLS.

---

### Feature 2. Vibe Check-in

#### User Story

As a user, I want to report my current state so that the forecast reflects my actual daily condition.

#### Inputs

- valence
- arousal
- energy
- focus
- socialLoad
- sleepHours optional
- oneLineEvent optional

#### Outputs

- VibeCheckIn

#### Acceptance Criteria

- Sliders validate 0~10.
- Check-in is saved to Supabase with user ownership.
- Check-in can be used by daily forecast generation.

---

### Feature 3. Daily Forecast Board

#### User Story

As a user, I want to receive a daily fortune board that translates chart/luck and current Vibe into concrete action policies.

#### Inputs

- birth_profile_id
- target_date
- vibe_checkin
- current_focus
- user_message optional

#### Output

- grade
- one_line_conclusion
- structural_prior_summary
- vibe_summary
- tco_core_concept_state
- risk_vector
- action_policy
- required_actions
- forbidden_actions
- boundary_notes
- reflection_question
- run_receipt_cta

#### Acceptance Criteria

- Must include all required template fields.
- Must not contain deterministic prediction.
- Must include at least one actionable policy.
- Must include at least one forbidden action.
- Must pass SafetyBoundaryReviewer.
- Must save ForecastOutput to Supabase.

---

### Feature 4. Run-Receipt

#### User Story

As a user, I want to record what I actually did so that future forecasts learn from my behavior.

#### Inputs

- forecastOutputId
- whatIDid
- whyIChoseIt
- whatAIHelped
- myJudgment
- whatIDeferred
- whatILearned
- nextAction

#### Outputs

- RunReceipt

#### Acceptance Criteria

- User can submit Run-Receipt after Daily Forecast.
- Receipt is linked to ForecastOutput.
- Weekly/monthly forecast can retrieve recent receipts.

---

### Feature 5. Weekly Review

#### User Story

As a user, I want to see my weekly concept/risk/action pattern so that I can adjust the next week.

#### Inputs

- recent ForecastOutputs
- recent RunReceipts
- current Vibe Check-in

#### Outputs

- weekly_core_concept
- repeated_risk_pattern
- reduced_risks
- increased_risks
- next_policy_bias
- weekly_action_policy

#### MVP Acceptance Criteria

- Can summarize recent 7 days if data exists.
- If insufficient data, shows partial forecast with warning.
- Must include next week action focus.

---

## 6. MVP Non-goals

Do not implement in MVP:

```text
- payment
- social feed
- third-party calendar integration
- automated messaging to others
- advanced true solar time correction
- multiple astrology schools
- full relationship coaching engine
- medical/legal/investment decision engine
- marketplace
```

---

## 7. User Flows

### Flow A. First-Time Setup

```text
Landing
→ Sign in
→ Birth Profile Setup
→ Chart Calculation
→ Calculation Summary
→ Daily Loop
```

### Flow B. Daily Loop

```text
Daily Page
→ Vibe Check-in
→ Current Focus Selection
→ Generate Today's Operating Board
→ Daily Forecast Result
→ ActionPolicy Checklist
→ Run-Receipt CTA
```

### Flow C. Run-Receipt Loop

```text
Forecast Result
→ End-of-day Run-Receipt
→ Save
→ Weekly Recomposition
```

---

## 8. Core Screens

- Landing
- Auth
- Onboarding
- Birth Profile Setup
- Chart Summary
- Daily Loop
- Forecast Result
- Run-Receipt
- History
- Weekly Review
- Settings

---

## 9. Success Metrics

### Activation

- birth profile completion rate
- first vibe check-in completion rate
- first daily forecast generation rate

### Engagement

- daily forecast return rate
- action policy checklist interaction rate
- Run-Receipt submission rate

### Quality

- template completeness
- chart calculation accuracy
- action policy usefulness rating
- deterministic prediction violation rate
- safety boundary pass rate

### Learning Loop

- weekly recomposition use rate
- repeated risk detection rate
- next policy usefulness rating

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| LLM calculates chart incorrectly | deterministic Manse Engine only |
| deterministic/fear-based output | SafetyBoundaryReviewer |
| privacy risk for birth data | Supabase RLS |
| vague advice | ActionPolicy required/forbidden actions |
| astrology policy disagreement | calculation policy + warnings |
| user over-reliance | autonomy-first language |

---

## 11. MVP Release Gate

MVP can be released when:

```text
1. Birth Profile → ManseChart generation works.
2. Vibe Check-in works.
3. Daily Forecast Board works with schema validation.
4. Output has no deterministic prediction.
5. Run-Receipt can be saved.
6. RLS protects user data.
7. Safety tests pass.
```

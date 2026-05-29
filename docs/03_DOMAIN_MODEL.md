# 03_DOMAIN_MODEL.md
# Domain Model
## TCO-Vibe Fortune Coach v2

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

이 문서는 TCO-Vibe Fortune Coach의 핵심 도메인 모델을 정의한다. Claude Opus 4.6은 이 문서를 기준으로 다음을 구현한다.

```txt
1. Supabase table schema
2. TypeScript domain types
3. Zod validation schema
4. LangGraph state schema
5. API request/response model
6. Persistence ownership model
```

---

## 2. Core Domain Principle

이 제품은 사주를 고정된 예언으로 다루지 않는다. 사주·대운·세운·일운은 **structural prior**이며, 현재 Vibe 상태와 실제 행동 기록은 해석을 보정하는 현재 상태 및 posterior다.

```txt
BirthProfile
→ ManseChart
→ LuckCycle
→ VibeCheckIn
→ ForecastRequest
→ ContextTensor
→ ConceptState
→ RiskVector
→ ActionPolicy
→ ForecastOutput
→ RunReceipt
→ Recomposition
```

최종 출력은 “무슨 일이 반드시 일어난다”가 아니라 **오늘/이번 주/이번 달의 실행 정책**이어야 한다.

---

## 3. Entity Overview

### User-owned entities

```txt
Profile
BirthProfile
ManseChart
MajorLuckCycle
LuckPeriod
VibeCheckIn
ForecastRequest
ContextTensor
ConceptState
RiskVector
ActionPolicy
ForecastOutput
RunReceipt
SafetyEvent
```

### Admin-managed entities

```txt
ConceptEntity
OperatorRule
GoldsetItem
EvalResult
TcoPackVersion
PromptVersion
```

---

## 4. Profile

### Purpose
사용자의 서비스 기본 프로필.

### Fields

```ts
export type Profile = {
  id: string;
  userId: string;
  displayName: string;
  defaultTimezone: string;
  preferredLanguage: "ko" | "en";
  createdAt: string;
  updatedAt: string;
};
```

### Rules

- `userId`는 `auth.users.id`를 참조한다.
- 기본 timezone은 `Asia/Seoul`이다.
- MVP 기본 언어는 `ko`이다.

---

## 5. BirthProfile

### Purpose
출생 정보, 계산 정책, 사용자 제공 사주를 저장한다.

### Fields

```ts
export type BirthProfile = {
  id: string;
  userId: string;
  name: string;
  birthDateTime: string;
  timezone: string;
  gender: "male" | "female" | "other" | "unspecified";
  birthLocation?: string;
  providedChart?: ProvidedChart;
  calculationPolicy: MansePolicy;
  createdAt: string;
  updatedAt: string;
};
```

### Rules

- `birthDateTime`은 ISO string이다.
- timezone은 IANA timezone string이다.
- 사용자가 사주팔자를 직접 제공할 수 있다.
- 계산 결과와 사용자 제공 사주가 다르면 `ChartConsistency`를 저장한다.
- 출생 정보는 민감 데이터로 취급하고 RLS로 보호한다.

---

## 6. MansePolicy

```ts
export type MansePolicy = {
  yearBoundary: "lichun" | "lunar_new_year";
  monthBoundary: "solar_terms";
  dayEpoch: "verified_jdn_epoch";
  hourPolicy: "standard_2h";
  nightZiPolicy: "disabled" | "enabled";
  trueSolarTime: boolean;
  majorLuckDirectionRule: "gender_yinyang_year_stem";
  majorLuckStartRule: "days_to_jieqi_divide_by_3";
  policyName: "standard_kr" | "custom";
};
```

### MVP Default

```ts
standard_kr = {
  yearBoundary: "lichun",
  monthBoundary: "solar_terms",
  dayEpoch: "verified_jdn_epoch",
  hourPolicy: "standard_2h",
  nightZiPolicy: "disabled",
  trueSolarTime: false,
  majorLuckDirectionRule: "gender_yinyang_year_stem",
  majorLuckStartRule: "days_to_jieqi_divide_by_3",
  policyName: "standard_kr"
}
```

---

## 7. ManseChart

### Purpose
계산된 사주팔자와 파생 정보를 저장한다.

```ts
export type ManseChart = {
  id: string;
  userId: string;
  birthProfileId: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMaster: {
    stem: HeavenlyStem;
    element: FiveElement;
    polarity: "yin" | "yang";
  };
  tenGods: Record<string, string>;
  hiddenStems: Record<string, string[]>;
  fiveElementDistribution: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  chartConsistency?: ChartConsistency;
  calculationPolicy: MansePolicy;
  warnings: ManseWarning[];
  createdAt: string;
};
```

### Core Types

```ts
export type HeavenlyStem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
export type EarthlyBranch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";
export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";
export type Pillar = { stem: HeavenlyStem; branch: EarthlyBranch; label: string };
```

---

## 8. ChartConsistency

### Purpose
계산 사주와 사용자 제공 사주의 일치 여부.

```ts
export type ChartConsistency = {
  status: "matched" | "mismatched" | "not_provided" | "calculation_failed";
  mismatchedFields?: Array<"year" | "month" | "day" | "hour">;
  canonicalSource: "calculated" | "user_provided";
  note?: string;
};
```

### Rules

- 불일치가 있어도 분석은 계속할 수 있다.
- 단, UI는 계산 정책과 불일치 상태를 표시해야 한다.
- 사용자가 명시적으로 선택한 경우 `user_provided`를 canonical interpretation source로 사용할 수 있다.

---

## 9. MajorLuckCycle / LuckPeriod

```ts
export type MajorLuckCycle = {
  id: string;
  userId: string;
  birthProfileId: string;
  chartId: string;
  direction: "forward" | "backward";
  startAge: number;
  startDate?: string;
  cycles: MajorLuckItem[];
  calculationPolicy: MansePolicy;
  warnings: ManseWarning[];
  createdAt: string;
};

export type MajorLuckItem = {
  index: number;
  ageFrom: number;
  ageTo: number;
  dateFrom?: string;
  dateTo?: string;
  pillar: Pillar;
};

export type LuckPeriod = {
  id: string;
  userId: string;
  chartId: string;
  type: "annual" | "monthly" | "daily";
  fromDate: string;
  toDate: string;
  items: LuckPeriodItem[];
  createdAt: string;
};
```

---

## 10. VibeCheckIn

### Purpose
사용자의 현재 상태 입력. Vibe는 진단이 아니라 **운영 상태 체크인**이다.

```ts
export type VibeCheckIn = {
  id: string;
  userId: string;
  valence: number;
  arousal: number;
  energy: number;
  focus: number;
  socialLoad: number;
  sleepHours?: number;
  oneLineEvent?: string;
  createdAt: string;
};
```

### Validation

- valence, arousal, energy, focus, socialLoad는 0~10.
- sleepHours는 0~24.
- 민감 속성, 질병 진단, 성격 고정 라벨로 변환하지 않는다.

---

## 11. ForecastRequest

```ts
export type ForecastRequest = {
  id: string;
  userId: string;
  mode: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  targetDate?: string;
  dateRange?: { from: string; to: string };
  currentFocus: ForecastFocus[];
  userMessage?: string;
  birthProfileId?: string;
  vibeCheckInId?: string;
  createdAt: string;
};

export type ForecastFocus =
  | "business_finance"
  | "relationship_love"
  | "health_recovery"
  | "learning_writing_research"
  | "reputation_branding"
  | "risk_legal_safety";
```

---

## 12. ContextTensor

### Purpose
TCO-Vibe 해석에 필요한 현재 문맥 상태.

```ts
export type ContextTensor = {
  id: string;
  userId: string;
  forecastRequestId: string;
  domainAxis: ForecastFocus[];
  userStateAxis: {
    valence: number;
    arousal: number;
    energy: number;
    focus: number;
    socialLoad: number;
  };
  riskAxis: string[];
  intentAxis: string[];
  evidenceAxis: string[];
  temporalAxis: {
    majorLuck?: string;
    annualLuck?: string;
    monthlyLuck?: string;
    dailyLuck?: string;
    productPhase?: string;
  };
  channelAxis: "daily_board" | "weekly_review" | "monthly_plan" | "relationship_message" | "business_strategy" | "general";
  createdAt: string;
};
```

---

## 13. ConceptState

```ts
export type ConceptState = {
  id: string;
  userId: string;
  forecastRequestId: string;
  coreConceptState: string;
  activeConcepts: string[];
  suppressedConcepts: string[];
  conceptGaps: string[];
  evidenceGaps: string[];
  boundaryGaps: string[];
  conversionGaps: string[];
  confidence: number;
  createdAt: string;
};
```

---

## 14. RiskVector

```ts
export type RiskVector = {
  id: string;
  userId: string;
  forecastRequestId: string;
  overextension: number;
  scopeLeak: number;
  overclaim: number;
  burnout: number;
  relationshipDryness: number;
  emotionalOverreaction: number;
  legalSafetyRisk: number;
  missedOpportunity: number;
  primaryRisk: string;
  secondaryRisk?: string;
  createdAt: string;
};
```

### Rules

- 모든 risk 값은 0~1.
- `primaryRisk`는 가장 높은 risk 개념이어야 한다.
- MVP에서는 deterministic rule-based scoring을 우선한다.
- LLM은 risk 설명을 할 수 있지만 단독 scorer가 되어서는 안 된다.

---

## 15. ActionPolicy

```ts
export type ActionPolicy = {
  id: string;
  userId: string;
  forecastRequestId: string;
  mode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery";
  warmthVsCompetence: "Warmth" | "Competence" | "Balanced";
  requiredActions: string[];
  forbiddenActions: string[];
  deferredActions: string[];
  boundaryNotes: string[];
  reviewQuestions: string[];
  sensoryPrescription?: {
    color?: string;
    light?: string;
    space?: string;
    rhythm?: string;
    ritual?: string;
  };
  createdAt: string;
};
```

### Rules

- requiredActions는 최소 1개 이상.
- 고위험 요청에는 boundaryNotes가 있어야 한다.
- Relationship domain에서는 상대의 자율성을 침해하는 지시를 금지한다.
- Business domain에서는 성과 보장, 무제한 커스터마이징 약속, 법률/투자 단정을 금지한다.

---

## 16. ForecastOutput

```ts
export type ForecastOutput = {
  id: string;
  userId: string;
  forecastRequestId: string;
  mode: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  outputJson: unknown;
  outputMarkdown: string;
  grade?: string;
  contextTensorId?: string;
  conceptStateId?: string;
  riskVectorId?: string;
  actionPolicyId?: string;
  safetyFlags: string[];
  createdAt: string;
};
```

### Rules

- `outputJson`은 schema validation을 통과해야 한다.
- `outputMarkdown`은 사용자 표시용 최종 텍스트다.
- `safetyFlags`가 있으면 UI에서 BoundaryAlert를 표시한다.

---

## 17. RunReceipt

### Purpose
사용자의 실제 행동 결과를 저장한다. RunReceipt는 다음 forecast의 posterior다.

```ts
export type RunReceipt = {
  id: string;
  userId: string;
  forecastOutputId: string;
  whatIDid: string;
  whyIChoseIt: string;
  whatAIHelped: string;
  myJudgment: string;
  whatIDeferred: string;
  whatILearned: string;
  nextAction: string;
  createdAt: string;
};
```

---

## 18. Admin Concepts

### ConceptEntity

```ts
export type ConceptEntity = {
  id: string;
  conceptId: string;
  preferredLabel: string;
  aliases: string[];
  conceptType: "state" | "risk" | "intent" | "evidence" | "action" | "style" | "behavior" | "domain";
  domain: string[];
  vectors?: Record<string, unknown>;
  region?: Record<string, unknown>;
  operators?: string[];
  evidenceSources?: string[];
  reviewerStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
};
```

### OperatorRule

```ts
export type OperatorRule = {
  id: string;
  operatorId: string;
  name: string;
  trigger: {
    concepts?: string[];
    risks?: string[];
    vibeConditions?: Record<string, unknown>;
    luckConditions?: Record<string, unknown>;
  };
  outputPolicy: Partial<ActionPolicy>;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
```

---

## 19. Final Domain Principle

```txt
Chart is a structural prior.
VibeCheckIn is current state.
ContextTensor is interpretation context.
ConceptState is semantic activation.
RiskVector is operational risk.
ActionPolicy is executable strategy.
RunReceipt is behavioral posterior.
```

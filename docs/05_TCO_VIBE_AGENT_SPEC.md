# 05_TCO_VIBE_AGENT_SPEC.md
# TCO-Vibe Agent Specification
## Concept State, Risk Vector, Operator, and Action Policy Layer

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

이 문서는 사주·대운·세운·현재 Vibe·사용자 문맥을 TCO 개념 상태공간으로 변환하고, 최종적으로 Action Policy를 생성하는 레이어를 정의한다.

---

## 2. Core Thesis

```txt
운세는 예언이 아니다.
운세는 structural prior다.
TCO-Vibe Layer는 운세를 설명하는 층이 아니라 행동 정책으로 바꾸는 제어층이다.
```

Formula:

```txt
Chart Prior
+ Luck Cycle Prior
+ Current Vibe State
+ User Context
+ Run-Receipt Posterior
→ Context Tensor
→ Concept State
→ Risk Vector
→ Operator Execution
→ Action Policy
→ Forecast Board
```

---

## 3. Context Tensor

```ts
export type VibeContextTensor = {
  domainAxis: DomainAxis[];
  userStateAxis: {
    valence: number;
    arousal: number;
    energy: number;
    focus: number;
    socialLoad: number;
  };
  riskAxis: RiskConcept[];
  intentAxis: IntentConcept[];
  evidenceAxis: EvidenceConcept[];
  temporalAxis: {
    majorLuck?: string;
    annualLuck?: string;
    monthlyLuck?: string;
    dailyLuck?: string;
    productPhase?: string;
  };
  channelAxis: ChannelAxis;
};
```

---

## 4. Concept State

```ts
export type ConceptState = {
  coreConceptState: string;
  activeConcepts: string[];
  suppressedConcepts: string[];
  conceptGaps: string[];
  evidenceGaps: string[];
  boundaryGaps: string[];
  conversionGaps: string[];
  confidence: number;
};
```

### Example

```json
{
  "coreConceptState": "Founder Proof Productized Sales",
  "activeConcepts": ["proof_externalization", "pricing_boundary", "market_validation", "burnout_guard"],
  "suppressedConcepts": ["new_feature_sprawl"],
  "conceptGaps": ["market_proof_not_separated"],
  "evidenceGaps": ["customer_case_not_documented"],
  "boundaryGaps": ["success_guarantee_language_not_checked"],
  "conversionGaps": ["contact_brief_cta_missing"],
  "confidence": 0.82
}
```

---

## 5. Risk Vector

```ts
export type FortuneRiskVector = {
  overextension: number;
  scopeLeak: number;
  overclaim: number;
  burnout: number;
  relationshipDryness: number;
  emotionalOverreaction: number;
  legalSafetyRisk: number;
  missedOpportunity: number;
  deterministicFortuneRisk: number;
  relationshipManipulationRisk: number;
  primaryRisk: RiskConcept;
  secondaryRisk?: RiskConcept;
};
```

### Risk Bands

```txt
0.00 - 0.29 = low
0.30 - 0.59 = medium
0.60 - 0.79 = high
0.80 - 1.00 = critical
```

---

## 6. Baseline Risk Rules

```txt
High arousal + high opportunity context → overextension increases.
High arousal + low energy → burnout increases.
Business focus + no pricing matrix → scopeLeak increases.
Public launch + weak boundary note → overclaim increases.
High socialLoad + relationship focus → emotionalOverreaction increases.
Low warmth + high competence → relationshipDryness increases.
Legal/medical/investment domain → legalSafetyRisk increases.
High opportunity + low action clarity → missedOpportunity increases.
```

MVP risk scoring must be rule-based first. LLM may explain risk but must not be the only scorer.

---

## 7. Action Policy

```ts
export type ActionPolicy = {
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
};
```

### Modes

#### Expansion
Use when energy/focus are sufficient and risk is not high.

#### Consolidation
Use when assets exist but must be structured, documented, priced, or packaged.

#### Cleanup
Use when scope leak, overclaim, clutter, unclear boundary, or unfinished work is high.

#### Recovery
Use when energy is low, burnout risk is high, or emotional overreaction risk is high.

---

## 8. Operator Priority

When multiple policies conflict:

```txt
1. Safety overrides everything.
2. Recovery overrides Expansion when burnout is high.
3. Boundary overrides publishing when overclaim is high.
4. Warmth overrides Competence in relationship context when dryness is high.
5. Cleanup overrides Expansion when scopeLeak is high.
```

---

## 9. Required Domain Packs

```txt
bazi_luck_pack.yaml
vibe_state_pack.yaml
business_growth_pack.yaml
relationship_signal_pack.yaml
recovery_health_pack.yaml
safety_boundary_pack.yaml
operator_rules.yaml
```

These files are executable seed data. The agent should load them before concept canonicalization and operator execution.

---

## 10. Forecast Writer Input

Forecast Writer must receive structured intermediate output.

```ts
export type ForecastWriterInput = {
  chartSummary: unknown;
  luckSummary: unknown;
  vibeCheckIn: VibeCheckIn;
  contextTensor: VibeContextTensor;
  conceptState: ConceptState;
  riskVector: FortuneRiskVector;
  actionPolicy: ActionPolicy;
  outputMode: "daily" | "weekly" | "monthly";
};
```

Forecast Writer must not invent chart values.

---

## 11. Daily Forecast Required Sections

Every daily forecast must include:

```txt
오늘의 Core Concept State
오늘의 Risk Vector
오늘의 Concept Gap
오늘의 Evidence Gap
오늘의 Boundary Gap
오늘의 Action Policy
오늘의 Forbidden Actions
오늘의 Reflection Question
```

---

## 12. MVP Simplification

MVP implements:

```txt
1. Rule-based Context Tensor Builder
2. Rule-based Risk Vectorizer
3. YAML-based Operator Rules
4. LLM-assisted Forecast Writer
5. Manual Run-Receipt Recomposition summary
```

Post-MVP:

```txt
1. Concept graph
2. pgvector concept retrieval
3. Human-rated goldset calibration
4. Long-term personalized policy bias
```

---

## 13. Final Rule

```txt
TCO-Vibe Layer does not predict fate.
It converts structural prior and current state into action policy.
```

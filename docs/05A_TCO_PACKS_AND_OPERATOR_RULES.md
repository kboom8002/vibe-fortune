# 05A_TCO_PACKS_AND_OPERATOR_RULES.md
# TCO Packs and Operator Rules

Version: 0.2  
Status: Executable Seed Data Contract

---

## 1. Purpose

이 문서는 `/tco-packs/*.yaml` 파일을 실행 가능한 seed data로 관리하는 방법을 정의한다. Claude는 TCO pack을 문서 설명으로만 두지 말고 실제 YAML 파일로 분리해야 한다.

---

## 2. Pack Directory

```txt
tco-packs/
  bazi_luck_pack.yaml
  vibe_state_pack.yaml
  business_growth_pack.yaml
  relationship_signal_pack.yaml
  recovery_health_pack.yaml
  safety_boundary_pack.yaml
  operator_rules.yaml
```

---

## 3. Pack Schema

Each pack should follow:

```yaml
pack_id: string
version: string
description: string
concepts:
  - id: string
    label: string
    type: state | risk | intent | evidence | action | style | behavior | domain
    aliases: string[]
    action_bias: string[]
    risk_bias: string[]
    boundary_notes: string[]
operators:
  - id: string
    name: string
    trigger: object
    output_policy: object
    priority: number
    enabled: boolean
```

---

## 4. bazi_luck_pack

Purpose:

```txt
사주/대운/세운의 오행 및 음양 신호를 행동 경향 bias로 변환한다.
```

Concept examples:

```yaml
- id: element.wood.expansion
  label: 목(木) 확장
  action_bias: [planning, growth, initiation]

- id: element.fire.expression
  label: 화(火) 표현
  action_bias: [publishing, pitching, visibility]

- id: element.earth.stabilization
  label: 토(土) 안정
  action_bias: [structuring, review, process]

- id: element.metal.boundary
  label: 금(金) 경계
  action_bias: [pricing, contract, scope, deletion]

- id: element.water.recovery
  label: 수(水) 회복
  action_bias: [rest, reflection, research, cooling]
```

---

## 5. vibe_state_pack

Purpose:

```txt
VibeCheckIn 값을 상태 개념으로 변환한다.
```

Core concepts:

```yaml
- vibe.high_arousal
- vibe.low_energy
- vibe.high_focus
- vibe.low_focus
- vibe.high_social_load
- vibe.low_valence
- vibe.recovery_needed
- vibe.execution_ready
```

---

## 6. business_growth_pack

Core concepts:

```yaml
- founder_proof
- build_proof
- market_proof
- productized_sales
- pricing_matrix
- scope_boundary
- revenue_policy
- proof_externalization
- partner_filter
- media_authority
- monthly_retainer
- funnel_agent
```

Rules:

```txt
If market proof is weak, prohibit revenue overclaim.
If pricing matrix is missing, activate scope boundary.
If launch energy is high but evidence is low, prioritize proof externalization before publishing.
```

---

## 7. relationship_signal_pack

Core concepts:

```yaml
- warmth_signal
- small_signal_first
- non_possessive_support
- creative_sovereignty
- boundary_with_warmth
- projectification_risk
- savior_frame_risk
- overwhelming_grand_narrative
```

Rules:

```txt
Large narrative must be reduced to small signal.
Competence must be paired with warmth.
Support must preserve the other person's autonomy.
No manipulation.
No pressure.
No savior frame.
```

---

## 8. recovery_health_pack

Core concepts:

```yaml
- sleep_protection
- screen_reduction
- silent_walk
- low_arousal_reset
- social_load_downshift
- decision_delay
```

Rules:

```txt
If burnout risk is high, Expansion is disallowed.
If emotional overreaction is high, late-night messaging is disallowed.
If energy low and arousal high, Recovery mode is prioritized.
```

---

## 9. safety_boundary_pack

Forbidden concepts:

```yaml
- deterministic_prediction
- fear_amplification
- relationship_manipulation
- medical_final_judgment
- legal_final_judgment
- investment_guarantee
- success_guarantee
- autonomy_removal
```

Boundary notes:

```txt
운세는 구조적 prior이며 결과를 확정하지 않습니다.
의료, 법률, 투자 판단은 전문가와 상의해야 합니다.
관계 조언은 상대의 자율성과 선택권을 존중해야 합니다.
```

---

## 10. Operator Rules

Operator rules are stored in `operator_rules.yaml`.

### Example: Fire Overheat Scope Lock

```yaml
- id: op.fire_overheat_scope_lock
  name: Fire Overheat Scope Lock
  trigger:
    active_concepts:
      - element.fire.expression
    risk_thresholds:
      scope_leak: 0.6
    vibe_conditions:
      arousal_min: 7
    domains:
      - business_finance
  output_policy:
    mode: Cleanup
    warmth_vs_competence: Competence
    required_actions:
      - 가격표 1p 작성
      - 미포함 범위 5줄 작성
      - 성과 비보장 문장 1개 삽입
    forbidden_actions:
      - 새 기능 착수
      - 밤 10시 이후 제안서 발송
      - 무제한 커스터마이징 약속
  priority: 90
  enabled: true
```

### Example: Low Energy Recovery Guard

```yaml
- id: op.low_energy_recovery_guard
  name: Low Energy Recovery Guard
  trigger:
    risk_thresholds:
      burnout: 0.6
    vibe_conditions:
      energy_max: 4
      arousal_min: 6
  output_policy:
    mode: Recovery
    warmth_vs_competence: Warmth
    required_actions:
      - 20분 무입력 산책
      - 큰 결정 24시간 보류
      - 오늘의 작업 1개만 남기기
    forbidden_actions:
      - 새 프로젝트 착수
      - 장문 메시지 발송
      - 가격 양보 결정
  priority: 100
  enabled: true
```

---

## 11. Loading Rules

```txt
1. Load all packs at app startup or first agent request.
2. Validate YAML against pack schema.
3. Disabled operators must not run.
4. Higher priority operators override lower priority operators.
5. Safety operators always override all domain operators.
```

---

## 12. Final Rule

```txt
TCO packs are not prompt decoration.
They are executable conceptual operating rules.
```

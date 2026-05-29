# 09B_VIBE_PRIVACY_AND_ETHICS.md
# Vibe Privacy and Ethics Specification

Version: 0.2

---

## 1. Purpose

This document defines ethical boundaries for Vibe Check-in, Vibe state interpretation, and Vibe-based action policies.

Vibe is a current-state input, not a diagnosis and not a fixed identity.

---

## 2. Core Principles

```text
1. Vibe is state, not destiny.
2. Vibe is continuous vector, not fixed personality label.
3. Vibe must not be used for sensitive attribute inference.
4. Vibe must not be used to exploit vulnerability.
5. Vibe interventions must preserve user autonomy.
6. Vibe outputs must remain evidence-first and uncertainty-aware.
```

---

## 3. Forbidden Inferences

The system must not infer or label:

```text
health diagnosis
mental health diagnosis
disability
religion
political affiliation
sexuality
income
criminality
relationship status certainty
age if not provided
identity traits as fixed destiny
```

---

## 4. Allowed Vibe Interpretation

Allowed:

```text
현재 입력 기준으로는 각성이 높고 에너지가 낮아 보입니다.
오늘은 확장보다 정리와 회복이 더 안전합니다.
이 상태에서는 밤 늦은 큰 결정을 보류하는 것이 좋습니다.
```

Not allowed:

```text
당신은 원래 불안한 사람입니다.
당신의 성격상 관계는 실패합니다.
오늘 이 결정을 하지 않으면 운이 완전히 막힙니다.
```

---

## 5. Autonomy Support Rules

Every high-impact output must include:

```text
- user choice preserved
- action framed as recommendation, not command
- uncertainty acknowledged
- at least one low-risk alternative
- no shame language
```

---

## 6. Vibe Data Handling

MVP data rules:

```text
- VibeCheckIn belongs to userId.
- RLS must protect all vibe records.
- Aggregated analytics require anonymization.
- No third-party sharing by default.
- No high-risk automated decisioning.
```

---

## 7. Dark Pattern Prevention

Forbidden:

```text
- fear-based retention
- “bad luck” upsell
- paid ritual pressure
- emotional dependency creation
- relationship anxiety monetization
- infinite re-query loop through uncertainty amplification
```

---

## 8. Relationship Advice Boundary

Relationship outputs must:

```text
- preserve the other person’s autonomy
- avoid manipulation
- avoid jealousy, pressure, guilt, surveillance
- prefer small, respectful signals
- avoid grand narrative overreach
```

---

## 9. Health / Recovery Boundary

The product may suggest low-risk routines:

```text
sleep protection
walk
screen reduction
decision delay
light planning
reflection
```

The product must not provide diagnosis, medication advice, treatment plan, or emergency triage beyond general help-seeking guidance.

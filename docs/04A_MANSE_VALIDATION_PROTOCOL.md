# 04A_MANSE_VALIDATION_PROTOCOL.md
# Manse Validation Protocol

Version: 0.2  
Status: Required for MVP Quality Gate

---

## 1. Purpose

만세력 계산은 제품 신뢰의 기반이다. 이 문서는 `/src/lib/manse` 구현이 MVP 품질 기준을 통과했는지 검증하는 테스트 프로토콜을 정의한다.

---

## 2. Validation Scope

검증 대상:

```txt
1. Ganzhi cycle generation
2. Year pillar with Lichun boundary
3. Month pillar with solar term boundary
4. Day pillar with verified JDN epoch
5. Hour branch and hour stem
6. Ten gods mapping
7. Five element distribution
8. Major luck direction
9. Major luck start age
10. Annual/monthly/daily luck range
11. Chart consistency checker
12. Warning policy
```

---

## 3. Reference Case Strategy

### 3.1 MVP Reference Set

MVP는 최소 30개 reference cases로 시작한다.

```txt
- 일반 케이스 10개
- 입춘 전후 5개
- 절기 경계 5개
- 자시/야자시 경계 5개
- timezone 경계 3개
- 사용자 제공 사주 불일치 2개
```

### 3.2 Production Reference Set

Production 전에는 100~300개 reference cases를 확보한다.

---

## 4. Reference Case Format

`tests/manse/reference-cases.sample.json`

```json
{
  "id": "CASE-0001",
  "birthDateTime": "1990-05-01T14:30:00+09:00",
  "timezone": "Asia/Seoul",
  "gender": "male",
  "policy": "standard_kr",
  "expected": {
    "yearPillar": "庚午",
    "monthPillar": "庚辰",
    "dayPillar": "丙子",
    "hourPillar": "乙未"
  },
  "source": "verified_reference",
  "notes": "sample placeholder; replace with verified case before release"
}
```

---

## 5. Accuracy Targets

### MVP target

```txt
연주 정확도: 99%+
월주 정확도: 98%+
일주 정확도: 99%+
시주 정확도: 98%+
대운 방향 정확도: 98%+
대운 시작 나이: policy-dependent warning allowed
```

### Production target

```txt
연주 정확도: 99.9%+
월주 정확도: 99.9%+
일주 정확도: 99.9%+
시주 정확도: 99.9%+
대운 방향 정확도: 99.9%+
대운 시작 나이: ±0.1년 within selected policy
```

---

## 6. Boundary Tests

Required tests:

```txt
- birth time exactly before Lichun
- birth time exactly after Lichun
- birth time on solar term day
- birth time around 23:00 Zi hour
- missing birth time
- unspecified gender
- timezone conversion from UTC to Asia/Seoul
- user-provided chart mismatch
```

---

## 7. Warning Tests

Expected warnings:

```txt
SOLAR_TERM_APPROXIMATED
TIMEZONE_UNCERTAIN
GENDER_UNSPECIFIED
TRUE_SOLAR_TIME_DISABLED
NIGHT_ZI_DISABLED
POLICY_VARIANT_MAY_DIFFER
CALCULATION_FAILED
```

Rules:

- If true solar time is disabled, the UI may show policy note, not error.
- If gender is unspecified, major luck direction must return warning.
- If calculation fails and provided chart exists, `canonicalSource` may be `user_provided`.

---

## 8. Release Gate

MVP cannot ship if:

```txt
- LLM is used to calculate chart values.
- `calculateChart()` lacks reference tests.
- `checkChartConsistency()` is not implemented.
- boundary warnings are not surfaced.
- chart output is not Zod-validated.
```

---

## 9. Regression Protocol

Whenever `/src/lib/manse` changes:

```txt
1. Run all unit tests.
2. Run all reference cases.
3. Compare snapshot outputs.
4. Log changed cases.
5. If changed case is expected, update notes.
6. If unexpected, block merge.
```

---

## 10. Final Validation Principle

```txt
A mystical product can have flexible interpretation.
It cannot have flexible arithmetic.
```

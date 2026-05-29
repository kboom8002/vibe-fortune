# 04_MANSE_ENGINE_SPEC.md
# Manse Engine Specification
## Deterministic Four Pillars and Luck Cycle Module

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

이 문서는 TCO-Vibe Fortune Coach의 deterministic 만세력 계산 모듈을 정의한다.

이 모듈은 다음을 계산한다.

```txt
1. 연주
2. 월주
3. 일주
4. 시주
5. 일간/오행/음양
6. 십성
7. 지장간
8. 오행 분포
9. 대운 방향
10. 대운 시작 나이
11. 대운 목록
12. 세운/월운/일운
```

---

## 2. Prime Rule

```txt
LLM must never calculate chart values directly.
```

### Forbidden

```txt
- OpenAI/Claude에게 사주팔자 계산 요청
- LLM에게 대운 시작 나이 추론 요청
- LLM에게 절기 전후 계산 요청
- LLM에게 일주 산출 요청
```

### Allowed

```txt
- LLM이 deterministic module 결과를 해석
- LLM이 계산 정책 차이를 설명
- LLM이 계산 결과를 Vibe/TCO/Action Policy로 번역
```

---

## 3. Module Location

```txt
src/lib/manse/
  index.ts
  constants.ts
  ganzhi.ts
  solar-terms.ts
  pillars.ts
  major-luck.ts
  daily-luck.ts
  monthly-luck.ts
  annual-luck.ts
  policies.ts
  validators.ts
  types.ts
```

---

## 4. Public API

### 4.1 calculateChart

```ts
export function calculateChart(input: CalculateChartInput): ChartResult

export type CalculateChartInput = {
  birthDateTime: string;
  timezone: string;
  gender?: "male" | "female" | "other" | "unspecified";
  birthLocation?: string;
  policy?: MansePolicy;
};
```

### 4.2 calculateMajorLuck

```ts
export function calculateMajorLuck(input: CalculateMajorLuckInput): MajorLuckResult

export type CalculateMajorLuckInput = {
  chart: ChartResult;
  gender: "male" | "female" | "other" | "unspecified";
  policy?: MansePolicy;
};
```

### 4.3 calculateAnnualLuck

```ts
export function calculateAnnualLuck(input: CalculateAnnualLuckInput): AnnualLuckResult

export type CalculateAnnualLuckInput = {
  year: number;
};
```

### 4.4 calculateDailyLuckRange

```ts
export function calculateDailyLuckRange(input: CalculateDailyLuckRangeInput): DailyLuckRangeResult

export type CalculateDailyLuckRangeInput = {
  from: string;
  to: string;
  timezone: string;
};
```

### 4.5 checkChartConsistency

```ts
export function checkChartConsistency(
  calculated: ChartResult,
  provided?: ProvidedChart
): ChartConsistency
```

---

## 5. Constants

```ts
export const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
```

```ts
export const STEM_ELEMENTS = {
  "甲": "wood",
  "乙": "wood",
  "丙": "fire",
  "丁": "fire",
  "戊": "earth",
  "己": "earth",
  "庚": "metal",
  "辛": "metal",
  "壬": "water",
  "癸": "water"
} as const;
```

---

## 6. Calculation Responsibilities

### 6.1 Year Pillar

MVP 기본 정책은 입춘 기준이다.

Required steps:

```txt
1. Normalize birth datetime to target timezone.
2. Determine whether datetime is before/after Lichun.
3. Use adjusted year.
4. Calculate Ganzhi year pillar from verified epoch.
5. Return warning if solar term table is approximate.
```

### 6.2 Month Pillar

월주는 음력 월이 아니라 절기 기준이다.

```txt
1. Determine solar term segment.
2. Map segment to earthly branch month.
3. Calculate heavenly stem month from year stem.
```

### 6.3 Day Pillar

일주는 JDN 또는 검증된 epoch 기반이다.

```txt
1. Convert local datetime to date boundary policy.
2. Calculate JDN.
3. Calculate day index modulo 60.
4. Return pillar.
```

### 6.4 Hour Pillar

```txt
1. Determine hour branch by local time.
2. Determine hour stem from day stem.
3. Apply nightZiPolicy only if enabled.
```

MVP:

```txt
standard_2h, nightZi disabled
```

### 6.5 Five Element Distribution

MVP baseline:

```txt
visible stems: 1.0
branch main element: 1.0
hidden stems: 0.3 each
```

This is a relative interpretation aid, not an absolute scientific measurement.

---

## 7. Major Luck Calculation

### 7.1 Direction Rule

MVP:

```txt
gender_yinyang_year_stem
```

General rule placeholder:

```txt
양년 남자 / 음년 여자 = 순행
음년 남자 / 양년 여자 = 역행
```

If gender is `other` or `unspecified`, return warning.

### 7.2 Start Age Rule

MVP:

```txt
days_to_jieqi_divide_by_3
```

Required:

```txt
1. Determine next/previous solar term based on direction.
2. Calculate time difference from birth datetime.
3. Convert days to years by divide-by-3 rule.
4. Return startAge.
5. Attach policy-dependent warning.
```

---

## 8. Error Handling

All functions must return structured warnings. Never silently fail.

```ts
export type ManseWarning =
  | "SOLAR_TERM_APPROXIMATED"
  | "TIMEZONE_UNCERTAIN"
  | "GENDER_UNSPECIFIED"
  | "TRUE_SOLAR_TIME_DISABLED"
  | "NIGHT_ZI_DISABLED"
  | "POLICY_VARIANT_MAY_DIFFER"
  | "CALCULATION_FAILED";
```

---

## 9. Integration with LangGraph

LangGraph `ManseCalculatorNode` calls only these functions:

```txt
calculateChart()
calculateMajorLuck()
calculateAnnualLuck()
calculateDailyLuckRange()
checkChartConsistency()
```

OpenAI/Claude receives only structured JSON results.

---

## 10. User-Facing Calculation Disclaimer

When needed:

```txt
사주 계산은 standard_kr 정책 기준입니다.
절기 기준 월주, 입춘 기준 연주, 야자시 비적용, 진태양시 비적용으로 계산했습니다.
정책 설정에 따라 일부 결과는 달라질 수 있습니다.
```

If user-provided chart is canonical:

```txt
사주 계산은 사용자 제공값을 정본 기준으로 사용합니다.
```

---

## 11. Final Rule

```txt
Manse Engine calculates.
LLM interprets.
LangGraph orchestrates.
TCO converts interpretation into action policy.
```

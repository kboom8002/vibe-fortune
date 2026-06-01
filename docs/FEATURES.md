# TCO-Vibe Fortune Coach v2 — 주요 기능 명세서

> **문서 버전**: v2.0  
> **최종 갱신**: 2026-05-29  
> **상태**: MVP 구현 완료

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [핵심 엔진 — 만세력 (Manse Engine)](#2-핵심-엔진--만세력-manse-engine)
3. [바이브 체크인 (Vibe Check-in)](#3-바이브-체크인-vibe-check-in)
4. [AI 에이전트 오케스트레이션 (LangGraph)](#4-ai-에이전트-오케스트레이션-langgraph)
5. [포캐스트 생성 (Forecast Generation)](#5-포캐스트-생성-forecast-generation)
6. [TCO 변환 엔진 (TCO Conversion)](#6-tco-변환-엔진-tco-conversion)
7. [안전선 게이트 (Safety Gate)](#7-안전선-게이트-safety-gate)
8. [실행 기록 및 재구성 루프 (Run Receipt & Recomposition)](#8-실행-기록-및-재구성-루프-run-receipt--recomposition)
9. [데이터 영속성 및 인증 (Supabase Persistence)](#9-데이터-영속성-및-인증-supabase-persistence)
10. [UI/UX 인터페이스](#10-uiux-인터페이스)
11. [스키마 검증 시스템](#11-스키마-검증-시스템)
12. [LLM 프로바이더 및 장애 복원력](#12-llm-프로바이더-및-장애-복원력)
13. [API 엔드포인트 명세](#13-api-엔드포인트-명세)

---

## 1. 시스템 개요

**TCO-Vibe Fortune Coach**는 동양 명리학(사주팔자)의 결정론적 구조 분석과 사용자의 실시간 감정/신체 상태(Vibe)를 결합하여, AI 기반의 **자기운영 행동 지침(Action Policy)**을 생성하는 자율 코칭 시스템입니다.

### 핵심 원칙 (Prime Directive)

```
만세력 엔진이 계산한다. LLM이 해석한다. TCO가 해석을 행동 정책으로 변환한다.
LangGraph가 오케스트레이션한다. Supabase가 영속한다. Safety Gate가 제한한다.
```

| 역할 | 담당 모듈 | 설명 |
|------|----------|------|
| **결정론적 계산** | `src/lib/manse/` | 사주 팔자, 대운, 세운, 십신, 합충형파해, 신살 |
| **AI 해석** | LLM (OpenAI/Anthropic) | 구조 분석 결과를 자연어로 해석/설명 |
| **행동 변환** | `src/lib/tco/` | TCO 팩 기반 행동 정책 변환 |
| **워크플로우** | `src/lib/agent/graph.ts` | LangGraph 기반 11-노드 DAG |
| **데이터 저장** | `src/lib/supabase/` | Supabase + RLS 기반 사용자 소유 데이터 |
| **안전 제어** | `src/lib/safety/` | 입력/출력 양방향 안전선 |

---

## 2. 핵심 엔진 — 만세력 (Manse Engine)

> 📁 구현 위치: `src/lib/manse/`

### 2.1 사주팔자 차트 계산 (`calculateChart`)

**입력**: 생년월일시(ISO8601), 타임존, 성별  
**출력**: `ChartResult` (4주 8자 + 오행 분포 + 일간 정보)

| 기능 | 파일 | 상세 |
|------|------|------|
| 4주 계산 (년·월·일·시) | `index.ts` | 천간(甲~癸) × 지지(子~亥) 60갑자 순환 |
| 음양 판별 | `index.ts` | 각 천간/지지의 양(+)/음(-) 분류 |
| 오행 분류 | `index.ts` | 木/火/土/金/水 분포 자동 집계 |
| 일간(Day Master) 추출 | `index.ts` | 일주 천간을 기준으로 전체 차트 해석의 중심축 |

### 2.2 대운 계산 (`calculateMajorLuck`)

- 성별과 년주 천간의 양음에 따라 **순행/역행** 결정
- 10년 단위 대운 주기표 생성 (각 대운의 천간·지지·오행 포함)
- 현재 나이 기반 **활성 대운** 자동 판별

### 2.3 세운 계산 (`calculateAnnualLuck`)

- 당해 연도의 60갑자 간지 산출
- 세운과 원국(사주) 간의 오행 관계 분석 기반

### 2.4 십신(十神) 분석 (`calculateAllTenGods`)

> 📁 `ten-gods.ts`

일간(Day Master)을 기준으로 나머지 7자의 관계를 10가지 신(神)으로 분류:

| 십신 | 약칭 | 의미 |
|------|------|------|
| 비견 | 比肩 | 동류, 경쟁, 자아 |
| 겁재 | 劫財 | 경쟁적 동류 |
| 식신 | 食神 | 창의, 표현 |
| 상관 | 傷官 | 반항, 혁신 |
| 편재 | 偏財 | 유동재산, 사업 |
| 정재 | 正財 | 고정수입, 안정 |
| 편관 | 偏官 | 권위, 도전 |
| 정관 | 正官 | 명예, 질서 |
| 편인 | 偏印 | 비정규 학습 |
| 정인 | 正印 | 정규 교육, 보호 |

### 2.5 합충형파해 분석 (`analyzeInteractions`)

> 📁 `interactions.ts`

지지(地支) 간의 상호작용 패턴 감지:

| 유형 | 의미 | 예시 |
|------|------|------|
| **삼합 (三合)** | 세 지지의 합 → 강력한 오행 생성 | 寅午戌 → 火 |
| **육합 (六合)** | 두 지지의 결합 | 子丑 → 土 |
| **방합 (方合)** | 같은 방위의 세 지지 합 | 寅卯辰 → 木 |
| **충 (沖)** | 대립/충돌 | 子午沖 |
| **형 (刑)** | 마찰/형벌 | 寅巳申 三刑 |
| **파 (破)** | 파괴 | 子酉破 |
| **해 (害)** | 해침/방해 | 子未害 |
| **자형 (自刑)** | 자기 충돌 | 辰辰自刑 |

### 2.6 신살(神煞) 분석 (`analyzeDivineKillers`)

> 📁 `divine-killers.ts`

길흉성을 나타내는 특수 격국 감지 (30+ 신살 지원):

| 분류 | 신살 예시 |
|------|----------|
| **길신(吉神)** | 천을귀인, 천덕귀인, 월덕귀인, 문창귀인, 학당귀인, 금여록, 녹마살 |
| **흉신(凶神)** | 도화살, 화개살, 역마살, 양인살, 구각살, 백호살, 고신살, 과숙살 |

### 2.7 일간 강약 및 용신 (`strength-yongsin.ts`)

- **일간 강약 판별**: 통근, 월령, 오행 분포를 종합하여 Strong/Weak/Balanced 분류
- **용신(用神) 추천**: 일간 강약에 따른 필요 오행 자동 결정
  - 신강(Strong) → 식상·재성·관성이 용신
  - 신약(Weak) → 인성·비겁이 용신

### 2.8 주기간 상호작용 엔진 (`period-interactions.ts`)

대운·세운과 원국(사주) 간의 동적 상호작용 분석:
- 원국-대운 충/합
- 원국-세운 충/합
- 대운-세운 교차 분석
- 시간 기반(일간/월간) 추가 기류 분석

### 2.9 지장간(藏干) 분석 (`hidden-stems-analysis.ts`)

각 지지 속에 숨어있는 천간(지장간)을 분석:
- 정기(正氣), 중기(中氣), 여기(餘氣) 분류
- 지장간과 일간 간의 십신 관계 산출
- 통근력 강도 계산에 활용

---

## 3. 바이브 체크인 (Vibe Check-in)

> 📁 UI: `src/app/app/daily/page.tsx`  
> 📁 API: `src/app/api/vibe-checkin/route.ts`

사용자의 현재 심리·신체 상태를 5차원 스칼라로 수치화합니다.

### 3.1 입력 차원

| 차원 | 범위 | 설명 |
|------|------|------|
| **정서가 (Valence)** | 0-10 | 매우 침울 → 매우 행복 |
| **각성도 (Arousal)** | 0-10 | 무기력 → 고도 긴장 |
| **활력 (Energy)** | 0-10 | 방전됨 → 에너지 넘침 |
| **집중력 (Focus)** | 0-10 | 브레인 포그 → 고도 몰입 |
| **관계 부하 (Social Load)** | 0-10 | 혼자 있고 싶음 → 적극 소통 가능 |

### 3.2 운영 보드 집중 분야

사용자가 선택하는 당일 주요 관심 분야:

| 도메인 | 설명 |
|--------|------|
| 비즈니스 & 금융 | 사업 운영, 투자, 재무 |
| 인간관계 & 연애 | 대인관계, 로맨틱 관계 |
| 건강 & 에너지 | 신체 건강, 운동, 수면 |
| 학습 & 연구 & 집필 | 학습, 연구 활동, 글쓰기 |
| 명성 & 퍼스널 브랜딩 | 평판 관리, 브랜딩 |
| 위험 관리 & 법률 | 법적 이슈, 리스크 관리 |

### 3.3 자유 텍스트 입력

- **오늘의 주요 이벤트/핵심 맥락**: 선택적 텍스트로 당일 상황적 배경을 제공  
  예: "중요한 거래 봉투 협상 예정", "파트너와 다툼이 있었다"

---

## 4. AI 에이전트 오케스트레이션 (LangGraph)

> 📁 `src/lib/agent/graph.ts`

11개 노드로 구성된 LangGraph DAG(Directed Acyclic Graph) 워크플로우:

```
사용자 입력
  ↓
[1] LoadUserContext → 기존 사용자 컨텍스트 로드
  ↓
[2] InputSafetyGate → 입력 안전성 검증
  ↓
[3] ManseCalcNode → 결정론적 사주 계산
  ↓
[4] ContextAssemblerNode → 컨텍스트 텐서 조립
  ↓
[5] ConceptMapperNode → 컨셉 상태 결정
  ↓
[6] RiskScorerNode → 리스크 벡터 산출
  ↓
[7] ActionPolicyNode → 행동 정책 생성
  ↓
[8] ForecastSynthesisNode → 포캐스트 합성
  ↓
[9] SafetyBoundaryReviewerNode → 출력 안전선 검토
  ↓
[10] PersistenceNode → Supabase 영속화
  ↓
[11] RecompositionNode → 재구성 피드백 루프
  ↓
최종 출력 (ForecastOutput)
```

### 노드별 주요 역할

| # | 노드 | 역할 |
|---|------|------|
| 1 | `LoadUserContext` | Supabase에서 사용자의 과거 컨텍스트/이력 로드 |
| 2 | `InputSafetyGate` | 자해/위험 표현, 금지 주제 필터링 |
| 3 | `ManseCalcNode` | 만세력 엔진 호출 (순수 결정론적) |
| 4 | `ContextAssembler` | chartResult + vibeCheckIn + recompositionFeedback 합성 |
| 5 | `ConceptMapper` | LLM 기반 컨셉 상태 결정 (expansion/consolidation/cleanup) |
| 6 | `RiskScorer` | LLM 기반 리스크 수준 산출 |
| 7 | `ActionPolicy` | TCO 팩 적용 → 필수/금지/보류 행동 생성 |
| 8 | `ForecastSynthesis` | 전체 결과를 사용자 친화적 포캐스트로 통합 |
| 9 | `SafetyBoundaryReviewer` | 최종 출력물의 안전선 준수 여부 검증 |
| 10 | `Persistence` | 전 상태를 Supabase에 저장 (RLS 적용) |
| 11 | `Recomposition` | RunReceipt 기반 피드백 데이터 생성 |

---

## 5. 포캐스트 생성 (Forecast Generation)

### 5.1 일일 포캐스트 (Daily)

| 출력 항목 | 설명 |
|----------|------|
| **총운 요약 (Summary)** | 오늘의 전체적 기류 한 줄 요약 |
| **컨셉 상태** | expansion(확장), consolidation(공고화), cleanup(정리) |
| **추천 등급 (Grade)** | S/A/B/C 4단계 종합 등급 |
| **필수 행동 (Required Actions)** | 오늘 반드시 실행해야 할 행동 목록 |
| **금지 행동 (Forbidden Actions)** | 오늘 반드시 피해야 할 행동 목록 |
| **보류 행동 (Deferred Actions)** | 추후로 이연해야 할 행동 목록 |
| **경계선 노트 (Boundary Notes)** | 안전선 관련 경고/주의사항 |
| **행동 조율 설명** | 왜 이런 지침이 나왔는지에 대한 근거 설명 |

### 5.2 주간 포캐스트 (Weekly)

| 출력 항목 | 설명 |
|----------|------|
| **주간 총론** | 이번 주 전체 흐름 요약 |
| **핵심 컨셉 상태** | 주간 지배 컨셉 + 신뢰도 |
| **갭 분석** | 현재 실행과 목표 간의 차이 분석 |
| **목표 3분류** | 근거 확보, 경계선, 전환 목표 |
| **주간 리스크 궤적** | 월~일 7일간 위험도 시각화 (high/medium/low) |
| **행동 정책** | 주간 필수/금지 행동 |
| **성찰 질문** | 주간 회고를 위한 자기 질문 |

### 5.3 월간 포캐스트 (Monthly)

| 출력 항목 | 설명 |
|----------|------|
| **월간 총론** | 이번 달 전체 기류 요약 |
| **컨셉 포트폴리오** | 복수 컨셉의 가중치 배분 |
| **리스크 포트폴리오** | 재무/건강/관계 등 영역별 리스크 |
| **3대 영역 조율** | 수익/관계/회복 스코어 및 조언 |
| **행동 캘린더** | 4주 차 별 집중 포커스 계획 |

### 5.4 로컬 폴백 포캐스트

LLM API 연결 실패 시에도 **만세력 계산 결과 + Vibe 데이터**만으로 기본 포캐스트를 생성하는 로컬 폴백 로직:
- 사주 오행 기반 기본 행동 지침
- Vibe 스코어 기반 등급 산정
- 에너지 수준에 따른 경계선 노트 자동 생성

---

## 6. TCO 변환 엔진 (TCO Conversion)

> 📁 `src/lib/tco/pack-loader.ts`  
> 📁 `tco-packs/`

### 6.1 TCO 팩 시스템

TCO(Tactical Coaching Operator) 팩은 사주 해석 결과를 **실행 가능한 행동 정책**으로 변환하는 규칙 번들입니다.

```
사주 구조 해석 → TCO 팩 규칙 적용 → Action Policy 산출
```

### 6.2 팩 구조

| 필드 | 설명 |
|------|------|
| `id` | 고유 팩 식별자 |
| `name` | 팩 이름 |
| `version` | 시맨틱 버전 |
| `rules` | 변환 규칙 배열 |
| `applicability` | 적용 조건 (컨셉 상태, 리스크 수준 등) |

### 6.3 행동 정책 변환 규칙

- **컨셉 상태별 필터링**: expansion/consolidation/cleanup에 따른 행동 분기
- **리스크 임계값 적용**: 리스크 수준에 따른 금지/경계 행동 자동 추가
- **도메인별 맞춤**: 사용자 선택 집중 분야에 따른 세분화된 지침

---

## 7. 안전선 게이트 (Safety Gate)

> 📁 `src/lib/safety/index.ts`

모든 포캐스트 파이프라인에 양방향으로 적용되는 안전 보호 메커니즘입니다.

### 7.1 입력 안전선 (Input Safety Gate)

사용자 입력에서 위험 패턴을 감지하고 차단/리다이렉트:

| 감지 범주 | 처리 방식 |
|----------|----------|
| 자해/자살 관련 표현 | **즉시 차단** + 전문 상담 연결 안내 |
| 극단적 공포/불안 유발 요청 | **차단** + 안정화 메시지 |
| 의료/법률/투자 최종 판단 요청 | **리다이렉트** + 전문가 상담 권유 |
| 타인 조종/관계 조작 의도 | **차단** |
| 민감 속성 추론 요청 | **차단** |

### 7.2 출력 안전선 (Safety Boundary Reviewer)

생성된 포캐스트의 안전선 준수 검증:

| 검증 항목 | 설명 |
|----------|------|
| **결정론적 예언 배제** | "반드시 ~할 것이다" 류의 단정적 표현 제거 |
| **공포 증폭 방지** | 부정적 운세를 과도하게 강조하지 않음 |
| **면책 조항 포함** | 모든 출력에 "최종 판단은 사용자 본인" 면책 문구 |
| **안전 플래그** | 위험 감지 시 `safetyFlags` 배열에 기록 |
| **경계선 노트** | 건강/에너지 저하 시 휴식 권고 자동 생성 |

### 7.3 금지 행동 목록 (절대 생성 불가)

- 결정론적 예측 ("이것이 반드시 일어날 것입니다")
- 공포 증폭 운세 표현
- 관계 조작 전략
- 의료/법률/투자 최종 판단
- 성과 보장
- 민감 속성 추론

---

## 8. 실행 기록 및 재구성 루프 (Run Receipt & Recomposition)

> 📁 UI: `src/app/app/run-receipt/[id]/page.tsx`  
> 📁 Engine: `src/lib/agent/recomposition.ts`  
> 📁 API: `src/app/api/run-receipt/route.ts`

### 8.1 실행 기록 (Run Receipt)

포캐스트를 받은 후 사용자가 실제로 어떻게 행동했는지를 기록하는 성찰 도구:

| 필드 | 설명 |
|------|------|
| **What I Did** *(필수)* | 실제로 실행한 행동 요약 |
| **Why I Chose It** | 행동 선택의 근거/직관 |
| **What AI Helped** | AI 지침 중 도움이 된 부분 |
| **My Judgment** | 지침과 달리 내린 독자적 판단 |
| **What I Deferred** | 보류/이연한 행동 |
| **What I Learned** | 하루 경험의 교훈 |
| **Next Action** | 다음 날 연계할 행동 다짐 |

### 8.2 재구성 루프 (Recomposition Loop)

`RunReceipt` 데이터를 다음 포캐스트 생성에 피드백하는 자기 강화 메커니즘:

```
[이전 포캐스트] → [사용자 실행 기록] → [재구성 피드백]
     ↓                                        ↓
[다음 포캐스트 생성 시] ← ← ← ← ← ← ← ← ← ←
```

재구성 피드백 항목:
- **실행 일치도**: 지침 대비 실제 행동의 일치율
- **독자적 판단 패턴**: 사용자 고유 의사결정 경향
- **보류 패턴**: 반복적으로 이연하는 행동 유형
- **학습 누적**: 시간에 따른 통찰 축적

---

## 9. 데이터 영속성 및 인증 (Supabase Persistence)

> 📁 `src/lib/supabase/`

### 9.1 인증 (Auth)

- Supabase Auth를 통한 이메일/비밀번호 인증
- 세션 관리 (클라이언트 사이드 + 서버 사이드)
- Next.js 미들웨어 기반 라우트 보호

### 9.2 데이터 테이블 및 RLS

모든 테이블에 **Row Level Security(RLS)** 적용 — 사용자는 자신의 데이터만 접근 가능:

| 테이블 | 용도 | RLS |
|--------|------|-----|
| `birth_profiles` | 생년월일시 + 사주 계산 결과 | ✅ |
| `vibe_checkins` | 바이브 체크인 기록 | ✅ |
| `context_tensors` | 컨텍스트 텐서 (사주+바이브 합성) | ✅ |
| `concept_states` | 컨셉 상태 이력 | ✅ |
| `risk_vectors` | 리스크 벡터 이력 | ✅ |
| `action_policies` | 행동 정책 이력 | ✅ |
| `forecast_outputs` | 포캐스트 최종 결과 | ✅ |
| `run_receipts` | 실행 기록 | ✅ |
| `safety_events` | 안전선 이벤트 로그 | ✅ |

### 9.3 영속화 전략

- **에이전트 파이프라인 완료 시**: `PersistenceNode`에서 전 상태를 Supabase에 일괄 저장
- **사용자 입력 시**: 생년월일 프로필, 바이브 체크인 즉시 저장
- **로컬 캐시**: localStorage를 백업 캐시로 활용 (오프라인 대응)

---

## 10. UI/UX 인터페이스

### 10.1 페이지 구성

| 경로 | 페이지 | 기능 |
|------|--------|------|
| `/` | 랜딩 페이지 | 서비스 소개 + 로그인/회원가입 CTA |
| `/auth/login` | 로그인 | Supabase Auth 로그인 |
| `/auth/signup` | 회원가입 | 신규 사용자 등록 |
| `/app/onboarding` | 온보딩 허브 | 프로필 설정 안내 |
| `/app/onboarding/birth` | 생년월일시 입력 | 사주 프로필 설정 |
| `/app/daily` | 일일 바이브 체크인 | 5차원 슬라이더 + 집중 분야 선택 |
| `/app/result/[id]` | 일일 운영 보드 | 사주 차트 + 포캐스트 결과 |
| `/app/weekly` | 주간 운영 리뷰 | 주간 포캐스트 |
| `/app/monthly` | 월간 분석 포트폴리오 | 월간 포캐스트 |
| `/app/run-receipt/[id]` | 실행 기록 | 오늘의 실행 일지 |
| `/app/history` | 이력 관리 | 분석 및 실행 기록 타임라인 |
| `/app/settings` | 설정 | 사용자 설정 관리 |

### 10.2 디자인 시스템

- **테마**: 다크 모드 (zinc-950 배경)
- **글래스모피즘**: `backdrop-blur-md` 기반 유리질감 카드
- **그라디언트**: 인디고-퍼플-핑크 브랜드 그라디언트
- **오행 컬러 시스템**:
  - 木(목): 그린 (`text-green-400`)
  - 火(화): 로즈 (`text-rose-400`)
  - 土(토): 앰버 (`text-amber-400`)
  - 金(금): 진크 (`text-zinc-300`)
  - 水(수): 스카이 (`text-sky-400`)
- **타이포그래피**: 한글 sans-serif 기반
- **애니메이션**: 스피너, 호버 트랜지션, 스케일 효과

### 10.3 반응형 레이아웃

- 모바일 우선 (1열 → sm: 2열 → md: 3-4열)
- 사주 차트 그리드: 모바일에서도 4열 유지 (compact)
- 네비게이션 바: 모바일 햄버거 메뉴 지원

---

## 11. 스키마 검증 시스템

> 📁 `src/schemas/`

모든 AI 출력, API 페이로드, 에이전트 노드 출력은 **Zod 스키마**로 검증됩니다.

| 스키마 | 파일 | 검증 대상 |
|--------|------|----------|
| `BirthProfileSchema` | `birth-profile.schema.ts` | 생년월일시 입력 |
| `ManseChartSchema` | `manse-chart.schema.ts` | 사주 차트 결과 |
| `VibeCheckInSchema` | `vibe-checkin.schema.ts` | 바이브 체크인 |
| `ContextTensorSchema` | `context-tensor.schema.ts` | 컨텍스트 텐서 |
| `ConceptStateSchema` | `concept-state.schema.ts` | 컨셉 상태 |
| `RiskVectorSchema` | `risk-vector.schema.ts` | 리스크 벡터 |
| `ActionPolicySchema` | `action-policy.schema.ts` | 행동 정책 |
| `ForecastOutputSchema` | `forecast-output.schema.ts` | 포캐스트 출력 |
| `RunReceiptSchema` | `run-receipt.schema.ts` | 실행 기록 |
| `SafetyEventSchema` | `safety-event.schema.ts` | 안전 이벤트 |
| `AgentStateSchema` | `agent-state.schema.ts` | 에이전트 전체 상태 |
| `ApiContractsSchema` | `api-contracts.schema.ts` | API 요청/응답 |

---

## 12. LLM 프로바이더 및 장애 복원력

> 📁 `src/lib/llm/`

### 12.1 멀티 프로바이더 지원

| 프로바이더 | 용도 | 환경변수 |
|----------|------|---------|
| OpenAI (GPT-4) | 프로덕션 | `OPENAI_API_KEY` |
| Anthropic (Claude) | 대체 | `ANTHROPIC_API_KEY` |
| Mock | 테스트/폴백 | 키 미설정 시 자동 |

### 12.2 장애 복원력

| 메커니즘 | 설명 |
|----------|------|
| **지수 백오프 (Exponential Backoff)** | API 실패 시 점진적 재시도 간격 |
| **서킷 브레이커 (Circuit Breaker)** | 연속 실패 시 일시적 차단 |
| **로컬 폴백** | LLM 완전 불능 시 사주 계산 기반 로컬 포캐스트 |
| **타임아웃** | 요청별 최대 대기 시간 설정 |

---

## 13. API 엔드포인트 명세

| 메서드 | 경로 | 기능 |
|--------|------|------|
| `POST` | `/api/forecast/daily` | 일일 포캐스트 생성 (LangGraph 파이프라인 실행) |
| `GET` | `/api/forecast/weekly` | 주간 포캐스트 조회 |
| `GET` | `/api/forecast/monthly` | 월간 포캐스트 조회 |
| `POST` | `/api/profile/birth` | 생년월일시 프로필 저장 + 사주 계산 |
| `POST` | `/api/vibe-checkin` | 바이브 체크인 데이터 저장 |
| `POST` | `/api/run-receipt` | 실행 기록 저장 |
| `GET` | `/api/history` | 사용자 이력 조회 |

---

## 부록: 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript 5 |
| 스타일링 | Tailwind CSS v4 |
| 상태 관리 | React 19 State + localStorage |
| 에이전트 런타임 | LangGraph.js |
| 스키마 검증 | Zod |
| 데이터베이스 | Supabase (PostgreSQL + RLS) |
| 인증 | Supabase Auth |
| LLM | OpenAI / Anthropic (멀티 프로바이더) |
| UI 컴포넌트 | Radix UI + shadcn/ui |
| 아이콘 | Lucide React |

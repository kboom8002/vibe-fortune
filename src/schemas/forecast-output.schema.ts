import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

// ─── 기존 스키마 (DB 영속성용, 하위 호환 유지) ──────────────────────────────
export const ForecastOutputSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastRequestId: IdSchema,
  mode: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  outputJson: z.unknown(),
  outputMarkdown: z.string().min(1),
  grade: z.string().optional(),
  contextTensorId: IdSchema.optional(),
  conceptStateId: IdSchema.optional(),
  riskVectorId: IdSchema.optional(),
  actionPolicyId: IdSchema.optional(),
  safetyFlags: z.array(z.string()),
  createdAt: IsoDateTimeSchema,
});

export const WeeklyForecastOutputSchema = z.object({
  id: IdSchema,
  userId: IdSchema.optional(),
  mode: z.literal("weekly"),
  weekRange: z.object({
    from: z.string(),
    to: z.string(),
  }),
  oneLineConclusion: z.string().min(1),
  weeklyCoreConcept: z.string().min(1),
  weeklyPrimaryGap: z.string().min(1),
  weeklyEvidenceTarget: z.string().min(1),
  weeklyBoundaryTarget: z.string().min(1),
  weeklyConversionTarget: z.string().min(1),
  recompositionGoal: z.string().min(1),
  actionPolicy: z.object({
    requiredActions: z.array(z.string()),
    forbiddenActions: z.array(z.string()),
    reviewQuestions: z.array(z.string()),
  }),
  safetyFlags: z.array(z.string()),
  createdAt: IsoDateTimeSchema,
});

export const MonthlyForecastOutputSchema = z.object({
  id: IdSchema,
  userId: IdSchema.optional(),
  mode: z.literal("monthly"),
  month: z.string(),
  oneLineConclusion: z.string().min(1),
  monthlyConceptPortfolio: z.array(z.string()),
  monthlyRiskPortfolio: z.array(z.string()),
  evidenceTarget: z.array(z.string()),
  boundaryPolicy: z.array(z.string()),
  revenuePolicy: z.array(z.string()),
  relationshipPolicy: z.array(z.string()),
  recoveryPolicy: z.array(z.string()),
  monthlyActionCalendar: z.array(z.object({
    week: z.string(),
    policyMode: z.enum(["Consolidation", "Expansion", "Cleanup"]),
    recommendedFocus: z.string(),
    forbiddenFocus: z.string(),
  })),
  safetyFlags: z.array(z.string()),
  createdAt: IsoDateTimeSchema,
});

// ─── 신규 풍부한 일일 예보 스키마 ────────────────────────────────────────────

export const SensoryPrescriptionSchema = z.object({
  color: z.string(),
  light: z.string(),
  space: z.string(),
  rhythm: z.string(),
  ritual: z.string(),
  scent: z.string().optional(),
  food: z.string().optional(),
});

export const VibePrescriptionItemSchema = z.object({
  element: z.enum(["wood", "fire", "earth", "metal", "water"]),
  label: z.string(),
  rationale: z.string().min(50),
  actions: z.array(z.string()).min(1),
  sensory: SensoryPrescriptionSchema,
});

export const VibePrescriptionSchema = z.object({
  homomorphic: VibePrescriptionItemSchema,
  complementary: VibePrescriptionItemSchema,
});

export const DomainForecastSchema = z.object({
  domain: z.enum([
    "business_finance",
    "relationship_love",
    "health_recovery",
    "learning_writing_research",
    "reputation_branding",
    "risk_legal_safety",
  ]),
  headline: z.string().min(10),
  narrative: z.string().min(200), // aim for 300+ in practice
  elementInfluence: z.enum(["wood", "fire", "earth", "metal", "water"]),
  activatedConcepts: z.array(z.string()).default([]),
  riskLevel: z.enum(["low", "medium", "high"]),
  policyMode: z.enum(["Expansion", "Consolidation", "Cleanup", "Recovery"]),
  requiredActions: z.array(z.string()).default([]),
  forbiddenActions: z.array(z.string()).default([]),
});

export const GapAnalysisSchema = z.object({
  conceptGaps: z.array(z.string()).default([]),
  evidenceGaps: z.array(z.string()).default([]),
  boundaryGaps: z.array(z.string()).default([]),
  conversionGaps: z.array(z.string()).default([]),
});

/**
 * DailyForecastOutputSchema
 * 풍부한 일일 예보: 6개 도메인 예보 + 바이브 처방 + 갭 분석 + 감각 처방 포함.
 * DB 저장은 ForecastOutputSchema.outputJson 에 직렬화하여 하위 호환 유지.
 */
export const DailyForecastOutputSchema = z.object({
  // 기본 식별 필드
  forecastDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  oneLineConclusion: z.string().min(10),

  // 6개 도메인 예보 (ForecastFocus 기반)
  domainForecasts: z.array(DomainForecastSchema).min(1),

  // 오행 기반 바이브 처방 (동질·보완 원소 쌍)
  vibePrescription: VibePrescriptionSchema,

  // 전체 감각 처방 (오늘의 환경 설정)
  sensoryPrescription: SensoryPrescriptionSchema,

  // TCO 갭 분석 (개념·증거·경계·전환 갭)
  gapAnalysis: GapAnalysisSchema,

  // 안전 플래그
  safetyFlags: z.array(z.string()).default([]),

  // 메타
  createdAt: IsoDateTimeSchema,
});

export type ForecastOutput = z.infer<typeof ForecastOutputSchema>;
export type WeeklyForecastOutput = z.infer<typeof WeeklyForecastOutputSchema>;
export type MonthlyForecastOutput = z.infer<typeof MonthlyForecastOutputSchema>;
export type SensoryPrescription = z.infer<typeof SensoryPrescriptionSchema>;
export type VibePrescriptionItem = z.infer<typeof VibePrescriptionItemSchema>;
export type VibePrescription = z.infer<typeof VibePrescriptionSchema>;
export type DomainForecast = z.infer<typeof DomainForecastSchema>;
export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type DailyForecastOutput = z.infer<typeof DailyForecastOutputSchema>;

import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

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

export type ForecastOutput = z.infer<typeof ForecastOutputSchema>;
export type WeeklyForecastOutput = z.infer<typeof WeeklyForecastOutputSchema>;
export type MonthlyForecastOutput = z.infer<typeof MonthlyForecastOutputSchema>;

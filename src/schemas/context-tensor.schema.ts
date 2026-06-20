import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, VibeScoreSchema } from "./common.schema";
import { PersonalContextSchema } from "./personal-context.schema";

export const ForecastFocusSchema = z.enum([
  "business_finance",
  "relationship_love",
  "health_recovery",
  "learning_writing_research",
  "reputation_branding",
  "risk_legal_safety",
]);

export const ContextTensorSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastRequestId: IdSchema,
  domainAxis: z.array(ForecastFocusSchema),
  userStateAxis: z.object({
    valence: VibeScoreSchema,
    arousal: VibeScoreSchema,
    energy: VibeScoreSchema,
    focus: VibeScoreSchema,
    socialLoad: VibeScoreSchema,
  }),
  riskAxis: z.array(z.string()),
  intentAxis: z.array(z.string()),
  evidenceAxis: z.array(z.string()),
  temporalAxis: z.object({
    majorLuck: z.string().optional(),
    annualLuck: z.string().optional(),
    monthlyLuck: z.string().optional(),
    dailyLuck: z.string().optional(),
    productPhase: z.string().optional(),
  }),
  channelAxis: z.enum(["daily_board", "weekly_review", "monthly_plan", "relationship_message", "business_strategy", "general"]),
  // 개인 맥락 축: PersonalContext 필드를 통해 TCO pack 개념 활성화를 조정
  personalContextAxis: PersonalContextSchema.optional(),
  createdAt: IsoDateTimeSchema,
});

export type ForecastFocus = z.infer<typeof ForecastFocusSchema>;
export type ContextTensor = z.infer<typeof ContextTensorSchema>;

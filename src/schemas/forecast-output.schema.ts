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

export type ForecastOutput = z.infer<typeof ForecastOutputSchema>;

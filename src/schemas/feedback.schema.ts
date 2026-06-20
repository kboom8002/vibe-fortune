import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const ForecastFeedbackSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastOutputId: IdSchema,
  rating: z.number().int().min(1).max(5),
  feedbackTags: z.array(z.string()).default([]),
  comment: z.string().nullable().optional(),
  createdAt: IsoDateTimeSchema,
});

export type ForecastFeedback = z.infer<typeof ForecastFeedbackSchema>;

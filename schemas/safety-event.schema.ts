import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const SafetyEventSchema = z.object({
  id: IdSchema,
  userId: IdSchema.optional(),
  forecastRequestId: IdSchema.optional(),
  eventType: z.enum([
    "self_harm",
    "medical",
    "legal",
    "investment",
    "relationship_manipulation",
    "fear_amplification",
    "deterministic_prediction",
    "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  inputExcerpt: z.string().optional(),
  actionTaken: z.enum(["blocked", "redirected", "boundary_added", "logged"]),
  createdAt: IsoDateTimeSchema,
});

export type SafetyEvent = z.infer<typeof SafetyEventSchema>;

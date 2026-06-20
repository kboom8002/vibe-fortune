import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const RLHFBiasSchema = z.object({
  intensity_offset: z.number().default(0),
  risk_sensitivity: z.number().default(1.0),
  tone_preference: z.enum(["gentle", "coaching", "directive", "warmth", "balanced"]).nullable().default(null),
  action_count_limit: z.number().nullable().default(null),
});

export const ProfileSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  displayName: z.string().nullable().optional(),
  defaultTimezone: z.string().default("Asia/Seoul"),
  preferredLanguage: z.string().default("ko"),
  rlhfBias: RLHFBiasSchema.optional(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type RLHFBias = z.infer<typeof RLHFBiasSchema>;
export type Profile = z.infer<typeof ProfileSchema>;


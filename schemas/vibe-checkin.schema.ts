import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, VibeScoreSchema } from "./common.schema";

export const VibeCheckInSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  valence: VibeScoreSchema,
  arousal: VibeScoreSchema,
  energy: VibeScoreSchema,
  focus: VibeScoreSchema,
  socialLoad: VibeScoreSchema,
  sleepHours: z.number().min(0).max(24).optional(),
  oneLineEvent: z.string().max(500).optional(),
  createdAt: IsoDateTimeSchema,
});

export type VibeCheckIn = z.infer<typeof VibeCheckInSchema>;

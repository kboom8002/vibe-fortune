import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const ForecastRequestSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  mode: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateRange: z.object({
    start: IsoDateTimeSchema,
    end: IsoDateTimeSchema,
  }).optional(),
  currentFocus: z.array(z.string()),
  userMessage: z.string().optional(),
  birthProfileId: IdSchema.optional(),
  vibeCheckinId: IdSchema.optional(),
  createdAt: IsoDateTimeSchema,
});

export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;

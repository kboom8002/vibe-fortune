import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const ActionPolicySchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastRequestId: IdSchema,
  mode: z.enum(["Expansion", "Consolidation", "Cleanup", "Recovery"]),
  warmthVsCompetence: z.enum(["Warmth", "Competence", "Balanced"]),
  requiredActions: z.array(z.string()).min(1),
  forbiddenActions: z.array(z.string()),
  deferredActions: z.array(z.string()),
  boundaryNotes: z.array(z.string()),
  reviewQuestions: z.array(z.string()),
  sensoryPrescription: z.object({
    color: z.string().optional(),
    light: z.string().optional(),
    space: z.string().optional(),
    rhythm: z.string().optional(),
    ritual: z.string().optional(),
  }).optional(),
  createdAt: IsoDateTimeSchema,
});

export type ActionPolicy = z.infer<typeof ActionPolicySchema>;

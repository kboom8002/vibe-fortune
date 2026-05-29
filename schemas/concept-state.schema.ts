import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";

export const ConceptStateSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastRequestId: IdSchema,
  coreConceptState: z.string().min(1),
  activeConcepts: z.array(z.string()),
  suppressedConcepts: z.array(z.string()),
  conceptGaps: z.array(z.string()),
  evidenceGaps: z.array(z.string()),
  boundaryGaps: z.array(z.string()),
  conversionGaps: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  createdAt: IsoDateTimeSchema,
});

export type ConceptState = z.infer<typeof ConceptStateSchema>;

import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, RiskScoreSchema } from "./common.schema";

export const RiskConceptSchema = z.enum([
  "overextension",
  "scopeLeak",
  "overclaim",
  "burnout",
  "relationshipDryness",
  "emotionalOverreaction",
  "legalSafetyRisk",
  "missedOpportunity",
  "deterministicFortuneRisk",
  "relationshipManipulationRisk",
]);

export const RiskVectorSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  forecastRequestId: IdSchema,
  overextension: RiskScoreSchema,
  scopeLeak: RiskScoreSchema,
  overclaim: RiskScoreSchema,
  burnout: RiskScoreSchema,
  relationshipDryness: RiskScoreSchema,
  emotionalOverreaction: RiskScoreSchema,
  legalSafetyRisk: RiskScoreSchema,
  missedOpportunity: RiskScoreSchema,
  deterministicFortuneRisk: RiskScoreSchema.default(0),
  relationshipManipulationRisk: RiskScoreSchema.default(0),
  primaryRisk: RiskConceptSchema,
  secondaryRisk: RiskConceptSchema.optional(),
  createdAt: IsoDateTimeSchema,
});

export type RiskVector = z.infer<typeof RiskVectorSchema>;

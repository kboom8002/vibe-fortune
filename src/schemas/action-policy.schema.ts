import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";
import { ForecastFocusSchema } from "./context-tensor.schema";

// ─── 도메인별 세분화 정책 ───────────────────────────────────────────────────
export const DomainActionPolicySchema = z.object({
  domain: ForecastFocusSchema,
  mode: z.enum(["Expansion", "Consolidation", "Cleanup", "Recovery"]),
  warmthVsCompetence: z.enum(["Warmth", "Competence", "Balanced"]),
  requiredActions: z.array(z.string()).min(1),
  forbiddenActions: z.array(z.string()).min(1),
  deferredActions: z.array(z.string()).default([]),
  boundaryNotes: z.array(z.string()).default([]),
  elementInfluence: z.enum(["wood", "fire", "earth", "metal", "water"]),
  riskLevel: z.enum(["low", "medium", "high"]),
  activatedConcepts: z.array(z.string()).default([]),
});

export type DomainActionPolicy = z.infer<typeof DomainActionPolicySchema>;

// ─── 전체 운영 정책 (DB 저장 단위) ──────────────────────────────────────────
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
  // 도메인별 세부 정책 (optional, enriched output)
  domainActionPolicies: z.array(DomainActionPolicySchema).optional(),
  createdAt: IsoDateTimeSchema,
});

export type ActionPolicy = z.infer<typeof ActionPolicySchema>;

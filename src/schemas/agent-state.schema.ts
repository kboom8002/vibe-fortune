import { z } from "zod";
import { IdSchema, IsoDateTimeSchema } from "./common.schema";
import { BirthProfileSchema, ProvidedChartSchema } from "./birth-profile.schema";
import { ManseChartSchema } from "./manse-chart.schema";
import { VibeCheckInSchema } from "./vibe-checkin.schema";
import { ContextTensorSchema, ForecastFocusSchema } from "./context-tensor.schema";
import { ConceptStateSchema } from "./concept-state.schema";
import { RiskVectorSchema } from "./risk-vector.schema";
import { ActionPolicySchema } from "./action-policy.schema";
import { ForecastOutputSchema } from "./forecast-output.schema";
import { RunReceiptSchema } from "./run-receipt.schema";

export const SafetyFlagSchema = z.object({
  type: z.enum([
    "self_harm",
    "medical",
    "legal",
    "investment",
    "relationship_manipulation",
    "fear_amplification",
    "deterministic_prediction",
    "overclaim",
    "missing_boundary",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  action: z.enum(["blocked", "redirected", "boundary_added", "logged"]),
  message: z.string().optional(),
});

export const AgentWarningSchema = z.object({
  code: z.enum([
    "BIRTH_TIME_UNKNOWN",
    "TIMEZONE_UNCERTAIN",
    "CHART_CONSISTENCY_MISMATCH",
    "SOLAR_TERM_APPROXIMATED",
    "TRUE_SOLAR_TIME_DISABLED",
    "NIGHT_ZI_DISABLED",
    "VIBE_CHECKIN_PARTIAL",
    "INSUFFICIENT_CONTEXT",
    "POLICY_VARIANT_MAY_DIFFER",
    "SAFETY_BOUNDARY_ADDED",
  ]),
  message: z.string(),
  node: z.string(),
  userVisible: z.boolean(),
});

export const AgentErrorSchema = z.object({
  code: z.enum([
    "MISSING_USER_ID",
    "MISSING_BIRTH_PROFILE",
    "MANSE_CALCULATION_FAILED",
    "SCHEMA_VALIDATION_FAILED",
    "OPENAI_STRUCTURED_OUTPUT_FAILED",
    "SAFETY_BLOCKED",
    "PERSISTENCE_FAILED",
    "RLS_DENIED",
    "UNKNOWN",
  ]),
  message: z.string(),
  recoverable: z.boolean(),
  node: z.string(),
  details: z.unknown().optional(),
});

export const ForecastRequestInputSchema = z.object({
  vibeCheckIn: z.lazy(() => VibeCheckInSchema.partial()).optional(),
  currentFocus: ForecastFocusSchema.optional(),
  timezone: z.string().default("Asia/Seoul"),
  providedChart: ProvidedChartSchema.optional(),
  userMessage: z.string().optional(),
});

export const VibeFortuneAgentStateSchema = z.object({
  userId: z.string(),
  requestId: z.string(),
  input: ForecastRequestInputSchema,

  profile: z.unknown().optional(), // profile placeholder
  birthProfile: BirthProfileSchema.optional(),
  providedChart: ProvidedChartSchema.optional(),

  chart: ManseChartSchema.optional(),
  majorLuck: z.unknown().optional(), // majorLuck placeholder
  luckRange: z.unknown().optional(), // luckRange placeholder
  chartConsistency: z.unknown().optional(), // chartConsistency placeholder

  vibeCheckIn: VibeCheckInSchema.optional(),
  recentRunReceipts: z.array(RunReceiptSchema).optional(),
  recentForecastOutputs: z.array(ForecastOutputSchema).optional(),

  contextTensor: ContextTensorSchema.optional(),
  conceptState: ConceptStateSchema.optional(),
  riskVector: RiskVectorSchema.optional(),
  operatorOutputs: z.array(ActionPolicySchema.partial()).optional(),
  actionPolicy: ActionPolicySchema.optional(),

  draftOutput: z.unknown().optional(),
  finalOutput: ForecastOutputSchema.optional(),

  safetyFlags: z.array(SafetyFlagSchema).default([]),
  warnings: z.array(AgentWarningSchema).default([]),
  errors: z.array(AgentErrorSchema).default([]),

  persistence: z.object({
    forecastRequestId: IdSchema.optional(),
    contextTensorId: IdSchema.optional(),
    conceptStateId: IdSchema.optional(),
    riskVectorId: IdSchema.optional(),
    actionPolicyId: IdSchema.optional(),
    forecastOutputId: IdSchema.optional(),
  }).optional(),

  runtime: z.object({
    provider: z.enum(["mock", "openai", "gemini", "anthropic"]),
    startedAt: z.string(),
    nodeHistory: z.array(z.string()),
    retryCount: z.number(),
  }),
});

export type SafetyFlag = z.infer<typeof SafetyFlagSchema>;
export type AgentWarning = z.infer<typeof AgentWarningSchema>;
export type AgentError = z.infer<typeof AgentErrorSchema>;
export type ForecastRequestInput = z.infer<typeof ForecastRequestInputSchema>;
export type VibeFortuneAgentState = z.infer<typeof VibeFortuneAgentStateSchema>;

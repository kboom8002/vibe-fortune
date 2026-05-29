import { z } from "zod";
import { BirthProfileSchema } from "./birth-profile.schema";
import { GenderSchema } from "./common.schema";
import { ManseChartSchema } from "./manse-chart.schema";
import { VibeCheckInSchema } from "./vibe-checkin.schema";
import { ForecastFocusSchema } from "./context-tensor.schema";
import { ForecastOutputSchema } from "./forecast-output.schema";
import { RunReceiptSchema } from "./run-receipt.schema";
import { SafetyFlagSchema, AgentWarningSchema } from "./agent-state.schema";

// POST /api/profile/birth
export const BirthProfileRequestSchema = z.object({
  name: z.string().min(1),
  birthDateTime: z.string().datetime(),
  timezone: z.string().min(1),
  gender: GenderSchema,
  birthLocation: z.string().optional(),
  providedChart: z.object({
    yearPillar: z.string().optional(),
    monthPillar: z.string().optional(),
    dayPillar: z.string().optional(),
    hourPillar: z.string().optional(),
  }).optional(),
});

export const BirthProfileResponseSchema = z.object({
  birthProfile: BirthProfileSchema,
  chart: ManseChartSchema,
  majorLuck: z.unknown(), // we will type this fully when we implement major luck
  warnings: z.array(AgentWarningSchema),
});

// POST /api/vibe-checkin
export const VibeCheckinRequestSchema = z.object({
  valence: z.number().min(0).max(10),
  arousal: z.number().min(0).max(10),
  energy: z.number().min(0).max(10),
  focus: z.number().min(0).max(10),
  socialLoad: z.number().min(0).max(10),
  sleepHours: z.number().min(0).max(24).optional(),
  oneLineEvent: z.string().max(500).optional(),
});

export const VibeCheckinResponseSchema = z.object({
  vibeCheckIn: VibeCheckInSchema,
});

// POST /api/forecast/daily
export const DailyForecastRequestSchema = z.object({
  birthProfileId: z.string().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vibeCheckInId: z.string().optional(),
  vibeCheckIn: VibeCheckinRequestSchema.partial().optional(),
  currentFocus: z.array(ForecastFocusSchema),
  userMessage: z.string().optional(),
});

export const DailyForecastResponseSchema = z.object({
  status: z.enum(["ok", "blocked", "onboarding_required", "partial"]),
  forecastOutput: ForecastOutputSchema.optional(),
  warnings: z.array(AgentWarningSchema),
  safetyFlags: z.array(SafetyFlagSchema),
});

// POST /api/run-receipt
export const RunReceiptRequestSchema = z.object({
  forecastOutputId: z.string().min(1),
  whatIDid: z.string().min(1),
  whyIChoseIt: z.string().optional(),
  whatAIHelped: z.string().optional(),
  myJudgment: z.string().optional(),
  whatIDeferred: z.string().optional(),
  whatILearned: z.string().optional(),
  nextAction: z.string().optional(),
});

export const RunReceiptResponseSchema = z.object({
  runReceipt: RunReceiptSchema,
});

export type BirthProfileRequest = z.infer<typeof BirthProfileRequestSchema>;
export type BirthProfileResponse = z.infer<typeof BirthProfileResponseSchema>;
export type VibeCheckinRequest = z.infer<typeof VibeCheckinRequestSchema>;
export type VibeCheckinResponse = z.infer<typeof VibeCheckinResponseSchema>;
export type DailyForecastRequest = z.infer<typeof DailyForecastRequestSchema>;
export type DailyForecastResponse = z.infer<typeof DailyForecastResponseSchema>;
export type RunReceiptRequest = z.infer<typeof RunReceiptRequestSchema>;
export type RunReceiptResponse = z.infer<typeof RunReceiptResponseSchema>;

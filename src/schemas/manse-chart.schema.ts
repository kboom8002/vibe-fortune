import { z } from "zod";
import { IdSchema, IsoDateTimeSchema, PillarSchema, HeavenlyStemSchema, FiveElementSchema, YinYangSchema } from "./common.schema";
import { MansePolicySchema } from "./birth-profile.schema";

export const ManseWarningSchema = z.enum([
  "SOLAR_TERM_APPROXIMATED",
  "TIMEZONE_UNCERTAIN",
  "GENDER_UNSPECIFIED",
  "TRUE_SOLAR_TIME_DISABLED",
  "NIGHT_ZI_DISABLED",
  "POLICY_VARIANT_MAY_DIFFER",
  "CALCULATION_FAILED",
]);

export const ChartConsistencySchema = z.object({
  status: z.enum(["matched", "mismatched", "not_provided", "calculation_failed"]),
  mismatchedFields: z.array(z.enum(["year", "month", "day", "hour"])).optional(),
  canonicalSource: z.enum(["calculated", "user_provided"]),
  note: z.string().optional(),
});

export const ManseChartSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  birthProfileId: IdSchema,
  birthDateTime: z.string(),
  pillars: z.object({
    year: PillarSchema,
    month: PillarSchema,
    day: PillarSchema,
    hour: PillarSchema,
  }),
  dayMaster: z.object({
    stem: HeavenlyStemSchema,
    element: FiveElementSchema,
    polarity: YinYangSchema,
    strength: z.object({
      score: z.number(),
      judgment: z.enum(["strong", "weak", "balanced"]),
    }).optional(),
    yongSin: z.string().optional(),
  }),
  tenGods: z.record(z.string(), z.string()),
  hiddenStems: z.record(z.string(), z.array(z.string())),
  fiveElementDistribution: z.object({
    wood: z.number(),
    fire: z.number(),
    earth: z.number(),
    metal: z.number(),
    water: z.number(),
  }),
  chartConsistency: ChartConsistencySchema.optional(),
  calculationPolicy: MansePolicySchema,
  warnings: z.array(ManseWarningSchema),
  createdAt: IsoDateTimeSchema,
});

export type ManseChart = z.infer<typeof ManseChartSchema>;
export type ManseWarning = z.infer<typeof ManseWarningSchema>;

export const MajorLuckCycleSchema = z.object({
  stem: z.string(),
  branch: z.string(),
  ganzhi: z.string(),
  startAge: z.number(),
  startDate: z.string().optional(),
});

export const MajorLuckResultSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  birthProfileId: IdSchema,
  chartId: IdSchema.optional(),
  direction: z.enum(["forward", "backward"]),
  startAge: z.number(),
  startDate: z.string().optional(),
  cycles: z.array(MajorLuckCycleSchema),
  calculationPolicy: MansePolicySchema,
  warnings: z.array(ManseWarningSchema),
  createdAt: z.string(),
});

export const AnnualLuckResultSchema = z.object({
  year: z.number(),
  pillar: PillarSchema,
});

export const MonthlyLuckResultSchema = z.object({
  year: z.number(),
  month: z.number(),
  pillar: PillarSchema,
});

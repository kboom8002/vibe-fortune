import { z } from "zod";
import { GenderSchema, IsoDateTimeSchema, IdSchema } from "./common.schema";

export const MansePolicySchema = z.object({
  yearBoundary: z.enum(["lichun", "lunar_new_year"]),
  monthBoundary: z.literal("solar_terms"),
  dayEpoch: z.literal("verified_jdn_epoch"),
  hourPolicy: z.literal("standard_2h"),
  nightZiPolicy: z.enum(["disabled", "enabled"]),
  trueSolarTime: z.boolean(),
  majorLuckDirectionRule: z.literal("gender_yinyang_year_stem"),
  majorLuckStartRule: z.literal("days_to_jieqi_divide_by_3"),
  policyName: z.enum(["standard_kr", "custom"]),
});

export const ProvidedChartSchema = z.object({
  yearPillar: z.string().optional(),
  monthPillar: z.string().optional(),
  dayPillar: z.string().optional(),
  hourPillar: z.string().optional(),
});

export const BirthProfileSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  name: z.string().min(1),
  birthDateTime: IsoDateTimeSchema,
  timezone: z.string().min(1),
  gender: GenderSchema,
  birthLocation: z.string().optional(),
  providedChart: ProvidedChartSchema.optional(),
  calculationPolicy: MansePolicySchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
});

export type BirthProfile = z.infer<typeof BirthProfileSchema>;
export type MansePolicy = z.infer<typeof MansePolicySchema>;

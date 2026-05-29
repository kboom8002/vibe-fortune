import { z } from "zod";

export const IdSchema = z.string().min(1);
export const IsoDateTimeSchema = z.string().datetime();
export const RiskScoreSchema = z.number().min(0).max(1);
export const VibeScoreSchema = z.number().min(0).max(10);

export const GenderSchema = z.enum(["male", "female", "other", "unspecified"]);
export const LanguageSchema = z.enum(["ko", "en"]);

export const HeavenlyStemSchema = z.enum(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
export const EarthlyBranchSchema = z.enum(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
export const FiveElementSchema = z.enum(["wood", "fire", "earth", "metal", "water"]);
export const YinYangSchema = z.enum(["yin", "yang"]);

export const PillarSchema = z.object({
  stem: HeavenlyStemSchema,
  branch: EarthlyBranchSchema,
  label: z.string().min(2),
});

export type Pillar = z.infer<typeof PillarSchema>;

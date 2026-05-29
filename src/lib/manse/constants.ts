export const HEAVENLY_STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export type HeavenlyStem = typeof HEAVENLY_STEMS[number];
export type EarthlyBranch = typeof EARTHLY_BRANCHES[number];

export const STEM_ELEMENTS: Record<HeavenlyStem, "wood" | "fire" | "earth" | "metal" | "water"> = {
  "甲": "wood",
  "乙": "wood",
  "丙": "fire",
  "丁": "fire",
  "戊": "earth",
  "己": "earth",
  "庚": "metal",
  "辛": "metal",
  "壬": "water",
  "癸": "water",
};

export const STEM_POLARITIES: Record<HeavenlyStem, "yin" | "yang"> = {
  "甲": "yang",
  "乙": "yin",
  "丙": "yang",
  "丁": "yin",
  "戊": "yang",
  "己": "yin",
  "庚": "yang",
  "辛": "yin",
  "壬": "yang",
  "癸": "yin",
};

export const BRANCH_MAIN_ELEMENTS: Record<EarthlyBranch, "wood" | "fire" | "earth" | "metal" | "water"> = {
  "寅": "wood", "卯": "wood",
  "巳": "fire", "午": "fire",
  "辰": "earth", "戌": "earth", "丑": "earth", "未": "earth",
  "申": "metal", "酉": "metal",
  "亥": "water", "子": "water",
};

export const BRANCH_POLARITIES: Record<EarthlyBranch, "yin" | "yang"> = {
  "子": "yin", // functionally yin (main stem 癸 is yin)
  "丑": "yin",
  "寅": "yang",
  "卯": "yin",
  "辰": "yang",
  "巳": "yang", // functionally yang (main stem 丙 is yang)
  "午": "yin", // functionally yin (main stem 丁 is yin)
  "未": "yin",
  "申": "yang",
  "酉": "yin",
  "戌": "yang",
  "亥": "yang", // functionally yang (main stem 壬 is yang)
};

export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
  "子": ["壬", "癸"],
  "丑": ["癸", "辛", "己"],
  "寅": ["戊", "丙", "甲"],
  "卯": ["甲", "乙"],
  "辰": ["乙", "癸", "戊"],
  "巳": ["戊", "庚", "丙"],
  "午": ["丙", "己", "丁"],
  "未": ["丁", "乙", "己"],
  "申": ["戊", "壬", "庚"],
  "酉": ["庚", "辛"],
  "戌": ["辛", "丁", "戊"],
  "亥": ["戊", "甲", "壬"],
};

export const DEFAULT_MANSE_POLICY = {
  yearBoundary: "lichun" as const,
  monthBoundary: "solar_terms" as const,
  dayEpoch: "verified_jdn_epoch" as const,
  hourPolicy: "standard_2h" as const,
  nightZiPolicy: "disabled" as const,
  trueSolarTime: false,
  majorLuckDirectionRule: "gender_yinyang_year_stem" as const,
  majorLuckStartRule: "days_to_jieqi_divide_by_3" as const,
  policyName: "standard_kr" as const,
};

import { HeavenlyStem, EarthlyBranch } from "./constants";
import { ChartResult } from "./types";
import { Pillar } from "@/schemas/common.schema";

export interface PeriodInteractionDetail {
  type: string; // 'combination' | 'clash' | 'penalty'
  description: string;
  sourcePillar: "major_luck" | "annual" | "monthly" | "daily";
  targetBasePillar: "year" | "month" | "day" | "hour";
}

const STEM_COMBINATIONS: Record<string, string> = {
  "甲": "己", "己": "甲",
  "乙": "庚", "庚": "乙",
  "丙": "辛", "辛": "丙",
  "丁": "壬", "壬": "丁",
  "戊": "癸", "癸": "戊",
};

const BRANCH_CLASHES: Record<string, string> = {
  "子": "午", "午": "子",
  "丑": "未", "未": "丑",
  "寅": "申", "申": "寅",
  "卯": "酉", "酉": "卯",
  "辰": "戌", "戌": "辰",
  "巳": "亥", "亥": "巳",
};

const BRANCH_COMBINATIONS: Record<string, string> = {
  "子": "丑", "丑": "子",
  "寅": "亥", "亥": "寅",
  "卯": "戌", "戌": "卯",
  "辰": "酉", "酉": "辰",
  "巳": "申", "申": "巳",
  "午": "未", "未": "午",
};

export function analyzePeriodInteractions(
  chart: ChartResult,
  targetPillar: Pillar,
  sourceType: "major_luck" | "annual" | "monthly" | "daily"
): PeriodInteractionDetail[] {
  const details: PeriodInteractionDetail[] = [];
  const basePillars = [
    { name: "year" as const, pillar: chart.pillars.year },
    { name: "month" as const, pillar: chart.pillars.month },
    { name: "day" as const, pillar: chart.pillars.day },
    { name: "hour" as const, pillar: chart.pillars.hour },
  ];

  const stem = targetPillar.stem;
  const branch = targetPillar.branch;

  for (const base of basePillars) {
    const baseStem = base.pillar.stem;
    const baseBranch = base.pillar.branch;

    // 1. Stem Combination (천간합)
    if (STEM_COMBINATIONS[stem] === baseStem) {
      details.push({
        type: "combination",
        description: `천간합 감지: ${sourceType} 천간 [${stem}]이 원국 ${base.name} [${baseStem}]과 합을 이룹니다.`,
        sourcePillar: sourceType,
        targetBasePillar: base.name,
      });
    }

    // 2. Branch Clash (지지육충)
    if (BRANCH_CLASHES[branch] === baseBranch) {
      details.push({
        type: "clash",
        description: `지지충 감지: ${sourceType} 지지 [${branch}]가 원국 ${base.name} [${baseBranch}]과 충합니다. 변동성과 갈등에 유의하십시오.`,
        sourcePillar: sourceType,
        targetBasePillar: base.name,
      });
    }

    // 3. Branch Combination (지지육합)
    if (BRANCH_COMBINATIONS[branch] === baseBranch) {
      details.push({
        type: "combination",
        description: `지지합 감지: ${sourceType} 지지 [${branch}]가 원국 ${base.name} [${baseBranch}]과 육합을 이룹니다. 협력과 안정감이 상승합니다.`,
        sourcePillar: sourceType,
        targetBasePillar: base.name,
      });
    }
  }

  return details;
}

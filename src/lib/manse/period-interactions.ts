import { HeavenlyStem, EarthlyBranch } from "./constants";
import { ChartResult } from "./types";
import { Pillar } from "@/schemas/common.schema";

export interface PeriodInteractionDetail {
  type: string; // 'combination' | 'clash' | 'penalty' | 'harm' | 'destruction'
  description: string;
  sourcePillar: "major_luck" | "annual" | "monthly" | "daily";
  targetBasePillar: "year" | "month" | "day" | "hour" | "multiple";
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

const TRIPLE_HARMONIES: [EarthlyBranch, EarthlyBranch, EarthlyBranch, string][] = [
  ["申", "子", "辰", "水"],
  ["寅", "午", "戌", "火"],
  ["巳", "酉", "丑", "金"],
  ["亥", "卯", "未", "木"],
];

const THREE_PENALTIES_TRIPLE: [EarthlyBranch, EarthlyBranch, EarthlyBranch, string][] = [
  ["寅", "巳", "申", "무은지형"],
  ["丑", "戌", "未", "지세지형"],
];

const PENALTY_PAIR: [EarthlyBranch, EarthlyBranch, string][] = [
  ["子", "卯", "무례지형"],
];

const SELF_PENALTIES: EarthlyBranch[] = ["辰", "午", "酉", "亥"];

const HARMS: [EarthlyBranch, EarthlyBranch][] = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];

const DESTRUCTIONS: [EarthlyBranch, EarthlyBranch][] = [
  ["子", "酉"], ["丑", "辰"], ["寅", "亥"], ["卯", "午"], ["巳", "申"], ["未", "戌"],
];

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

    // 4. Harm (해)
    for (const [b1, b2] of HARMS) {
      if ((branch === b1 && baseBranch === b2) || (branch === b2 && baseBranch === b1)) {
        details.push({
          type: "harm",
          description: `지지해 감지: ${sourceType} 지지 [${branch}]가 원국 ${base.name} [${baseBranch}]과 해(害)를 이룹니다. 방해나 오해에 유의하십시오.`,
          sourcePillar: sourceType,
          targetBasePillar: base.name,
        });
      }
    }

    // 5. Destruction (파)
    for (const [b1, b2] of DESTRUCTIONS) {
      if ((branch === b1 && baseBranch === b2) || (branch === b2 && baseBranch === b1)) {
        details.push({
          type: "destruction",
          description: `지지파 감지: ${sourceType} 지지 [${branch}]가 원국 ${base.name} [${baseBranch}]과 파(破)를 이룹니다. 기존 틀의 깨짐이나 분열이 발생할 수 있습니다.`,
          sourcePillar: sourceType,
          targetBasePillar: base.name,
        });
      }
    }

    // 6. Penalty Pair (무례지형)
    for (const [b1, b2, penaltyName] of PENALTY_PAIR) {
      if ((branch === b1 && baseBranch === b2) || (branch === b2 && baseBranch === b1)) {
        details.push({
          type: "penalty",
          description: `지지형 감지: ${sourceType} 지지 [${branch}]가 원국 ${base.name} [${baseBranch}]과 ${penaltyName}을 이룹니다. 대인관계에서 예의와 선을 지키십시오.`,
          sourcePillar: sourceType,
          targetBasePillar: base.name,
        });
      }
    }

    // 7. Self Penalty (자형)
    if (branch === baseBranch && SELF_PENALTIES.includes(branch as any)) {
      details.push({
        type: "penalty",
        description: `자형 감지: ${sourceType} 지지 [${branch}]가 원국 ${base.name} [${baseBranch}]과 자형(自刑)을 이룹니다. 스스로 스트레스를 만들지 않도록 주의하십시오.`,
        sourcePillar: sourceType,
        targetBasePillar: base.name,
      });
    }
  }

  // Check multi-branch interactions
  const baseBranchStrs = basePillars.map(b => b.pillar.branch);

  // 8. Triple Harmony (삼합)
  for (const [b1, b2, b3, element] of TRIPLE_HARMONIES) {
    const harmonyBranches = [b1, b2, b3];
    if (harmonyBranches.includes(branch as any)) {
      const needed = harmonyBranches.filter(b => b !== branch);
      if (baseBranchStrs.includes(needed[0]) && baseBranchStrs.includes(needed[1])) {
        details.push({
          type: "combination",
          description: `삼합 감지: ${sourceType} 지지 [${branch}]가 원국의 [${needed[0]}], [${needed[1]}]과 결합해 거대한 ${element}국(삼합)을 형성합니다. 큰 규모의 에너지가 결집됩니다.`,
          sourcePillar: sourceType,
          targetBasePillar: "multiple",
        });
      }
    }
  }

  // 9. Triple Penalty (삼형 - 무은지형, 지세지형)
  for (const [b1, b2, b3, penaltyName] of THREE_PENALTIES_TRIPLE) {
    const penaltyBranches = [b1, b2, b3];
    if (penaltyBranches.includes(branch as any)) {
      const needed = penaltyBranches.filter(b => b !== branch);
      if (baseBranchStrs.includes(needed[0]) && baseBranchStrs.includes(needed[1])) {
        details.push({
          type: "penalty",
          description: `삼형 감지: ${sourceType} 지지 [${branch}]가 원국의 [${needed[0]}], [${needed[1]}]과 결합해 ${penaltyName}(삼형)을 이룹니다. 법적, 관계적, 물리적 마찰과 강제적 조정에 크게 유의하십시오.`,
          sourcePillar: sourceType,
          targetBasePillar: "multiple",
        });
      }
    }
  }

  return details;
}

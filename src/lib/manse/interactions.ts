/**
 * 합충형파해(合沖刑破害) 상호작용 분석 모듈
 *
 * 사주 내 천간·지지 간의 합, 충, 형, 파, 해를 결정론적으로 분석한다.
 * LLM 호출 없이 순수 결정론적 계산만 수행한다.
 */

import {
  HeavenlyStem,
  EarthlyBranch,
  STEM_ELEMENTS,
} from "./constants";
import { ChartResult } from "./types";

// ========== 타입 정의 ==========

export type InteractionType =
  | "천간합"     // 天干合 - Stem combination
  | "지지육합"   // 地支六合 - Six branch combinations
  | "삼합"       // 三合 - Triple harmony
  | "방합"       // 方合 - Directional harmony
  | "육충"       // 六沖 - Six clashes
  | "삼형"       // 三刑 - Three penalties
  | "자형"       // 自刑 - Self-penalty
  | "해"         // 害 - Harm
  | "파";        // 破 - Destruction

export type InteractionResult = {
  type: InteractionType;
  branches?: EarthlyBranch[];   // 관련 지지 (2~3개)
  stems?: HeavenlyStem[];       // 관련 천간 (2개, 천간합에서만)
  positions: string[];          // 위치 (year, month, day, hour)
  resultElement?: string;       // 합화 오행 (삼합, 방합 결과)
  description: string;          // 한글 설명
};

// ========== 천간합 (天干合) ==========
// 甲己合化土, 乙庚合化金, 丙辛合化水, 丁壬合化木, 戊癸合化火
const STEM_COMBINATIONS: [HeavenlyStem, HeavenlyStem, string][] = [
  ["甲", "己", "土"],
  ["乙", "庚", "金"],
  ["丙", "辛", "水"],
  ["丁", "壬", "木"],
  ["戊", "癸", "火"],
];

// ========== 지지육합 (地支六合) ==========
// 子丑合化土, 寅亥合化木, 卯戌合化火, 辰酉合化金, 巳申合化水, 午未合化太陽/太陰
const BRANCH_SIX_COMBINATIONS: [EarthlyBranch, EarthlyBranch, string][] = [
  ["子", "丑", "土"],
  ["寅", "亥", "木"],
  ["卯", "戌", "火"],
  ["辰", "酉", "金"],
  ["巳", "申", "水"],
  ["午", "未", "火土"],
];

// ========== 삼합 (三合) ==========
// 申子辰(水局), 寅午戌(火局), 巳酉丑(金局), 亥卯未(木局)
const TRIPLE_HARMONIES: [EarthlyBranch, EarthlyBranch, EarthlyBranch, string][] = [
  ["申", "子", "辰", "水"],
  ["寅", "午", "戌", "火"],
  ["巳", "酉", "丑", "金"],
  ["亥", "卯", "未", "木"],
];

// ========== 방합 (方合) ==========
// 寅卯辰(東/木), 巳午未(南/火), 申酉戌(西/金), 亥子丑(北/水)
const DIRECTIONAL_HARMONIES: [EarthlyBranch, EarthlyBranch, EarthlyBranch, string][] = [
  ["寅", "卯", "辰", "木"],
  ["巳", "午", "未", "火"],
  ["申", "酉", "戌", "金"],
  ["亥", "子", "丑", "水"],
];

// ========== 육충 (六沖) ==========
// 子午沖, 丑未沖, 寅申沖, 卯酉沖, 辰戌沖, 巳亥沖
const SIX_CLASHES: [EarthlyBranch, EarthlyBranch][] = [
  ["子", "午"],
  ["丑", "未"],
  ["寅", "申"],
  ["卯", "酉"],
  ["辰", "戌"],
  ["巳", "亥"],
];

// ========== 삼형 (三刑) ==========
// 무은지형(無恩之刑): 寅巳申
// 지세지형(持勢之刑): 丑戌未
// 무례지형(無禮之刑): 子卯 (2개이므로 별도 처리)
const THREE_PENALTIES_TRIPLE: [EarthlyBranch, EarthlyBranch, EarthlyBranch, string][] = [
  ["寅", "巳", "申", "무은지형"],
  ["丑", "戌", "未", "지세지형"],
];

// 무례지형은 2개로 구성
const PENALTY_PAIR: [EarthlyBranch, EarthlyBranch, string][] = [
  ["子", "卯", "무례지형"],
];

// 자형(自刑): 辰辰, 午午, 酉酉, 亥亥
const SELF_PENALTIES: EarthlyBranch[] = ["辰", "午", "酉", "亥"];

// ========== 해 (害/穿) ==========
// 子未害, 丑午害, 寅巳害, 卯辰害, 申亥害, 酉戌害
const HARMS: [EarthlyBranch, EarthlyBranch][] = [
  ["子", "未"],
  ["丑", "午"],
  ["寅", "巳"],
  ["卯", "辰"],
  ["申", "亥"],
  ["酉", "戌"],
];

// ========== 파 (破) ==========
// 子酉破, 丑辰破, 寅亥破, 卯午破, 巳申破, 未戌破
const DESTRUCTIONS: [EarthlyBranch, EarthlyBranch][] = [
  ["子", "酉"],
  ["丑", "辰"],
  ["寅", "亥"],
  ["卯", "午"],
  ["巳", "申"],
  ["未", "戌"],
];

// ========== 유틸리티 함수 ==========

/** 위치 이름 배열 */
const POSITION_NAMES = ["year", "month", "day", "hour"] as const;

/** 사주에서 4개의 천간 추출 */
function extractStems(chart: ChartResult): { stem: HeavenlyStem; position: string }[] {
  return [
    { stem: chart.pillars.year.stem as HeavenlyStem, position: "year" },
    { stem: chart.pillars.month.stem as HeavenlyStem, position: "month" },
    { stem: chart.pillars.day.stem as HeavenlyStem, position: "day" },
    { stem: chart.pillars.hour.stem as HeavenlyStem, position: "hour" },
  ];
}

/** 사주에서 4개의 지지 추출 */
function extractBranches(chart: ChartResult): { branch: EarthlyBranch; position: string }[] {
  return [
    { branch: chart.pillars.year.branch as EarthlyBranch, position: "year" },
    { branch: chart.pillars.month.branch as EarthlyBranch, position: "month" },
    { branch: chart.pillars.day.branch as EarthlyBranch, position: "day" },
    { branch: chart.pillars.hour.branch as EarthlyBranch, position: "hour" },
  ];
}

// ========== 분석 함수 ==========

/** 천간합 분석 */
function analyzeStemCombinations(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const stems = extractStems(chart);

  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      for (const [s1, s2, element] of STEM_COMBINATIONS) {
        if (
          (stems[i].stem === s1 && stems[j].stem === s2) ||
          (stems[i].stem === s2 && stems[j].stem === s1)
        ) {
          results.push({
            type: "천간합",
            stems: [stems[i].stem, stems[j].stem],
            positions: [stems[i].position, stems[j].position],
            resultElement: element,
            description: `${stems[i].stem}${stems[j].stem} 합화${element} (${stems[i].position}-${stems[j].position})`,
          });
        }
      }
    }
  }

  return results;
}

/** 지지육합 분석 */
function analyzeBranchSixCombinations(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      for (const [b1, b2, element] of BRANCH_SIX_COMBINATIONS) {
        if (
          (branches[i].branch === b1 && branches[j].branch === b2) ||
          (branches[i].branch === b2 && branches[j].branch === b1)
        ) {
          results.push({
            type: "지지육합",
            branches: [branches[i].branch, branches[j].branch],
            positions: [branches[i].position, branches[j].position],
            resultElement: element,
            description: `${branches[i].branch}${branches[j].branch} 육합 합화${element} (${branches[i].position}-${branches[j].position})`,
          });
        }
      }
    }
  }

  return results;
}

/** 삼합 분석 */
function analyzeTripleHarmonies(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);
  const branchSet = new Set(branches.map(b => b.branch));

  for (const [b1, b2, b3, element] of TRIPLE_HARMONIES) {
    // 완전 삼합: 3개 모두 존재
    if (branchSet.has(b1) && branchSet.has(b2) && branchSet.has(b3)) {
      const positions = branches
        .filter(b => b.branch === b1 || b.branch === b2 || b.branch === b3)
        .map(b => b.position);
      results.push({
        type: "삼합",
        branches: [b1, b2, b3],
        positions,
        resultElement: element,
        description: `${b1}${b2}${b3} 삼합${element}국 (${positions.join("-")})`,
      });
    }
  }

  return results;
}

/** 방합 분석 */
function analyzeDirectionalHarmonies(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);
  const branchSet = new Set(branches.map(b => b.branch));

  for (const [b1, b2, b3, element] of DIRECTIONAL_HARMONIES) {
    if (branchSet.has(b1) && branchSet.has(b2) && branchSet.has(b3)) {
      const positions = branches
        .filter(b => b.branch === b1 || b.branch === b2 || b.branch === b3)
        .map(b => b.position);
      results.push({
        type: "방합",
        branches: [b1, b2, b3],
        positions,
        resultElement: element,
        description: `${b1}${b2}${b3} 방합${element} (${positions.join("-")})`,
      });
    }
  }

  return results;
}

/** 육충 분석 */
function analyzeSixClashes(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      for (const [b1, b2] of SIX_CLASHES) {
        if (
          (branches[i].branch === b1 && branches[j].branch === b2) ||
          (branches[i].branch === b2 && branches[j].branch === b1)
        ) {
          results.push({
            type: "육충",
            branches: [branches[i].branch, branches[j].branch],
            positions: [branches[i].position, branches[j].position],
            description: `${branches[i].branch}${branches[j].branch} 충 (${branches[i].position}-${branches[j].position})`,
          });
        }
      }
    }
  }

  return results;
}

/** 삼형 분석 (3개 형 + 쌍 형 + 자형) */
function analyzePenalties(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);
  const branchSet = new Set(branches.map(b => b.branch));

  // 3개 삼형 (무은지형, 지세지형)
  for (const [b1, b2, b3, penaltyName] of THREE_PENALTIES_TRIPLE) {
    if (branchSet.has(b1) && branchSet.has(b2) && branchSet.has(b3)) {
      const positions = branches
        .filter(b => b.branch === b1 || b.branch === b2 || b.branch === b3)
        .map(b => b.position);
      results.push({
        type: "삼형",
        branches: [b1, b2, b3],
        positions,
        description: `${b1}${b2}${b3} ${penaltyName} (${positions.join("-")})`,
      });
    }
  }

  // 2개 형 (무례지형: 子卯)
  for (const [b1, b2, penaltyName] of PENALTY_PAIR) {
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        if (
          (branches[i].branch === b1 && branches[j].branch === b2) ||
          (branches[i].branch === b2 && branches[j].branch === b1)
        ) {
          results.push({
            type: "삼형",
            branches: [branches[i].branch, branches[j].branch],
            positions: [branches[i].position, branches[j].position],
            description: `${branches[i].branch}${branches[j].branch} ${penaltyName} (${branches[i].position}-${branches[j].position})`,
          });
        }
      }
    }
  }

  // 자형(自刑): 같은 지지가 2개 이상 존재하는 경우
  for (const selfBranch of SELF_PENALTIES) {
    const matching = branches.filter(b => b.branch === selfBranch);
    if (matching.length >= 2) {
      results.push({
        type: "자형",
        branches: matching.map(m => m.branch),
        positions: matching.map(m => m.position),
        description: `${selfBranch}${selfBranch} 자형 (${matching.map(m => m.position).join("-")})`,
      });
    }
  }

  return results;
}

/** 해(害) 분석 */
function analyzeHarms(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      for (const [b1, b2] of HARMS) {
        if (
          (branches[i].branch === b1 && branches[j].branch === b2) ||
          (branches[i].branch === b2 && branches[j].branch === b1)
        ) {
          results.push({
            type: "해",
            branches: [branches[i].branch, branches[j].branch],
            positions: [branches[i].position, branches[j].position],
            description: `${branches[i].branch}${branches[j].branch} 해 (${branches[i].position}-${branches[j].position})`,
          });
        }
      }
    }
  }

  return results;
}

/** 파(破) 분석 */
function analyzeDestructions(chart: ChartResult): InteractionResult[] {
  const results: InteractionResult[] = [];
  const branches = extractBranches(chart);

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      for (const [b1, b2] of DESTRUCTIONS) {
        if (
          (branches[i].branch === b1 && branches[j].branch === b2) ||
          (branches[i].branch === b2 && branches[j].branch === b1)
        ) {
          results.push({
            type: "파",
            branches: [branches[i].branch, branches[j].branch],
            positions: [branches[i].position, branches[j].position],
            description: `${branches[i].branch}${branches[j].branch} 파 (${branches[i].position}-${branches[j].position})`,
          });
        }
      }
    }
  }

  return results;
}

// ========== 메인 분석 함수 ==========

/**
 * 사주 전체의 합충형파해를 결정론적으로 분석한다.
 * 천간합, 지지육합, 삼합, 방합, 육충, 삼형, 자형, 해, 파 순으로 분석 후 통합 반환.
 */
export function analyzeInteractions(chart: ChartResult): InteractionResult[] {
  return [
    ...analyzeStemCombinations(chart),
    ...analyzeBranchSixCombinations(chart),
    ...analyzeTripleHarmonies(chart),
    ...analyzeDirectionalHarmonies(chart),
    ...analyzeSixClashes(chart),
    ...analyzePenalties(chart),
    ...analyzeHarms(chart),
    ...analyzeDestructions(chart),
  ];
}

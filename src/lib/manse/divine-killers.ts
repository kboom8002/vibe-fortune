/**
 * 신살(神殺) 계산 모듈
 *
 * 사주 내 신살을 결정론적으로 산출한다.
 * 도화살, 역마살, 화개살, 귀문관살, 겁살, 재살, 천을귀인, 문창귀인.
 * LLM 호출 없이 순수 결정론적 계산만 수행한다.
 */

import {
  HeavenlyStem,
  EarthlyBranch,
  EARTHLY_BRANCHES,
} from "./constants";
import { ChartResult } from "./types";

// ========== 타입 정의 ==========

export type DivineKillerType =
  | "도화살"      // 桃花殺 - 이성운, 매력
  | "역마살"      // 驛馬殺 - 이동, 변동
  | "화개살"      // 華蓋殺 - 학문, 종교, 예술
  | "귀문관살"    // 鬼門關殺 - 귀신, 정신적 불안
  | "겁살"        // 劫殺 - 도난, 손재
  | "재살"        // 災殺 - 재난, 사고
  | "천을귀인"    // 天乙貴人 - 귀인의 도움
  | "문창귀인";   // 文昌貴人 - 학문, 시험

export type DivineKillerResult = {
  type: DivineKillerType;
  triggerBranch: EarthlyBranch;    // 신살을 유발하는 기준 지지
  targetBranch: EarthlyBranch;     // 신살이 해당되는 지지
  position: string;                 // 해당 지지의 위치 (year, month, day, hour)
  basedOn: string;                  // 기준 설명 (일지 기준, 일간 기준 등)
  description: string;              // 한글 설명
};

// ========== 삼합국 기반 지지 그룹 ==========
// 도화살, 역마살, 화개살, 겁살, 재살의 기준
type TriadGroup = "申子辰" | "寅午戌" | "巳酉丑" | "亥卯未";

/** 지지 → 삼합국 매핑 */
function getTriadGroup(branch: EarthlyBranch): TriadGroup {
  const groups: Record<TriadGroup, EarthlyBranch[]> = {
    "申子辰": ["申", "子", "辰"],
    "寅午戌": ["寅", "午", "戌"],
    "巳酉丑": ["巳", "酉", "丑"],
    "亥卯未": ["亥", "卯", "未"],
  };

  for (const [group, members] of Object.entries(groups)) {
    if (members.includes(branch)) return group as TriadGroup;
  }

  // fallback - should never reach
  return "申子辰";
}

// ========== 도화살 (桃花殺) ==========
// 삼합국별 도화 지지: 申子辰→酉, 寅午戌→卯, 巳酉丑→午, 亥卯未→子
const PEACH_BLOSSOM: Record<TriadGroup, EarthlyBranch> = {
  "申子辰": "酉",
  "寅午戌": "卯",
  "巳酉丑": "午",
  "亥卯未": "子",
};

// ========== 역마살 (驛馬殺) ==========
// 申子辰→寅, 寅午戌→申, 巳酉丑→亥, 亥卯未→巳
const POST_HORSE: Record<TriadGroup, EarthlyBranch> = {
  "申子辰": "寅",
  "寅午戌": "申",
  "巳酉丑": "亥",
  "亥卯未": "巳",
};

// ========== 화개살 (華蓋殺) ==========
// 申子辰→辰, 寅午戌→戌, 巳酉丑→丑, 亥卯未→未
const CANOPY: Record<TriadGroup, EarthlyBranch> = {
  "申子辰": "辰",
  "寅午戌": "戌",
  "巳酉丑": "丑",
  "亥卯未": "未",
};

// ========== 겁살 (劫殺) ==========
// 申子辰→巳, 寅午戌→亥, 巳酉丑→寅, 亥卯未→申
const ROBBERY: Record<TriadGroup, EarthlyBranch> = {
  "申子辰": "巳",
  "寅午戌": "亥",
  "巳酉丑": "寅",
  "亥卯未": "申",
};

// ========== 재살 (災殺) ==========
// 申子辰→午, 寅午戌→子, 巳酉丑→卯, 亥卯未→酉
const DISASTER: Record<TriadGroup, EarthlyBranch> = {
  "申子辰": "午",
  "寅午戌": "子",
  "巳酉丑": "卯",
  "亥卯未": "酉",
};

// ========== 귀문관살 (鬼門關殺) ==========
// 일지 기준으로 판별. 일반적으로 다음과 같이 정의:
// 子→丑, 丑→子, 寅→未, 卯→午, 辰→巳, 巳→辰, 午→卯, 未→寅, 申→酉, 酉→申, 戌→亥, 亥→戌
const GHOST_GATE: Record<EarthlyBranch, EarthlyBranch> = {
  "子": "丑",
  "丑": "子",
  "寅": "未",
  "卯": "午",
  "辰": "巳",
  "巳": "辰",
  "午": "卯",
  "未": "寅",
  "申": "酉",
  "酉": "申",
  "戌": "亥",
  "亥": "戌",
};

// ========== 천을귀인 (天乙貴人) ==========
// 일간(日干) 기준:
// 甲戊庚→丑未, 乙己→子申, 丙丁→亥酉, 壬癸→卯巳, 辛→午寅
const HEAVENLY_NOBLE: Record<HeavenlyStem, EarthlyBranch[]> = {
  "甲": ["丑", "未"],
  "戊": ["丑", "未"],
  "庚": ["丑", "未"],
  "乙": ["子", "申"],
  "己": ["子", "申"],
  "丙": ["亥", "酉"],
  "丁": ["亥", "酉"],
  "壬": ["卯", "巳"],
  "癸": ["卯", "巳"],
  "辛": ["午", "寅"],
};

// ========== 문창귀인 (文昌貴人) ==========
// 일간(日干) 기준:
// 甲→巳, 乙→午, 丙→申, 丁→酉, 戊→申, 己→酉, 庚→亥, 辛→子, 壬→寅, 癸→卯
const LITERARY_NOBLE: Record<HeavenlyStem, EarthlyBranch> = {
  "甲": "巳",
  "乙": "午",
  "丙": "申",
  "丁": "酉",
  "戊": "申",
  "己": "酉",
  "庚": "亥",
  "辛": "子",
  "壬": "寅",
  "癸": "卯",
};

// ========== 위치 정보 ==========
const PILLAR_KEYS = ["year", "month", "day", "hour"] as const;

function getBranches(chart: ChartResult): { branch: EarthlyBranch; position: string }[] {
  return PILLAR_KEYS.map(key => ({
    branch: chart.pillars[key].branch as EarthlyBranch,
    position: key,
  }));
}

// ========== 삼합국 기반 신살 분석 (일지 기준) ==========

function analyzeTriadBasedKillers(
  chart: ChartResult,
  killerMap: Record<TriadGroup, EarthlyBranch>,
  killerType: DivineKillerType,
  killerLabel: string
): DivineKillerResult[] {
  const results: DivineKillerResult[] = [];
  const dayBranch = chart.pillars.day.branch as EarthlyBranch;
  const triadGroup = getTriadGroup(dayBranch);
  const targetBranch = killerMap[triadGroup];
  const branches = getBranches(chart);

  for (const { branch, position } of branches) {
    // 일지 자체는 기준이므로 건너뜀 (단, 화개살 등에서는 일지에도 해당 가능)
    if (branch === targetBranch) {
      results.push({
        type: killerType,
        triggerBranch: dayBranch,
        targetBranch: branch,
        position,
        basedOn: `일지(${dayBranch}) 기준 ${triadGroup}국`,
        description: `${killerLabel}: ${position}지 ${branch}에 해당 (일지 ${dayBranch} 기준)`,
      });
    }
  }

  return results;
}

// ========== 메인 분석 함수 ==========

/**
 * 사주의 신살(神殺)을 결정론적으로 분석한다.
 * 일지(日支) 기준: 도화살, 역마살, 화개살, 귀문관살, 겁살, 재살
 * 일간(日干) 기준: 천을귀인, 문창귀인
 */
export function analyzeDivineKillers(chart: ChartResult): DivineKillerResult[] {
  const results: DivineKillerResult[] = [];
  const dayBranch = chart.pillars.day.branch as EarthlyBranch;
  const dayStem = chart.dayMaster.stem as HeavenlyStem;
  const branches = getBranches(chart);

  // 1. 도화살 (桃花殺) - 일지 기준
  results.push(...analyzeTriadBasedKillers(chart, PEACH_BLOSSOM, "도화살", "도화살(桃花殺)"));

  // 2. 역마살 (驛馬殺) - 일지 기준
  results.push(...analyzeTriadBasedKillers(chart, POST_HORSE, "역마살", "역마살(驛馬殺)"));

  // 3. 화개살 (華蓋殺) - 일지 기준
  results.push(...analyzeTriadBasedKillers(chart, CANOPY, "화개살", "화개살(華蓋殺)"));

  // 4. 겁살 (劫殺) - 일지 기준
  results.push(...analyzeTriadBasedKillers(chart, ROBBERY, "겁살", "겁살(劫殺)"));

  // 5. 재살 (災殺) - 일지 기준
  results.push(...analyzeTriadBasedKillers(chart, DISASTER, "재살", "재살(災殺)"));

  // 6. 귀문관살 (鬼門關殺) - 일지 기준
  const ghostTarget = GHOST_GATE[dayBranch];
  for (const { branch, position } of branches) {
    if (branch === ghostTarget) {
      results.push({
        type: "귀문관살",
        triggerBranch: dayBranch,
        targetBranch: branch,
        position,
        basedOn: `일지(${dayBranch}) 기준`,
        description: `귀문관살(鬼門關殺): ${position}지 ${branch}에 해당 (일지 ${dayBranch} 기준)`,
      });
    }
  }

  // 7. 천을귀인 (天乙貴人) - 일간 기준
  const nobleBranches = HEAVENLY_NOBLE[dayStem];
  for (const { branch, position } of branches) {
    if (nobleBranches.includes(branch)) {
      results.push({
        type: "천을귀인",
        triggerBranch: dayBranch,
        targetBranch: branch,
        position,
        basedOn: `일간(${dayStem}) 기준`,
        description: `천을귀인(天乙貴人): ${position}지 ${branch}에 해당 (일간 ${dayStem} 기준)`,
      });
    }
  }

  // 8. 문창귀인 (文昌貴人) - 일간 기준
  const literaryTarget = LITERARY_NOBLE[dayStem];
  for (const { branch, position } of branches) {
    if (branch === literaryTarget) {
      results.push({
        type: "문창귀인",
        triggerBranch: dayBranch,
        targetBranch: branch,
        position,
        basedOn: `일간(${dayStem}) 기준`,
        description: `문창귀인(文昌貴人): ${position}지 ${branch}에 해당 (일간 ${dayStem} 기준)`,
      });
    }
  }

  return results;
}

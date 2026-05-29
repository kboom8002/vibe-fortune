/**
 * 십신(十神) 계산 모듈
 *
 * 일간(日干)과 다른 천간의 오행·음양 관계로 십신을 결정론적으로 산출한다.
 * LLM 호출 없이 순수 결정론적 계산만 수행한다.
 */

import {
  HeavenlyStem,
  EarthlyBranch,
  STEM_ELEMENTS,
  STEM_POLARITIES,
  BRANCH_MAIN_ELEMENTS,
  BRANCH_POLARITIES,
  HIDDEN_STEMS,
} from "./constants";
import { ChartResult } from "./types";

// 십신 이름 타입
export type TenGodName =
  | "비견"  // 比肩 - 같은 오행, 같은 음양
  | "겁재"  // 劫財 - 같은 오행, 다른 음양
  | "식신"  // 食神 - 내가 생하는 오행, 같은 음양
  | "상관"  // 傷官 - 내가 생하는 오행, 다른 음양
  | "편재"  // 偏財 - 내가 극하는 오행, 같은 음양
  | "정재"  // 正財 - 내가 극하는 오행, 다른 음양
  | "편관"  // 偏官/七殺 - 나를 극하는 오행, 같은 음양
  | "정관"  // 正官 - 나를 극하는 오행, 다른 음양
  | "편인"  // 偏印/梟神 - 나를 생하는 오행, 같은 음양
  | "정인"; // 正印 - 나를 생하는 오행, 다른 음양

type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

/**
 * 오행 상생 관계 맵
 * key가 생하는(generates) 대상 = value
 * 木→火, 火→土, 土→金, 金→水, 水→木
 */
const GENERATES: Record<FiveElement, FiveElement> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

/**
 * 오행 상극 관계 맵
 * key가 극하는(controls) 대상 = value
 * 木→土, 土→水, 水→火, 火→金, 金→木
 */
const CONTROLS: Record<FiveElement, FiveElement> = {
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
};

/**
 * 두 오행 사이의 관계를 판별한다.
 * @returns "same" | "generates" | "generated_by" | "controls" | "controlled_by"
 */
function getElementRelation(
  dayMasterElement: FiveElement,
  targetElement: FiveElement
): "same" | "generates" | "generated_by" | "controls" | "controlled_by" {
  if (dayMasterElement === targetElement) return "same";
  if (GENERATES[dayMasterElement] === targetElement) return "generates";
  if (GENERATES[targetElement] === dayMasterElement) return "generated_by";
  if (CONTROLS[dayMasterElement] === targetElement) return "controls";
  // controlled_by
  return "controlled_by";
}

/**
 * 일간과 대상 천간 사이의 십신을 결정론적으로 계산한다.
 *
 * 관계 규칙:
 * - 같은 오행(same): 같은 음양 → 비견, 다른 음양 → 겁재
 * - 내가 생(generates): 같은 음양 → 식신, 다른 음양 → 상관
 * - 내가 극(controls): 같은 음양 → 편재, 다른 음양 → 정재
 * - 나를 극(controlled_by): 같은 음양 → 편관, 다른 음양 → 정관
 * - 나를 생(generated_by): 같은 음양 → 편인, 다른 음양 → 정인
 */
export function calculateTenGods(
  dayMasterStem: HeavenlyStem,
  targetStem: HeavenlyStem
): TenGodName {
  const dmElement = STEM_ELEMENTS[dayMasterStem];
  const targetElement = STEM_ELEMENTS[targetStem];
  const isSamePolarity = STEM_POLARITIES[dayMasterStem] === STEM_POLARITIES[targetStem];

  const relation = getElementRelation(dmElement, targetElement);

  switch (relation) {
    case "same":
      return isSamePolarity ? "비견" : "겁재";
    case "generates":
      return isSamePolarity ? "식신" : "상관";
    case "controls":
      return isSamePolarity ? "편재" : "정재";
    case "controlled_by":
      return isSamePolarity ? "편관" : "정관";
    case "generated_by":
      return isSamePolarity ? "편인" : "정인";
  }
}

/**
 * 지지의 본기(main element)와 음양을 기반으로 십신을 계산한다.
 * 지지는 천간이 아니므로, 본기 오행과 본기 음양을 사용한다.
 */
export function calculateTenGodsForBranch(
  dayMasterStem: HeavenlyStem,
  targetBranch: EarthlyBranch
): TenGodName {
  const dmElement = STEM_ELEMENTS[dayMasterStem];
  const targetElement = BRANCH_MAIN_ELEMENTS[targetBranch];
  const dmPolarity = STEM_POLARITIES[dayMasterStem];
  const branchPolarity = BRANCH_POLARITIES[targetBranch];
  const isSamePolarity = dmPolarity === branchPolarity;

  const relation = getElementRelation(dmElement, targetElement);

  switch (relation) {
    case "same":
      return isSamePolarity ? "비견" : "겁재";
    case "generates":
      return isSamePolarity ? "식신" : "상관";
    case "controls":
      return isSamePolarity ? "편재" : "정재";
    case "controlled_by":
      return isSamePolarity ? "편관" : "정관";
    case "generated_by":
      return isSamePolarity ? "편인" : "정인";
  }
}

/**
 * 사주 전체 8글자에 대한 십신을 계산한다.
 * 일간(dayStem) 자체는 "일주"로 표시, 나머지 7개에 대해 십신 산출.
 *
 * 반환 키: yearStem, yearBranch, monthStem, monthBranch, dayStem, dayBranch, hourStem, hourBranch
 */
export function calculateAllTenGods(chart: ChartResult): Record<string, string> {
  const dm = chart.dayMaster.stem as HeavenlyStem;

  return {
    yearStem: calculateTenGods(dm, chart.pillars.year.stem as HeavenlyStem),
    yearBranch: calculateTenGodsForBranch(dm, chart.pillars.year.branch as EarthlyBranch),
    monthStem: calculateTenGods(dm, chart.pillars.month.stem as HeavenlyStem),
    monthBranch: calculateTenGodsForBranch(dm, chart.pillars.month.branch as EarthlyBranch),
    dayStem: "일주", // 일간 자신은 십신 판단 대상이 아님
    dayBranch: calculateTenGodsForBranch(dm, chart.pillars.day.branch as EarthlyBranch),
    hourStem: calculateTenGods(dm, chart.pillars.hour.stem as HeavenlyStem),
    hourBranch: calculateTenGodsForBranch(dm, chart.pillars.hour.branch as EarthlyBranch),
  };
}

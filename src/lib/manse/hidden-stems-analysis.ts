/**
 * 지장간(支藏干) 분석 모듈
 *
 * 사주 내 각 지지에 숨어있는 천간(지장간)을 추출하고,
 * 각 지장간과 일간의 십신 관계를 결정론적으로 분석한다.
 * LLM 호출 없이 순수 결정론적 계산만 수행한다.
 */

import {
  HeavenlyStem,
  EarthlyBranch,
  HIDDEN_STEMS,
  STEM_ELEMENTS,
  STEM_POLARITIES,
} from "./constants";
import { ChartResult } from "./types";
import { calculateTenGods, TenGodName } from "./ten-gods";

// ========== 타입 정의 ==========

/** 개별 지장간 상세 정보 */
export type HiddenStemDetail = {
  stem: HeavenlyStem;              // 지장간 천간
  element: string;                  // 오행
  polarity: "yin" | "yang";        // 음양
  tenGod: TenGodName;             // 일간 대비 십신
  role: "본기" | "중기" | "여기";  // 본기/중기/여기 역할
  weight: number;                   // 에너지 비중 (0~1)
};

/** 한 지지의 지장간 분석 결과 */
export type HiddenStemAnalysis = {
  position: string;                 // year, month, day, hour
  branch: EarthlyBranch;           // 해당 지지
  hiddenStems: HiddenStemDetail[];  // 지장간 상세 목록
};

// ========== 지장간 에너지 비중 ==========
/**
 * 지장간의 에너지 배분 비중
 * 본기(主氣): 가장 큰 비중
 * 중기(中氣): 중간 비중
 * 여기(餘氣): 가장 작은 비중
 *
 * 지장간 배열에서 마지막이 본기, 첫 번째가 여기
 * 2개: [여기, 본기]
 * 3개: [여기, 중기, 본기]
 */
function getHiddenStemWeights(count: number): number[] {
  switch (count) {
    case 1:
      return [1.0];
    case 2:
      return [0.3, 0.7]; // 여기 30%, 본기 70%
    case 3:
      return [0.18, 0.28, 0.54]; // 여기 18%, 중기 28%, 본기 54%
    default:
      return Array(count).fill(1.0 / count);
  }
}

/**
 * 지장간의 역할명을 반환한다.
 * 배열에서의 위치에 따라 여기/중기/본기를 결정.
 */
function getHiddenStemRole(index: number, total: number): "본기" | "중기" | "여기" {
  if (total === 1) return "본기";
  if (total === 2) {
    return index === 0 ? "여기" : "본기";
  }
  // total === 3
  if (index === 0) return "여기";
  if (index === 1) return "중기";
  return "본기";
}

// ========== 메인 분석 함수 ==========

/**
 * 사주 전체의 지장간을 분석한다.
 * 각 지지의 지장간을 추출하고, 일간과의 십신 관계를 계산한다.
 *
 * @param chart - 사주명식 결과
 * @returns 4개의 지지 각각에 대한 지장간 분석 결과
 */
export function analyzeHiddenStems(chart: ChartResult): HiddenStemAnalysis[] {
  const dayMasterStem = chart.dayMaster.stem as HeavenlyStem;
  const pillarKeys = ["year", "month", "day", "hour"] as const;

  return pillarKeys.map(key => {
    const branch = chart.pillars[key].branch as EarthlyBranch;
    const stems = HIDDEN_STEMS[branch];
    const weights = getHiddenStemWeights(stems.length);

    const hiddenStemDetails: HiddenStemDetail[] = stems.map((stem, index) => ({
      stem,
      element: STEM_ELEMENTS[stem],
      polarity: STEM_POLARITIES[stem],
      tenGod: calculateTenGods(dayMasterStem, stem),
      role: getHiddenStemRole(index, stems.length),
      weight: weights[index],
    }));

    return {
      position: key,
      branch,
      hiddenStems: hiddenStemDetails,
    };
  });
}

/**
 * 특정 지지 한 개의 지장간을 분석한다.
 * 대운, 세운 등 외부 지지의 지장간 분석에 사용.
 *
 * @param dayMasterStem - 일간
 * @param branch - 분석할 지지
 * @returns 지장간 상세 목록
 */
export function analyzeHiddenStemsForBranch(
  dayMasterStem: HeavenlyStem,
  branch: EarthlyBranch
): HiddenStemDetail[] {
  const stems = HIDDEN_STEMS[branch];
  const weights = getHiddenStemWeights(stems.length);

  return stems.map((stem, index) => ({
    stem,
    element: STEM_ELEMENTS[stem],
    polarity: STEM_POLARITIES[stem],
    tenGod: calculateTenGods(dayMasterStem, stem),
    role: getHiddenStemRole(index, stems.length),
    weight: weights[index],
  }));
}

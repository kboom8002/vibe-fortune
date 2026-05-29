import { Solar } from "lunar-javascript";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_ELEMENTS,
  STEM_POLARITIES,
  BRANCH_MAIN_ELEMENTS,
  HIDDEN_STEMS,
  DEFAULT_MANSE_POLICY,
  HeavenlyStem,
  EarthlyBranch,
} from "./constants";
import {
  CalculateChartInput,
  ChartResult,
  CalculateMajorLuckInput,
  MajorLuckResult,
  CalculateAnnualLuckInput,
  AnnualLuckResult,
  CalculateDailyLuckRangeInput,
  DailyLuckRangeResult,
  CalculateMonthlyLuckInput,
  MonthlyLuckResult,
} from "./types";
import { ManseWarning } from "@/schemas/manse-chart.schema";
import { ProvidedChartSchema } from "@/schemas/birth-profile.schema";
import { z } from "zod";
import { calculateDayMasterStrengthAndYongSin } from "./strength-yongsin";


// Helper to format ISO datetime into target timezone parts
function getLocalTimeParts(birthDateTime: string, timezone: string) {
  const d = new Date(birthDateTime);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)!.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour") % 24,
    minute: getPart("minute"),
  };
}

// 10대 천간 십성 계산기
function calculateTenGod(dm: HeavenlyStem, other: HeavenlyStem): string {
  const dmElem = STEM_ELEMENTS[dm];
  const otherElem = STEM_ELEMENTS[other];
  const dmPol = STEM_POLARITIES[dm];
  const otherPol = STEM_POLARITIES[other];

  const isSamePol = dmPol === otherPol;

  if (dmElem === "wood") {
    if (otherElem === "wood") return isSamePol ? "비견" : "겁재";
    if (otherElem === "fire") return isSamePol ? "식신" : "상관";
    if (otherElem === "earth") return isSamePol ? "편재" : "정재";
    if (otherElem === "metal") return isSamePol ? "편관" : "정관";
    if (otherElem === "water") return isSamePol ? "편인" : "정인";
  }
  if (dmElem === "fire") {
    if (otherElem === "fire") return isSamePol ? "비견" : "겁재";
    if (otherElem === "earth") return isSamePol ? "식신" : "상관";
    if (otherElem === "metal") return isSamePol ? "편재" : "정재";
    if (otherElem === "water") return isSamePol ? "편관" : "정관";
    if (otherElem === "wood") return isSamePol ? "편인" : "정인";
  }
  if (dmElem === "earth") {
    if (otherElem === "earth") return isSamePol ? "비견" : "겁재";
    if (otherElem === "metal") return isSamePol ? "식신" : "상관";
    if (otherElem === "water") return isSamePol ? "편재" : "정재";
    if (otherElem === "wood") return isSamePol ? "편관" : "정관";
    if (otherElem === "fire") return isSamePol ? "편인" : "정인";
  }
  if (dmElem === "metal") {
    if (otherElem === "metal") return isSamePol ? "비견" : "겁재";
    if (otherElem === "water") return isSamePol ? "식신" : "상관";
    if (otherElem === "wood") return isSamePol ? "편재" : "정재";
    if (otherElem === "fire") return isSamePol ? "편관" : "정관";
    if (otherElem === "earth") return isSamePol ? "편인" : "정인";
  }
  if (dmElem === "water") {
    if (otherElem === "water") return isSamePol ? "비견" : "겁재";
    if (otherElem === "wood") return isSamePol ? "식신" : "상관";
    if (otherElem === "fire") return isSamePol ? "편재" : "정재";
    if (otherElem === "earth") return isSamePol ? "편관" : "정관";
    if (otherElem === "metal") return isSamePol ? "편인" : "정인";
  }
  return "";
}

/**
 * 4.1 calculateChart
 * 결정론적으로 사주명식을 산출한다.
 */
export function calculateChart(input: CalculateChartInput): ChartResult {
  const policy = input.policy || DEFAULT_MANSE_POLICY;
  const warnings: ManseWarning[] = [];

  // 타임존 경고 추가
  if (input.timezone !== "Asia/Seoul" && input.timezone !== "UTC") {
    warnings.push("TIMEZONE_UNCERTAIN");
  }

  // 성별 경고 추가
  if (!input.gender || input.gender === "unspecified" || input.gender === "other") {
    warnings.push("GENDER_UNSPECIFIED");
  }

  try {
    const { year, month, day, hour, minute } = getLocalTimeParts(input.birthDateTime, input.timezone);

    // solar-lunar 변환
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const yearStem = eightChar.getYearGan() as HeavenlyStem;
    const yearBranch = eightChar.getYearZhi() as EarthlyBranch;
    const monthStem = eightChar.getMonthGan() as HeavenlyStem;
    const monthBranch = eightChar.getMonthZhi() as EarthlyBranch;
    const dayStem = eightChar.getDayGan() as HeavenlyStem;
    const dayBranch = eightChar.getDayZhi() as EarthlyBranch;
    const hourStem = eightChar.getTimeGan() as HeavenlyStem;
    const hourBranch = eightChar.getTimeZhi() as EarthlyBranch;

    // 지장간 매핑
    const hiddenStems = {
      yearBranch: HIDDEN_STEMS[yearBranch],
      monthBranch: HIDDEN_STEMS[monthBranch],
      dayBranch: HIDDEN_STEMS[dayBranch],
      hourBranch: HIDDEN_STEMS[hourBranch],
    };

    // 오행 분포 계산 (Visible Stems + Branch Main + Hidden Stems)
    const dist = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    [yearStem, monthStem, dayStem, hourStem].forEach(s => {
      dist[STEM_ELEMENTS[s]] += 1.0;
    });
    [yearBranch, monthBranch, dayBranch, hourBranch].forEach(b => {
      dist[BRANCH_MAIN_ELEMENTS[b]] += 1.0;
    });
    [yearBranch, monthBranch, dayBranch, hourBranch].forEach(b => {
      HIDDEN_STEMS[b].forEach(hs => {
        dist[STEM_ELEMENTS[hs]] += 0.3;
      });
    });

    // 소수점 첫째자리 반올림
    const fiveElementDistribution = {
      wood: Math.round(dist.wood * 10) / 10,
      fire: Math.round(dist.fire * 10) / 10,
      earth: Math.round(dist.earth * 10) / 10,
      metal: Math.round(dist.metal * 10) / 10,
      water: Math.round(dist.water * 10) / 10,
    };

    // 일간 (Day Master)
    const strengthResult = calculateDayMasterStrengthAndYongSin(
      STEM_ELEMENTS[dayStem],
      fiveElementDistribution
    );

    const dayMaster = {
      stem: dayStem,
      element: STEM_ELEMENTS[dayStem],
      polarity: STEM_POLARITIES[dayStem],
      strength: {
        score: strengthResult.score,
        judgment: strengthResult.judgment,
      },
      yongSin: strengthResult.yongSin,
    };

    // 십성 계산
    const tenGods = {
      yearStem: calculateTenGod(dayStem, yearStem),
      yearBranch: calculateTenGod(dayStem, yearBranch as unknown as HeavenlyStem), // branch main element
      monthStem: calculateTenGod(dayStem, monthStem),
      monthBranch: calculateTenGod(dayStem, monthBranch as unknown as HeavenlyStem),
      dayBranch: calculateTenGod(dayStem, dayBranch as unknown as HeavenlyStem),
      hourStem: calculateTenGod(dayStem, hourStem),
      hourBranch: calculateTenGod(dayStem, hourBranch as unknown as HeavenlyStem),
    };

    const id = crypto.randomUUID();
    const birthProfileId = id; // placeholder or from profile

    const result: ChartResult = {
      id,
      userId: "local-user",
      birthProfileId,
      birthDateTime: input.birthDateTime,
      pillars: {
        year: { stem: yearStem, branch: yearBranch, label: yearStem + yearBranch },
        month: { stem: monthStem, branch: monthBranch, label: monthStem + monthBranch },
        day: { stem: dayStem, branch: dayBranch, label: dayStem + dayBranch },
        hour: { stem: hourStem, branch: hourBranch, label: hourStem + hourBranch },
      },
      dayMaster,
      tenGods,
      hiddenStems,
      fiveElementDistribution,
      calculationPolicy: policy,
      warnings,
      createdAt: new Date().toISOString(),
    };

    return result;
  } catch (err) {
    console.error("calculateChart error:", err);
    throw err;
  }
}

/**
 * 4.2 calculateMajorLuck
 * 대운 목록 및 시작나이를 산출한다.
 */
export function calculateMajorLuck(input: CalculateMajorLuckInput): MajorLuckResult {
  const policy = input.policy || DEFAULT_MANSE_POLICY;
  const warnings: ManseWarning[] = [...input.chart.warnings];

  // gender가 unspecified/other인 경우 male로 임시 계산
  const genderCode = input.gender === "female" ? 0 : 1;

  try {
    const { year, month, day, hour } = getLocalTimeParts(input.chart.birthDateTime, "Asia/Seoul");
    const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const yun = eightChar.getYun(genderCode);
    const rawDaYunList = yun.getDaYun();
    const daYunList = rawDaYunList.filter(dy => dy.getGanZhi() !== "");
    const startAge = daYunList[0] ? daYunList[0].getStartAge() : 1;

    const cycles = daYunList.map(dy => {
      const stem = dy.getGanZhi().substring(0, 1);
      const branch = dy.getGanZhi().substring(1, 2);
      return {
        stem,
        branch,
        ganzhi: dy.getGanZhi(),
        startAge: dy.getStartAge(),
      };
    });

    const yearStem = input.chart.pillars.year.stem;
    const yinyang = STEM_POLARITIES[yearStem as HeavenlyStem];
    const forward = (yinyang === "yang" && input.gender !== "female") || (yinyang === "yin" && input.gender === "female");

    return {
      id: crypto.randomUUID(),
      userId: input.chart.userId,
      birthProfileId: input.chart.birthProfileId,
      chartId: input.chart.id,
      direction: forward ? "forward" : "backward",
      startAge,
      cycles,
      calculationPolicy: policy,
      warnings,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("calculateMajorLuck error:", err);
    throw err;
  }
}

/**
 * 4.3 calculateAnnualLuck
 * 지정된 해의 세운(연운)을 산출한다.
 */
export function calculateAnnualLuck(input: CalculateAnnualLuckInput): AnnualLuckResult {
  const index = (input.year - 4) % 60;
  const normalizedIndex = index < 0 ? index + 60 : index;

  const stem = HEAVENLY_STEMS[normalizedIndex % 10];
  const branch = EARTHLY_BRANCHES[normalizedIndex % 12];

  return {
    year: input.year,
    pillar: {
      stem,
      branch,
      label: stem + branch,
    },
  };
}

/**
 * 4.3b calculateMonthlyLuck
 * 지정된 연/월의 월운을 결정론적으로 산출한다.
 * 양력 해당월 중순(15일) 기준으로 lunar-javascript를 통해 월간·월지를 산출.
 */
export function calculateMonthlyLuck(input: CalculateMonthlyLuckInput): MonthlyLuckResult {
  const { year, month } = input;

  // 해당 월의 중순(15일)을 기준으로 월주를 산출
  const solar = Solar.fromYmd(year, month, 15);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  const stem = eightChar.getMonthGan() as HeavenlyStem;
  const branch = eightChar.getMonthZhi() as EarthlyBranch;

  return {
    year,
    month,
    pillar: {
      stem,
      branch,
      label: stem + branch,
    },
  };
}

/**
 * 4.4 calculateDailyLuckRange
 * 주어진 범위 내 일운(일주) 목록을 산출한다.
 */
export function calculateDailyLuckRange(input: CalculateDailyLuckRangeInput): DailyLuckRangeResult {
  const startDate = new Date(input.from);
  const endDate = new Date(input.to);
  const days: DailyLuckRangeResult["days"] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();

    const solar = Solar.fromYmd(y, m, day);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const stem = eightChar.getDayGan() as HeavenlyStem;
    const branch = eightChar.getDayZhi() as EarthlyBranch;

    days.push({
      date: d.toISOString().split("T")[0],
      pillar: {
        stem,
        branch,
        label: stem + branch,
      },
    });
  }

  return { days };
}

/**
 * 4.5 checkChartConsistency
 * 계산값과 사용자 제공 사주명식 간의 정합성을 검증한다.
 */
export function checkChartConsistency(
  calculated: ChartResult,
  provided?: z.infer<typeof ProvidedChartSchema>
): {
  status: "matched" | "mismatched" | "not_provided" | "calculation_failed";
  mismatchedFields?: ("year" | "month" | "day" | "hour")[];
  canonicalSource: "calculated" | "user_provided";
  note?: string;
} {
  if (!provided || (!provided.yearPillar && !provided.monthPillar && !provided.dayPillar && !provided.hourPillar)) {
    return {
      status: "not_provided",
      canonicalSource: "calculated",
      note: "사용자 제공 사주명식이 없습니다.",
    };
  }

  const mismatchedFields: ("year" | "month" | "day" | "hour")[] = [];

  if (provided.yearPillar && provided.yearPillar !== calculated.pillars.year.label) {
    mismatchedFields.push("year");
  }
  if (provided.monthPillar && provided.monthPillar !== calculated.pillars.month.label) {
    mismatchedFields.push("month");
  }
  if (provided.dayPillar && provided.dayPillar !== calculated.pillars.day.label) {
    mismatchedFields.push("day");
  }
  if (provided.hourPillar && provided.hourPillar !== calculated.pillars.hour.label) {
    mismatchedFields.push("hour");
  }

  const status = mismatchedFields.length > 0 ? "mismatched" : "matched";

  return {
    status,
    mismatchedFields: mismatchedFields.length > 0 ? mismatchedFields : undefined,
    canonicalSource: status === "mismatched" ? "user_provided" : "calculated",
    note: status === "mismatched"
      ? `사주 입력 정합성 불일치: [${mismatchedFields.join(", ")}] 필드가 계산 결과와 다릅니다. 사용자 입력을 정본으로 간주합니다.`
      : "계산값과 사용자 제공 사주명식이 일치합니다.",
  };
}

// ========== 신규 모듈 re-export ==========
export { calculateTenGods, calculateAllTenGods, calculateTenGodsForBranch } from "./ten-gods";
export type { TenGodName } from "./ten-gods";

export { analyzeInteractions } from "./interactions";
export type { InteractionResult, InteractionType } from "./interactions";

export { analyzeDivineKillers } from "./divine-killers";
export type { DivineKillerResult, DivineKillerType } from "./divine-killers";

export { analyzeHiddenStems, analyzeHiddenStemsForBranch } from "./hidden-stems-analysis";
export type { HiddenStemAnalysis, HiddenStemDetail } from "./hidden-stems-analysis";

export { calculateDayMasterStrengthAndYongSin } from "./strength-yongsin";
export { analyzePeriodInteractions } from "./period-interactions";




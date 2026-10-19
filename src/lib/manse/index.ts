import { Solar } from "lunar-javascript";
import {
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  STEM_ELEMENTS,
  STEM_POLARITIES,
  BRANCH_MAIN_ELEMENTS,
  BRANCH_ELEMENTS,
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
import {
  calculateTenGods,
  calculateTenGodsForBranch,
  calculateAllTenGods,
} from "./ten-gods";

function createPillar(stem: HeavenlyStem, branch: EarthlyBranch) {
  return {
    stem,
    branch,
    label: `${stem}${branch}`,
  };
}

// Helper to format ISO datetime into target timezone parts
function getLocalTimeParts(birthDateTime: string, timezone: string) {
  const effectiveTimezone = timezone || "Asia/Seoul";
  const d = new Date(birthDateTime);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: effectiveTimezone,
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

/**
 * 4.1 calculateChart
 * 결정론적으로 사주명식을 산출한다.
 */
export function calculateChart(input: CalculateChartInput): ChartResult {
  const policy = input.policy || DEFAULT_MANSE_POLICY;
  const warnings: ManseWarning[] = [];

  // 타임존 경고 추가
  if (!input.timezone || (input.timezone !== "Asia/Seoul" && input.timezone !== "UTC")) {
    warnings.push("TIMEZONE_UNCERTAIN");
  }

  // 성별 경고 추가
  if (!input.gender || input.gender === "unspecified" || input.gender === "other") {
    warnings.push("GENDER_UNSPECIFIED");
  }

  // 진태양시 비활성화 정책 경고
  if (policy.trueSolarTime === false) {
    warnings.push("TRUE_SOLAR_TIME_DISABLED");
  }

  try {
    const { year, month, day, hour, minute } = getLocalTimeParts(
      input.birthDateTime,
      input.timezone || "Asia/Seoul"
    );

    // 야자시(23시) 정책 경고
    if (policy.nightZiPolicy === "disabled" && hour === 23) {
      warnings.push("NIGHT_ZI_DISABLED");
      warnings.push("POLICY_VARIANT_MAY_DIFFER");
    }

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

    // 일간 (Day Master) — 5개 인자 모두 전달 (월령 가중치 및 통근 보너스 반영)
    const dayElement = STEM_ELEMENTS[dayStem];
    const elementProfile = fiveElementDistribution;
    const strengthResult = calculateDayMasterStrengthAndYongSin(
      dayElement,
      elementProfile,
      dayStem,
      BRANCH_ELEMENTS[monthBranch],
      [yearBranch, monthBranch, dayBranch, hourBranch]
    );

    const dayMaster = {
      stem: dayStem,
      element: dayElement,
      polarity: STEM_POLARITIES[dayStem],
      strength: {
        score: strengthResult.score,
        judgment: strengthResult.judgment,
      },
      yongSin: strengthResult.yongSin,
    };

    // 십성 계산 (천간 + 지지 본기 십신 모두 산출)
    const tenGods = {
      yearStem: calculateTenGods(dayStem, yearStem),
      yearBranch: calculateTenGodsForBranch(dayStem, yearBranch),
      monthStem: calculateTenGods(dayStem, monthStem),
      monthBranch: calculateTenGodsForBranch(dayStem, monthBranch),
      dayStem: "일주",
      dayBranch: calculateTenGodsForBranch(dayStem, dayBranch),
      hourStem: calculateTenGods(dayStem, hourStem),
      hourBranch: calculateTenGodsForBranch(dayStem, hourBranch),
    };

    const id = crypto.randomUUID();
    const birthProfileId = id; // placeholder or from profile

    const result: ChartResult = {
      id,
      userId: "local-user",
      birthProfileId,
      birthDateTime: input.birthDateTime,
      pillars: {
        year: createPillar(yearStem, yearBranch),
        month: createPillar(monthStem, monthBranch),
        day: createPillar(dayStem, dayBranch),
        hour: createPillar(hourStem, hourBranch),
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
    const { year, month, day, hour, minute } = getLocalTimeParts(
      input.chart.birthDateTime,
      "Asia/Seoul"
    );
    const solar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const yun = eightChar.getYun(genderCode);
    const rawDaYunList = yun.getDaYun();
    const daYunList = rawDaYunList.filter(dy => dy.getGanZhi() !== "");
    const startAge = daYunList[0] ? daYunList[0].getStartAge() : 1;

    const cycles = daYunList.map((dy, i) => {
      const stem = dy.getGanZhi().substring(0, 1) as HeavenlyStem;
      const branch = dy.getGanZhi().substring(1, 2) as EarthlyBranch;
      const cycleStartAge = dy.getStartAge();
      const startYear =
        typeof (dy as any).getStartYear === "function"
          ? (dy as any).getStartYear()
          : year + cycleStartAge - 1;
      const startDate = `${startYear}-01-01`;

      return {
        index: i,
        ageFrom: cycleStartAge,
        ageTo: cycleStartAge + 9,
        dateFrom: startDate,
        pillar: createPillar(stem, branch),
        stem,
        branch,
        ganzhi: dy.getGanZhi(),
        stemElement: STEM_ELEMENTS[stem],
        branchElement: BRANCH_ELEMENTS[branch],
        startAge: cycleStartAge,
        endAge: cycleStartAge + 9,
        startDate,
      };
    });

    const yearStem = input.chart.pillars.year.stem;
    const yinyang = STEM_POLARITIES[yearStem as HeavenlyStem];
    const forward =
      (yinyang === "yang" && input.gender !== "female") ||
      (yinyang === "yin" && input.gender === "female");

    return {
      id: crypto.randomUUID(),
      userId: input.chart.userId,
      birthProfileId: input.chart.birthProfileId,
      chartId: input.chart.id,
      direction: forward ? "forward" : "backward",
      startAge,
      startDate: cycles[0]?.startDate,
      cycles,
      periods: cycles,
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
export function calculateAnnualLuck(inputOrYear: CalculateAnnualLuckInput | number): AnnualLuckResult {
  const year = typeof inputOrYear === "number" ? inputOrYear : inputOrYear.year;
  const index = (year - 4) % 60;
  const normalizedIndex = index < 0 ? index + 60 : index;

  const stem = HEAVENLY_STEMS[normalizedIndex % 10];
  const branch = EARTHLY_BRANCHES[normalizedIndex % 12];

  return {
    year,
    pillar: {
      stem,
      branch,
      label: stem + branch,
    },
  };
}

/**
 * 4.3b calculateMonthlyLuck
 * 지정된 연/월(/일)의 월운을 결정론적으로 산출한다.
 * 기본값은 해당월 중순(15일)이며, day를 지정하면 절기 경계를 반영한다.
 */
export function calculateMonthlyLuck(
  inputOrYear: CalculateMonthlyLuckInput | number,
  monthArg?: number,
  dayArg: number = 15
): MonthlyLuckResult {
  const year = typeof inputOrYear === "number" ? inputOrYear : inputOrYear.year;
  const month = typeof inputOrYear === "number" ? monthArg! : inputOrYear.month;
  const day = typeof inputOrYear === "number" ? dayArg : (inputOrYear.day ?? 15);

  const solar = Solar.fromYmd(year, month, day);
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
 * YYYY-MM-DD를 Date.UTC로 파싱하여 로컬/UTC 타임존 혼용으로 인한 날짜 밀림을 방지한다.
 */
export function calculateDailyLuckRange(input: CalculateDailyLuckRangeInput): DailyLuckRangeResult {
  const parseYmdUtc = (dateStr: string): number => {
    const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };

  const startMs = parseYmdUtc(input.from);
  const endMs = parseYmdUtc(input.to);
  const days: DailyLuckRangeResult["days"] = [];

  for (let ms = startMs; ms <= endMs; ms += 86400_000) {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();

    const solar = Solar.fromYmd(y, m, day);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();

    const stem = eightChar.getDayGan() as HeavenlyStem;
    const branch = eightChar.getDayZhi() as EarthlyBranch;

    const dateFormatted = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    days.push({
      date: dateFormatted,
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




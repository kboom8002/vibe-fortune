import { describe, it, expect } from "vitest";
import {
  calculateChart,
  calculateMajorLuck,
  calculateAnnualLuck,
  calculateMonthlyLuck,
  calculateDailyLuckRange,
  checkChartConsistency,
} from "@/lib/manse";
import { DEFAULT_MANSE_POLICY } from "@/lib/manse/constants";
import referenceCases from "./reference-cases.sample.json";

const VALID_TEN_GODS = [
  "비견",
  "겁재",
  "식신",
  "상관",
  "편재",
  "정재",
  "편관",
  "정관",
  "편인",
  "정인",
];

describe("Manse Engine Tests", () => {
  // CASE-0001: 1990-05-01 14:30:00 KST
  it("calculates chart correctly for normal case (CASE-0001)", () => {
    const input = {
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male" as const,
      policy: DEFAULT_MANSE_POLICY,
    };

    const chart = calculateChart(input);

    expect(chart.pillars.year.label).toBe("庚午");
    expect(chart.pillars.month.label).toBe("庚辰");
    expect(chart.pillars.day.label).toBe("丙寅");
    expect(chart.pillars.hour.label).toBe("乙未");

    expect(chart.dayMaster.stem).toBe("丙");
    expect(chart.dayMaster.element).toBe("fire");
    expect(chart.dayMaster.polarity).toBe("yang");

    expect(chart.fiveElementDistribution.wood).toBeGreaterThan(0);
    expect(chart.fiveElementDistribution.fire).toBeGreaterThan(0);
    expect(chart.fiveElementDistribution.earth).toBeGreaterThan(0);
    expect(chart.fiveElementDistribution.metal).toBeGreaterThan(0);
    expect(chart.fiveElementDistribution.water).toBeGreaterThan(0);
  });

  it("populates non-empty valid Korean Ten-Gods for all stems and branches", () => {
    const chart = calculateChart({
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male",
      policy: DEFAULT_MANSE_POLICY,
    });

    expect(VALID_TEN_GODS).toContain(chart.tenGods.yearStem);
    expect(VALID_TEN_GODS).toContain(chart.tenGods.yearBranch);
    expect(VALID_TEN_GODS).toContain(chart.tenGods.monthStem);
    expect(VALID_TEN_GODS).toContain(chart.tenGods.monthBranch);
    expect(VALID_TEN_GODS).toContain(chart.tenGods.dayBranch);
    expect(VALID_TEN_GODS).toContain(chart.tenGods.hourStem);
    expect(VALID_TEN_GODS).toContain(chart.tenGods.hourBranch);

    // Specifically for 丙火 Day Master:
    // yearBranch 午(火, yin) -> 겁재, monthBranch 辰(土, yang) -> 식신, dayBranch 寅(木, yang) -> 편인, hourBranch 未(土, yin) -> 상관
    expect(chart.tenGods.yearBranch).toBe("겁재");
    expect(chart.tenGods.monthBranch).toBe("식신");
    expect(chart.tenGods.dayBranch).toBe("편인");
    expect(chart.tenGods.hourBranch).toBe("상관");
  });

  it("emits policy and input warnings (TRUE_SOLAR_TIME_DISABLED, NIGHT_ZI_DISABLED, GENDER_UNSPECIFIED, TIMEZONE_UNCERTAIN)", () => {
    const nightZiChart = calculateChart({
      birthDateTime: "1990-01-01T23:30:00-05:00",
      timezone: "America/New_York",
      gender: "unspecified",
      policy: DEFAULT_MANSE_POLICY,
    });

    expect(nightZiChart.warnings).toContain("TRUE_SOLAR_TIME_DISABLED");
    expect(nightZiChart.warnings).toContain("NIGHT_ZI_DISABLED");
    expect(nightZiChart.warnings).toContain("POLICY_VARIANT_MAY_DIFFER");
    expect(nightZiChart.warnings).toContain("GENDER_UNSPECIFIED");
    expect(nightZiChart.warnings).toContain("TIMEZONE_UNCERTAIN");
  });

  it("calculates Daeun major luck direction, start age, and enriched cycles/periods correctly", () => {
    const chartInput = {
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male" as const,
      policy: DEFAULT_MANSE_POLICY,
    };
    const chart = calculateChart(chartInput);
    const majorLuck = calculateMajorLuck({ chart, gender: "male", policy: DEFAULT_MANSE_POLICY });

    expect(majorLuck.direction).toBe("forward");
    expect(majorLuck.startAge).toBe(2);
    expect(majorLuck.cycles.length).toBeGreaterThan(5);
    expect(majorLuck.periods).toBeDefined();
    expect(majorLuck.periods?.length).toBe(majorLuck.cycles.length);

    const firstCycle = majorLuck.cycles[0];
    expect(firstCycle.ganzhi).toBe("辛巳");
    expect(firstCycle.index).toBe(0);
    expect(firstCycle.ageFrom).toBe(firstCycle.startAge);
    expect(firstCycle.ageTo).toBe(firstCycle.startAge + 9);
    expect(firstCycle.endAge).toBe(firstCycle.startAge + 9);
    expect(firstCycle.pillar?.label).toBe("辛巳");
    expect(firstCycle.stemElement).toBe("metal");
    expect(firstCycle.branchElement).toBe("fire");
  });

  it("calculates annual and monthly luck correctly (including optional day parameter)", () => {
    const annualLuck2026 = calculateAnnualLuck({ year: 2026 });
    expect(annualLuck2026.pillar.label).toBe("丙午");

    const monthlyDefault = calculateMonthlyLuck({ year: 2026, month: 2 });
    const monthlyBeforeLichun = calculateMonthlyLuck({ year: 2026, month: 2, day: 1 });
    expect(monthlyDefault.pillar.label).toBeDefined();
    expect(monthlyBeforeLichun.pillar.label).toBeDefined();
    expect(monthlyDefault.pillar.label).not.toBe(monthlyBeforeLichun.pillar.label);
  });

  it("calculates daily luck range deterministically without UTC/local date shift", () => {
    const dailyLuck = calculateDailyLuckRange({
      from: "2026-05-01",
      to: "2026-05-03",
      timezone: "Asia/Seoul",
    });

    expect(dailyLuck.days.length).toBe(3);
    expect(dailyLuck.days[0].date).toBe("2026-05-01");
    expect(dailyLuck.days[1].date).toBe("2026-05-02");
    expect(dailyLuck.days[2].date).toBe("2026-05-03");
    expect(dailyLuck.days[0].pillar.label).toBeDefined();
  });

  it("checks chart consistency correctly", () => {
    const chartInput = {
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male" as const,
      policy: DEFAULT_MANSE_POLICY,
    };
    const chart = calculateChart(chartInput);

    // Matched case
    const matched = checkChartConsistency(chart, {
      yearPillar: "庚午",
      monthPillar: "庚辰",
      dayPillar: "丙寅",
      hourPillar: "乙未",
    });
    expect(matched.status).toBe("matched");

    // Mismatched case
    const mismatched = checkChartConsistency(chart, {
      yearPillar: "己巳",
    });
    expect(mismatched.status).toBe("mismatched");
    expect(mismatched.mismatchedFields).toContain("year");
  });

  describe("Reference Cases Suite (reference-cases.sample.json)", () => {
    it("has at least 20 verified reference cases", () => {
      expect(referenceCases.length).toBeGreaterThanOrEqual(20);
    });

    for (const refCase of referenceCases) {
      it(`passes reference case ${refCase.id} (${refCase.notes})`, () => {
        const chart = calculateChart({
          birthDateTime: refCase.birthDateTime,
          timezone: refCase.timezone,
          gender: (refCase.gender as any) || "unspecified",
          policy: DEFAULT_MANSE_POLICY,
        });

        if (refCase.expected.yearPillar) {
          expect(chart.pillars.year.label).toBe(refCase.expected.yearPillar);
        }
        if (refCase.expected.monthPillar) {
          expect(chart.pillars.month.label).toBe(refCase.expected.monthPillar);
        }
        if (refCase.expected.dayPillar) {
          expect(chart.pillars.day.label).toBe(refCase.expected.dayPillar);
        }
        if (refCase.expected.hourPillar) {
          expect(chart.pillars.hour.label).toBe(refCase.expected.hourPillar);
        }
        if (refCase.expected.warning) {
          expect(chart.warnings).toContain(refCase.expected.warning);
        }
        if (refCase.providedChart && refCase.expected.consistencyStatus) {
          const consistency = checkChartConsistency(chart, refCase.providedChart);
          expect(consistency.status).toBe(refCase.expected.consistencyStatus);
        }
      });
    }
  });
});

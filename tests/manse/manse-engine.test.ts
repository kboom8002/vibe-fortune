import { describe, it, expect } from "vitest";
import {
  calculateChart,
  calculateMajorLuck,
  calculateAnnualLuck,
  calculateDailyLuckRange,
  checkChartConsistency,
} from "@/lib/manse";
import { DEFAULT_MANSE_POLICY } from "@/lib/manse/constants";

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

  it("calculates Daeun major luck direction and start age correctly", () => {
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
    expect(majorLuck.cycles[0].ganzhi).toBe("辛巳");
  });

  it("calculates annual luck correctly", () => {
    const annualLuck2026 = calculateAnnualLuck({ year: 2026 });
    expect(annualLuck2026.pillar.label).toBe("丙午");
  });

  it("calculates daily luck range correctly", () => {
    const dailyLuck = calculateDailyLuckRange({
      from: "2026-05-01",
      to: "2026-05-03",
      timezone: "Asia/Seoul",
    });

    expect(dailyLuck.days.length).toBe(3);
    expect(dailyLuck.days[0].date).toBe("2026-05-01");
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
});

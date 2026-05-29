import { describe, it, expect } from "vitest";
import { calculateChart, analyzePeriodInteractions } from "@/lib/manse";

describe("Period Interaction Engine", () => {
  it("should correctly identify interactions between chart and temporal pillars", () => {
    const chart = calculateChart({
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male",
    });

    // Test a clash
    // Day branch of 1990-05-01 is 寅.
    // 申 clashes with 寅. So a pillar with branch 申 should trigger a clash!
    const targetPillarClash = {
      stem: "庚" as any,
      branch: "申" as any,
      label: "庚申",
    };

    const clashes = analyzePeriodInteractions(chart, targetPillarClash, "annual");
    expect(clashes.length).toBeGreaterThan(0);
    expect(clashes.some(c => c.type === "clash")).toBe(true);

    // Test a combination
    // 亥 combines with 寅. So a pillar with branch 亥 should trigger a combination!
    const targetPillarComb = {
      stem: "辛" as any,
      branch: "亥" as any,
      label: "辛亥",
    };

    const combinations = analyzePeriodInteractions(chart, targetPillarComb, "monthly");
    expect(combinations.length).toBeGreaterThan(0);
    expect(combinations.some(c => c.type === "combination")).toBe(true);

    console.log("Period interaction test clashes:", clashes);
    console.log("Period interaction test combinations:", combinations);
  });
});

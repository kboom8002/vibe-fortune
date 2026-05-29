import { describe, it, expect } from "vitest";
import { calculateChart } from "@/lib/manse";

describe("Day Master Strength & YongSin Calculations", () => {
  it("should correctly compute strength and yongSin for a known birth datetime", () => {
    const chart = calculateChart({
      birthDateTime: "1990-05-01T14:30:00+09:00",
      timezone: "Asia/Seoul",
      gender: "male",
    });

    expect(chart.dayMaster.strength).toBeDefined();
    expect(chart.dayMaster.strength?.score).toBeGreaterThan(0);
    expect(["strong", "weak", "balanced"]).toContain(chart.dayMaster.strength?.judgment);
    expect(chart.dayMaster.yongSin).toBeDefined();
    expect(["wood", "fire", "earth", "metal", "water"]).toContain(chart.dayMaster.yongSin);

    console.log("Day Master strength test result:", chart.dayMaster);
  });
});

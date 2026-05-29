import { describe, it, expect } from "vitest";
import { recomposeFromReceipts, RunReceiptEntry } from "@/lib/agent/recomposition";

const makeReceipt = (overrides: Partial<RunReceiptEntry> = {}): RunReceiptEntry => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString(),
  mode: "daily",
  grade: "A",
  requiredActions: ["핵심 업무 1가지 완결"],
  forbiddenActions: ["충동적 투자"],
  completedActions: ["핵심 업무 1가지 완결"],
  vibeSnapshot: { valence: 6, arousal: 5, energy: 7, focus: 6, socialLoad: 4 },
  ...overrides,
});

describe("RunReceipt Recomposition", () => {
  it("returns stable defaults for empty receipts", () => {
    const ctx = recomposeFromReceipts([]);
    expect(ctx.recentTrend).toBe("stable");
    expect(ctx.completionRate).toBe(0);
    expect(ctx.daysSinceLastCheckin).toBe(999);
  });

  it("calculates averages from receipts", () => {
    const receipts = [
      makeReceipt({ vibeSnapshot: { valence: 8, arousal: 5, energy: 9, focus: 7, socialLoad: 3 } }),
      makeReceipt({ vibeSnapshot: { valence: 4, arousal: 5, energy: 3, focus: 5, socialLoad: 6 } }),
    ];
    const ctx = recomposeFromReceipts(receipts);
    expect(ctx.averageEnergy).toBe(6);
    expect(ctx.averageFocus).toBe(6);
    expect(ctx.averageValence).toBe(6);
  });

  it("detects low completion rate", () => {
    const receipts = [
      makeReceipt({ requiredActions: ["A", "B", "C"], completedActions: [] }),
      makeReceipt({ requiredActions: ["D", "E"], completedActions: ["D"] }),
    ];
    const ctx = recomposeFromReceipts(receipts);
    expect(ctx.completionRate).toBeLessThan(0.5);
    expect(ctx.suggestedAdjustments.some(a => a.includes("완수율"))).toBe(true);
  });

  it("detects declining trend", () => {
    const now = Date.now();
    const receipts = Array.from({ length: 6 }, (_, i) =>
      makeReceipt({
        date: new Date(now - i * 86400000).toISOString(),
        vibeSnapshot: {
          valence: 5,
          arousal: 5,
          energy: i < 3 ? 3 : 8, // recent low, older high
          focus: i < 3 ? 3 : 8,
          socialLoad: 5,
        },
      })
    );
    const ctx = recomposeFromReceipts(receipts);
    expect(ctx.recentTrend).toBe("declining");
  });

  it("detects recurring patterns", () => {
    const receipts = Array.from({ length: 5 }, () =>
      makeReceipt({ requiredActions: ["핵심 업무 완결", "파트너 대화 조율"] })
    );
    const ctx = recomposeFromReceipts(receipts);
    expect(ctx.recurringPatterns.length).toBeGreaterThan(0);
  });
});

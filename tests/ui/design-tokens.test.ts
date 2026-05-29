import { readFileSync } from "fs";
import { describe, test, expect } from "vitest";

describe("D1-01: 오행 테마 컬러 토큰", () => {
  test("globals.css에 오행 컬러 토큰이 정의되어 있다", () => {
    const css = readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("--color-element-wood");
    expect(css).toContain("--color-element-fire");
    expect(css).toContain("--color-element-earth");
    expect(css).toContain("--color-element-metal");
    expect(css).toContain("--color-element-water");
  });

  test("등급 컬러 토큰이 정의되어 있다", () => {
    const css = readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("--color-grade-expansion");
    expect(css).toContain("--color-grade-consolidation");
    expect(css).toContain("--color-grade-cleanup");
    expect(css).toContain("--color-grade-recovery");
  });
});

describe("D1-05: 그림자/블러 토큰", () => {
  test("blur-glow CSS 변수가 정의되어 있다", () => {
    const css = readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("--blur-glow");
  });
});

describe("D1-06: 그라데이션 프리셋", () => {
  test("gradient-primary 유틸리티가 정의되어 있다", () => {
    const css = readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain(".gradient-primary");
    expect(css).toContain(".gradient-cta");
  });
});

describe("D1-04: 비표준 Tailwind 색상 제거", () => {
  const files = [
    "src/components/layout/Navbar.tsx",
    "src/app/app/daily/page.tsx",
    "src/app/app/result/[id]/page.tsx",
    "src/app/app/weekly/page.tsx",
    "src/app/app/monthly/page.tsx",
    "src/app/app/history/page.tsx",
    "src/app/app/settings/page.tsx",
    "src/app/app/run-receipt/[id]/page.tsx",
  ];

  test.each(files)("%s 에 비표준 Tailwind 색상이 없다", (filePath) => {
    const content = readFileSync(filePath, "utf-8");
    const nonStandard = ["zinc-450", "zinc-650", "zinc-750", "zinc-850", "emerald-450", "amber-450"];
    for (const color of nonStandard) {
      expect(content).not.toContain(color);
    }
  });
});

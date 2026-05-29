import { readFileSync } from "fs";
import { describe, test, expect } from "vitest";

describe("D4-01: 모바일 Navbar 햄버거 메뉴", () => {
  test("Navbar에 md:hidden 모바일 메뉴 버튼이 있다", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain("md:hidden");
    expect(navbar).toContain("Menu");
    expect(navbar).toContain("mobileMenuOpen");
  });

  test("데스크톱 네비게이션이 hidden md:flex로 설정되어 있다", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain("hidden md:flex");
  });
});

describe("D4-03: 데스크톱 max-width 제한", () => {
  const pages = [
    "src/app/page.tsx",
    "src/app/app/daily/page.tsx",
    "src/app/app/weekly/page.tsx",
    "src/app/app/monthly/page.tsx",
    "src/app/app/history/page.tsx",
    "src/app/app/settings/page.tsx",
  ];

  test.each(pages)("%s 에 max-width 제한이 있다", (filePath) => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toMatch(/max-w-(xl|2xl|3xl|4xl|5xl|6xl|7xl)/);
  });
});

describe("D4-02: 태블릿 반응형 그리드", () => {
  test("주간 페이지 타겟이 반응형 그리드를 사용한다", () => {
    const weekly = readFileSync("src/app/app/weekly/page.tsx", "utf-8");
    expect(weekly).toContain("md:grid-cols-3");
  });

  test("월간 페이지 컨셉이 반응형 그리드를 사용한다", () => {
    const monthly = readFileSync("src/app/app/monthly/page.tsx", "utf-8");
    expect(monthly).toContain("md:grid-cols-3");
  });

  test("월간 페이지 액션 캘린더가 모바일 반응형이다", () => {
    const monthly = readFileSync("src/app/app/monthly/page.tsx", "utf-8");
    expect(monthly).toContain("sm:grid-cols-2");
  });
});

describe("Navbar 일관성", () => {
  const appPages = [
    "src/app/app/daily/page.tsx",
    "src/app/app/weekly/page.tsx",
    "src/app/app/monthly/page.tsx",
    "src/app/app/history/page.tsx",
    "src/app/app/settings/page.tsx",
    "src/app/app/result/[id]/page.tsx",
    "src/app/app/run-receipt/[id]/page.tsx",
    "src/app/app/onboarding/page.tsx",
  ];

  test.each(appPages)("%s 에 Navbar가 포함되어 있다", (filePath) => {
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("Navbar");
  });
});

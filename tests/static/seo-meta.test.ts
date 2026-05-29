import { readFileSync } from "fs";
import { describe, test, expect } from "vitest";

describe("D5-06: lang=\"ko\" 설정", () => {
  test("root layout에 lang=\"ko\"가 설정되어 있다", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf-8");
    expect(layout).toContain('lang="ko"');
    expect(layout).not.toContain('lang="en"');
  });
});

describe("D5-05: SEO 메타 태그 고유 설정", () => {
  test("root layout의 title이 기본값이 아니다", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf-8");
    expect(layout).not.toContain('"Create Next App"');
    expect(layout).toContain("TCO-Vibe");
  });

  const layoutPaths = [
    { path: "src/app/app/daily/layout.tsx", expected: "바이브 체크인" },
    { path: "src/app/app/weekly/layout.tsx", expected: "주간" },
    { path: "src/app/app/monthly/layout.tsx", expected: "월간" },
    { path: "src/app/app/history/layout.tsx", expected: "역사" },
    { path: "src/app/app/settings/layout.tsx", expected: "설정" },
    { path: "src/app/app/onboarding/layout.tsx", expected: "온보딩" },
  ];

  test.each(layoutPaths)("$path 에 고유 title이 설정되어 있다", ({ path, expected }) => {
    const content = readFileSync(path, "utf-8");
    expect(content).toContain(expected);
    expect(content).toContain("TCO-Vibe");
  });
});

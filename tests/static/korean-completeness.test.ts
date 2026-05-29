import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { describe, test, expect } from "vitest";

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getAllTsxFiles(full));
    } else if (full.endsWith(".tsx")) {
      files.push(full);
    }
  }
  return files;
}

describe("D5-01: UI 텍스트 한국어 완전성", () => {
  // Check that button labels and headings are in Korean
  test("주요 버튼 라벨이 한국어이다", () => {
    const daily = readFileSync("src/app/app/daily/page.tsx", "utf-8");
    // Submit button text should be Korean
    expect(daily).toContain("오늘의 자기운영 보드 산출");
    // User-facing button labels should not be English
    expect(daily).not.toMatch(/>\s*(Generate|Send)\s*</i);
  });

  test("네비게이션 링크가 한국어이다", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain("일일 분석");
    expect(navbar).toContain("주간 분석");
    expect(navbar).toContain("월간 분석");
    expect(navbar).toContain("설정");
  });
});

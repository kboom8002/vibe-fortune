import { readFileSync } from "fs";
import { describe, test, expect } from "vitest";

describe("D5-04: 면책 조항 상시 노출", () => {
  test("랜딩 페이지에 면책 조항이 포함되어 있다", () => {
    const page = readFileSync("src/app/page.tsx", "utf-8");
    expect(page).toContain("최종 판단과 행동의 책임은 사용자 자신에게 있습니다");
  });
});

import { readFileSync } from "fs";
import { describe, test, expect } from "vitest";

describe("D2-06: 모션 감소 설정 존중", () => {
  test("globals.css에 prefers-reduced-motion 미디어 쿼리가 있다", () => {
    const css = readFileSync("src/app/globals.css", "utf-8");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("animation-duration: 0.01ms");
    expect(css).toContain("transition-duration: 0.01ms");
  });
});

describe("D2-03: ARIA 레이블 검증", () => {
  test("데일리 페이지 슬라이더에 aria-label이 있다", () => {
    const daily = readFileSync("src/app/app/daily/page.tsx", "utf-8");
    expect(daily).toContain('aria-label="정서가"');
    expect(daily).toContain('aria-label="각성도"');
    expect(daily).toContain('aria-label="활력"');
    expect(daily).toContain('aria-label="집중력"');
    expect(daily).toContain('aria-label="관계 부하"');
  });

  test("포커스 도메인 버튼에 aria-pressed가 있다", () => {
    const daily = readFileSync("src/app/app/daily/page.tsx", "utf-8");
    expect(daily).toContain("aria-pressed");
  });
});

describe("D2-01: ErrorAlert에 role=alert이 있다", () => {
  test("ErrorAlert 컴포넌트에 role=alert이 설정되어 있다", () => {
    const component = readFileSync("src/components/ui/error-alert.tsx", "utf-8");
    expect(component).toContain('role="alert"');
    expect(component).toContain('aria-live="polite"');
  });
});

describe("D2-02: Navbar 키보드 네비게이션", () => {
  test("Navbar에 aria-expanded 속성이 있다", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain("aria-expanded");
  });

  test("Navbar에 role이 없지만 nav 태그를 사용한다", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain("<nav");
    expect(navbar).toContain("aria-label");
  });
});

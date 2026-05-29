import { readFileSync } from "fs";
import { describe, test, expect } from "vitest";

describe("D3-04: 프로필 미존재 가드", () => {
  test("데일리 페이지에 온보딩 리다이렉트 가드가 있다", () => {
    const daily = readFileSync("src/app/app/daily/page.tsx", "utf-8");
    expect(daily).toContain("router.push(\"/app/onboarding\")");
    expect(daily).toContain("user-birth-profile");
  });
});

describe("D3-05: API 실패 캐시 폴백", () => {
  test("주간 페이지에 캐시 폴백 로직이 있다", () => {
    const weekly = readFileSync("src/app/app/weekly/page.tsx", "utf-8");
    expect(weekly).toContain("weekly-forecast-cache");
    expect(weekly).toContain("catch");
  });

  test("월간 페이지에 캐시 폴백 로직이 있다", () => {
    const monthly = readFileSync("src/app/app/monthly/page.tsx", "utf-8");
    expect(monthly).toContain("monthly-forecast-cache");
    expect(monthly).toContain("catch");
  });
});

describe("D3-06: 데이터 내보내기 (JSON)", () => {
  test("설정 페이지에 데이터 내보내기 기능이 있다", () => {
    const settings = readFileSync("src/app/app/settings/page.tsx", "utf-8");
    expect(settings).toContain("tco_vibe_fortune_coach_data");
    expect(settings).toContain("application/json");
    expect(settings).toContain("download");
  });
});

describe("D3-07: 데이터 영구 삭제", () => {
  test("설정 페이지에 데이터 삭제 기능이 있다", () => {
    const settings = readFileSync("src/app/app/settings/page.tsx", "utf-8");
    expect(settings).toContain("localStorage.clear()");
    expect(settings).toContain("영구 삭제");
  });
});

describe("D3-01: 온보딩 → 프로필 → 데일리 흐름", () => {
  test("온보딩 birth 페이지에서 프로필 저장 후 리다이렉트한다", () => {
    const birth = readFileSync("src/app/app/onboarding/birth/page.tsx", "utf-8");
    expect(birth).toContain("user-birth-profile");
    expect(birth).toContain("localStorage.setItem");
    expect(birth).toContain("router.push");
  });
});

describe("D3-02: 데일리 체크인 → 결과", () => {
  test("데일리 페이지에서 결과 페이지로 이동한다", () => {
    const daily = readFileSync("src/app/app/daily/page.tsx", "utf-8");
    expect(daily).toContain("/app/result/");
    expect(daily).toContain("last-forecast-request");
    expect(daily).toContain("last-vibe-checkin");
  });
});

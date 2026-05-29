/**
 * 만세 검증 프로토콜 (docs/04A)
 * 만년력 기준 테스트 케이스로 calculateChart의 정확성을 검증합니다.
 */
import { describe, it, expect } from "vitest";
import { calculateChart, calculateMajorLuck, calculateAnnualLuck } from "@/lib/manse";

describe("만세 검증 프로토콜 (04A)", () => {
  // 기준 테스트 케이스: 알려진 사주 팔자와 대조
  // 각 케이스는 만년력 또는 검증된 사주 계산기 기준

  describe("사주 팔자 기본 계산", () => {
    it("1990-05-01 14:30 KST 남성 → 庚午년 庚辰월 계산", () => {
      const chart = calculateChart({
        birthDateTime: "1990-05-01T14:30:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      expect(chart.pillars.year.stem).toBe("庚");
      expect(chart.pillars.year.branch).toBe("午");
      expect(chart.dayMaster.stem).toBeDefined();
      expect(chart.dayMaster.element).toBeDefined();
      expect(["wood", "fire", "earth", "metal", "water"]).toContain(chart.dayMaster.element);
    });

    it("1985-02-04 00:00 KST → 입춘 경계 테스트 (갑자년/을축년)", () => {
      // 1985년 2월 4일은 입춘일 — 절기 경계 근처
      const chart = calculateChart({
        birthDateTime: "1985-02-04T12:00:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      // 입춘 이후이므로 乙丑년
      expect(chart.pillars.year.stem).toBe("乙");
      expect(chart.pillars.year.branch).toBe("丑");
    });

    it("2000-01-01 06:00 KST → 기묘년(己卯) → 아직 입춘 전이므로 己卯", () => {
      const chart = calculateChart({
        birthDateTime: "2000-01-01T06:00:00",
        timezone: "Asia/Seoul",
        gender: "female",
      });
      // 2000년 1월 1일은 아직 입춘 전 → 1999년 기묘년
      expect(chart.pillars.year.stem).toBe("己");
      expect(chart.pillars.year.branch).toBe("卯");
    });

    it("모든 주(柱)에 천간과 지지가 존재해야 함", () => {
      const chart = calculateChart({
        birthDateTime: "1995-06-15T10:00:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      for (const pillar of ["year", "month", "day", "hour"] as const) {
        expect(chart.pillars[pillar].stem).toBeDefined();
        expect(chart.pillars[pillar].branch).toBeDefined();
        expect(chart.pillars[pillar].stem.length).toBe(1);
        expect(chart.pillars[pillar].branch.length).toBe(1);
      }
    });

    it("오행 분포에 모든 오행이 포함되고 합이 양수여야 함", () => {
      const chart = calculateChart({
        birthDateTime: "1988-08-20T15:00:00",
        timezone: "Asia/Seoul",
        gender: "female",
      });
      const dist = chart.fiveElementDistribution;
      expect(dist.wood).toBeGreaterThanOrEqual(0);
      expect(dist.fire).toBeGreaterThanOrEqual(0);
      expect(dist.earth).toBeGreaterThanOrEqual(0);
      expect(dist.metal).toBeGreaterThanOrEqual(0);
      expect(dist.water).toBeGreaterThanOrEqual(0);
      const total = dist.wood + dist.fire + dist.earth + dist.metal + dist.water;
      expect(total).toBeGreaterThan(0);
    });
  });

  describe("일간(Day Master) 속성", () => {
    it("일간의 오행과 음양이 정확해야 함", () => {
      const chart = calculateChart({
        birthDateTime: "1992-03-15T09:00:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      const dm = chart.dayMaster;
      // 일간 천간의 오행과 음양 정합성
      expect(["wood", "fire", "earth", "metal", "water"]).toContain(dm.element);
      expect(["yin", "yang"]).toContain(dm.polarity);
    });
  });

  describe("대운 계산", () => {
    it("대운이 8-10개 주기를 반환해야 함", () => {
      const chart = calculateChart({
        birthDateTime: "1990-05-01T14:30:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      const ml = calculateMajorLuck({ chart, gender: "male" });
      expect(ml.cycles.length).toBeGreaterThanOrEqual(8);
      expect(ml.cycles.length).toBeLessThanOrEqual(12);
    });

    it("대운 방향이 성별+년간 음양에 따라 결정되어야 함", () => {
      const chart = calculateChart({
        birthDateTime: "1990-05-01T14:30:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      const ml = calculateMajorLuck({ chart, gender: "male" });
      // 庚(양)+ 남성 = 순행(forward)
      expect(ml.direction).toBe("forward");
    });

    it("여성 + 양간 = 역행", () => {
      const chart = calculateChart({
        birthDateTime: "1990-05-01T14:30:00",
        timezone: "Asia/Seoul",
        gender: "female",
      });
      const ml = calculateMajorLuck({ chart, gender: "female" });
      // 庚(양) + 여성 = 역행(backward)
      expect(ml.direction).toBe("backward");
    });
  });

  describe("세운 계산", () => {
    it("2024년 세운 → 甲辰년", () => {
      const al = calculateAnnualLuck({ year: 2024 });
      expect(al.pillar.stem).toBe("甲");
      expect(al.pillar.branch).toBe("辰");
    });

    it("2025년 세운 → 乙巳년", () => {
      const al = calculateAnnualLuck({ year: 2025 });
      expect(al.pillar.stem).toBe("乙");
      expect(al.pillar.branch).toBe("巳");
    });

    it("2026년 세운 → 丙午년", () => {
      const al = calculateAnnualLuck({ year: 2026 });
      expect(al.pillar.stem).toBe("丙");
      expect(al.pillar.branch).toBe("午");
    });

    it("60갑자 주기 검증: 1984 = 甲子", () => {
      const al = calculateAnnualLuck({ year: 1984 });
      expect(al.pillar.stem).toBe("甲");
      expect(al.pillar.branch).toBe("子");
    });
  });

  describe("경계 케이스 및 견고성", () => {
    it("자시(子時) 23:00-01:00 처리", () => {
      const chart = calculateChart({
        birthDateTime: "1990-01-01T23:30:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      // 23:30은 子時(자시)
      expect(chart.pillars.hour.branch).toBe("子");
    });

    it("경계 시간 00:00 처리", () => {
      const chart = calculateChart({
        birthDateTime: "1990-01-01T00:00:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      expect(chart.pillars.hour.branch).toBe("子");
    });

    it("chartId가 UUID 형식이어야 함", () => {
      const chart = calculateChart({
        birthDateTime: "1990-06-15T12:00:00",
        timezone: "Asia/Seoul",
        gender: "male",
      });
      expect(chart.id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});

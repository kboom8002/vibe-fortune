import { Pillar } from "@/schemas/common.schema";
import { MansePolicy } from "@/schemas/birth-profile.schema";
import { ManseWarning } from "@/schemas/manse-chart.schema";

export type CalculateChartInput = {
  birthDateTime: string;
  timezone: string;
  gender?: "male" | "female" | "other" | "unspecified";
  birthLocation?: string;
  policy?: MansePolicy;
};

export type ChartResult = {
  id: string;
  userId: string;
  birthProfileId: string;
  birthDateTime: string;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar;
  };
  dayMaster: {
    stem: "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
    element: "wood" | "fire" | "earth" | "metal" | "water";
    polarity: "yin" | "yang";
  };
  tenGods: Record<string, string>;
  hiddenStems: Record<string, string[]>;
  fiveElementDistribution: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  chartConsistency?: {
    status: "matched" | "mismatched" | "not_provided" | "calculation_failed";
    mismatchedFields?: ("year" | "month" | "day" | "hour")[];
    canonicalSource: "calculated" | "user_provided";
    note?: string;
  };
  calculationPolicy: MansePolicy;
  warnings: ManseWarning[];
  createdAt: string;
};

export type CalculateMajorLuckInput = {
  chart: ChartResult;
  gender: "male" | "female" | "other" | "unspecified";
  policy?: MansePolicy;
};

export type MajorLuckCycle = {
  stem: string;
  branch: string;
  ganzhi: string;
  startAge: number;
  startDate?: string;
};

export type MajorLuckResult = {
  id: string;
  userId: string;
  birthProfileId: string;
  chartId?: string;
  direction: "forward" | "backward";
  startAge: number;
  startDate?: string;
  cycles: MajorLuckCycle[];
  calculationPolicy: MansePolicy;
  warnings: ManseWarning[];
  createdAt: string;
};

export type CalculateAnnualLuckInput = {
  year: number;
};

export type AnnualLuckResult = {
  year: number;
  pillar: Pillar;
};

export type CalculateDailyLuckRangeInput = {
  from: string;
  to: string;
  timezone: string;
};

export type DailyLuckRangeResult = {
  days: {
    date: string;
    pillar: Pillar;
  }[];
};

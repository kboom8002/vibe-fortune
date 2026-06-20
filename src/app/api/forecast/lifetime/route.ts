import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateChart, calculateMajorLuck, calculateAnnualLuck } from "@/lib/manse";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : "local-user";

    const body = await request.json();
    const { birthProfile } = body;

    if (!birthProfile) {
      return NextResponse.json(
        { status: "error", message: "생년월일 정보가 필요합니다." },
        { status: 400 }
      );
    }

    // Calculate chart deterministically
    let chartResult;
    try {
      let birthDateTimeStr = birthProfile.birthDateTime;
      if (!birthDateTimeStr) {
        const bd = birthProfile.birthDate || "1990-01-01";
        const bt = birthProfile.birthTime || "12:00";
        birthDateTimeStr = `${bd}T${bt}:00`;
      }
      chartResult = calculateChart({
        birthDateTime: birthDateTimeStr,
        timezone: birthProfile.timezone || "Asia/Seoul",
        gender: birthProfile.gender || "male",
      });
    } catch (err) {
      console.error("[LifetimeAPI] Chart calculation failed:", err);
      return NextResponse.json(
        { status: "error", message: "사주 차트 계산 실패" },
        { status: 500 }
      );
    }

    // Calculate major luck timeline
    // MajorLuckResult uses `cycles` (not `periods`)
    let majorLuckCycles: Array<{
      stem: string;
      branch: string;
      ganzhi: string;
      startAge: number;
      startDate?: string;
    }> = [];
    try {
      const ml = calculateMajorLuck({
        chart: chartResult,
        gender: birthProfile.gender || "male",
      });
      majorLuckCycles = ml.cycles || [];
    } catch (err) {
      console.warn("[LifetimeAPI] Major luck calculation failed:", err);
    }

    // Calculate current year's annual luck
    // AnnualLuckResult returns { year, pillar: { stem, branch, label } }
    let annualLuck: { year: number; pillar: { stem: string; branch: string; label: string } } | null = null;
    try {
      annualLuck = calculateAnnualLuck({ year: new Date().getFullYear() });
    } catch (err) {
      console.warn("[LifetimeAPI] Annual luck calculation failed:", err);
    }

    // Extract birth year from profile for current major luck detection
    const birthYear = (() => {
      if (birthProfile.birthDateTime) {
        return new Date(birthProfile.birthDateTime).getFullYear();
      }
      if (birthProfile.birthDate) {
        return parseInt(birthProfile.birthDate.split("-")[0], 10);
      }
      return 1990;
    })();

    // For now, return deterministic data (LLM integration will be added later)
    const lifetimeOutput = {
      dayMaster: chartResult.dayMaster,
      fiveElementDistribution: chartResult.fiveElementDistribution,
      majorLuckCycles,
      currentMajorLuck: majorLuckCycles.find((c) => {
        const now = new Date().getFullYear();
        return now >= (c.startAge + birthYear) &&
               now < (c.startAge + birthYear + 10);
      }) || majorLuckCycles[0] || null,
      annualLuck,
      chartResult,
    };

    return NextResponse.json({
      status: "ok",
      lifetimeOutput,
    });
  } catch (err) {
    console.error("[LifetimeAPI] Error:", err);
    return NextResponse.json(
      { status: "error", message: "인생 총운 분석 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

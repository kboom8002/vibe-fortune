import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateChart, calculateMajorLuck } from "@/lib/manse";
import { BirthProfileRequestSchema, BirthProfileResponseSchema } from "@/schemas/api-contracts.schema";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = BirthProfileRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          warnings: [
            {
              code: "INSUFFICIENT_CONTEXT",
              message: "요청 유효성 검증 실패: " + parsed.error.message,
              node: "API_Profile_Birth",
              userVisible: true,
            },
          ],
        },
        { status: 400 }
      );
    }

    const { name, birthDateTime, timezone, gender, birthLocation, providedChart } = parsed.data;

    const calculationPolicy = {
      yearBoundary: "lichun" as const,
      monthBoundary: "solar_terms" as const,
      dayEpoch: "verified_jdn_epoch" as const,
      hourPolicy: "standard_2h" as const,
      nightZiPolicy: "disabled" as const,
      trueSolarTime: false,
      majorLuckDirectionRule: "gender_yinyang_year_stem" as const,
      majorLuckStartRule: "days_to_jieqi_divide_by_3" as const,
      policyName: "standard_kr" as const,
    };

    // Calculate deterministic chart and major luck
    const chart = calculateChart({
      birthDateTime,
      timezone,
      gender: gender as any,
    });

    const majorLuck = calculateMajorLuck({
      chart,
      gender: gender as any,
    });

    // Save to birth_profiles
    const birthProfileId = crypto.randomUUID();
    const birthProfileData = {
      id: birthProfileId,
      user_id: user.id,
      name,
      birth_datetime: birthDateTime,
      timezone,
      gender,
      birth_location: birthLocation || null,
      provided_chart: providedChart || null,
      calculation_policy: calculationPolicy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: bpError } = await supabase
      .from("birth_profiles")
      .upsert(birthProfileData);

    if (bpError) {
      console.error("Error saving birth profile to Supabase:", bpError);
    }

    // Save to manse_charts
    const chartId = crypto.randomUUID();
    const chartData = {
      id: chartId,
      user_id: user.id,
      birth_profile_id: birthProfileId,
      pillars: chart.pillars,
      day_master: chart.dayMaster,
      ten_gods: chart.tenGods || {},
      hidden_stems: chart.hiddenStems || {},
      five_element_distribution: chart.fiveElementDistribution,
      chart_consistency: chart.chartConsistency || null,
      calculation_policy: calculationPolicy,
      warnings: chart.warnings || [],
      created_at: new Date().toISOString(),
    };

    const { error: chartError } = await supabase
      .from("manse_charts")
      .upsert(chartData);

    if (chartError) {
      console.error("Error saving manse chart to Supabase:", chartError);
    }

    // Save to major_luck_cycles
    const luckData = {
      id: crypto.randomUUID(),
      user_id: user.id,
      birth_profile_id: birthProfileId,
      chart_id: chartId,
      direction: majorLuck.direction,
      start_age: majorLuck.startAge,
      start_date: majorLuck.startDate || null,
      cycles: majorLuck.cycles,
      calculation_policy: calculationPolicy,
      warnings: majorLuck.warnings || [],
      created_at: new Date().toISOString(),
    };

    const { error: luckError } = await supabase
      .from("major_luck_cycles")
      .upsert(luckData);

    if (luckError) {
      console.error("Error saving major luck cycles to Supabase:", luckError);
    }

    const warnings = chart.warnings.map(w => ({
      code: w as any,
      message: `만세력 연산 경고: ${w}`,
      node: "API_Profile_Birth",
      userVisible: true,
    }));

    const responseData = {
      birthProfile: {
        id: birthProfileId,
        userId: user.id,
        name,
        birthDateTime,
        timezone,
        gender,
        birthLocation,
        providedChart,
        calculationPolicy,
        createdAt: birthProfileData.created_at,
        updatedAt: birthProfileData.updated_at,
      },
      chart,
      majorLuck,
      warnings,
    };

    // Validate response with Zod before sending (Schema-First Rule)
    BirthProfileResponseSchema.parse(responseData);

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("Unhandled error in POST /api/profile/birth:", err);
    return NextResponse.json(
      {
        warnings: [
          {
            code: "POLICY_VARIANT_MAY_DIFFER",
            message: "서버 오류: " + err.message,
            node: "API_Profile_Birth",
            userVisible: true,
          },
        ],
      },
      { status: 500 }
    );
  }
}

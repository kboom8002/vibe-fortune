import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("Error fetching user profile:", profileError);
    }

    // 2. Fetch birth profile
    const { data: birthProfile, error: bpError } = await supabase
      .from("birth_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (bpError && bpError.code !== "PGRST116") {
      console.error("Error fetching birth profile:", bpError);
    }

    return NextResponse.json({
      status: "ok",
      profile: profile || null,
      birthProfile: birthProfile ? {
        id: birthProfile.id,
        userId: birthProfile.user_id,
        name: birthProfile.name,
        birthDateTime: birthProfile.birth_datetime,
        timezone: birthProfile.timezone,
        gender: birthProfile.gender,
        birthLocation: birthProfile.birth_location,
        providedChart: birthProfile.provided_chart,
        calculationPolicy: birthProfile.calculation_policy,
        createdAt: birthProfile.created_at,
        updatedAt: birthProfile.updated_at,
      } : null,
    });
  } catch (err: any) {
    console.error("Unhandled error in GET /api/profile:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

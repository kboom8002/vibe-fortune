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

    // Fetch forecast outputs
    const { data: forecasts, error: forecastError } = await supabase
      .from("forecast_outputs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (forecastError) {
      console.error("Error fetching forecast outputs:", forecastError);
    }

    // Fetch run receipts
    const { data: receipts, error: receiptError } = await supabase
      .from("run_receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (receiptError) {
      console.error("Error fetching run receipts:", receiptError);
    }

    // Map DB underscore fields to camelCase for the frontend if necessary
    const mappedForecasts = (forecasts || []).map(f => ({
      id: f.id,
      userId: f.user_id,
      forecastRequestId: f.forecast_request_id,
      mode: f.mode,
      outputJson: f.output_json,
      outputMarkdown: f.output_markdown,
      grade: f.grade,
      contextTensorId: f.context_tensor_id,
      conceptStateId: f.concept_state_id,
      riskVectorId: f.risk_vector_id,
      actionPolicyId: f.action_policy_id,
      safetyFlags: f.safety_flags,
      createdAt: f.created_at,
    }));

    const mappedReceipts = (receipts || []).map(r => ({
      id: r.id,
      userId: r.user_id,
      forecastOutputId: r.forecast_output_id,
      whatIDid: r.what_i_did,
      whyIChoseIt: r.why_i_chose_it,
      whatAIHelped: r.what_ai_helped,
      myJudgment: r.my_judgment,
      whatIDeferred: r.what_i_deferred,
      whatILearned: r.what_i_learned,
      nextAction: r.next_action,
      createdAt: r.created_at,
    }));

    return NextResponse.json({
      forecasts: mappedForecasts,
      receipts: mappedReceipts,
    });
  } catch (err: any) {
    console.error("Unhandled error in GET /api/history:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

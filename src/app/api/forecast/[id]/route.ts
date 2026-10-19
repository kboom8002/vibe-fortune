import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(context.params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Missing forecast ID" }, { status: 400 });
    }

    // Fetch forecast_outputs by id for the authenticated user
    const { data: forecast, error: forecastError } = await supabase
      .from("forecast_outputs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (forecastError || !forecast) {
      return NextResponse.json({ error: "Forecast not found" }, { status: 404 });
    }

    // Fetch related risk_vectors and action_policies if linked
    let riskVector = null;
    if (forecast.risk_vector_id) {
      const { data: rv } = await supabase
        .from("risk_vectors")
        .select("*")
        .eq("id", forecast.risk_vector_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (rv) {
        riskVector = rv.payload || {
          id: rv.id,
          userId: rv.user_id,
          forecastRequestId: rv.forecast_request_id,
          primaryRisk: rv.primary_risk,
          createdAt: rv.created_at,
        };
      }
    }

    let actionPolicy = null;
    if (forecast.action_policy_id) {
      const { data: ap } = await supabase
        .from("action_policies")
        .select("*")
        .eq("id", forecast.action_policy_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ap) {
        actionPolicy = ap.payload || {
          id: ap.id,
          userId: ap.user_id,
          forecastRequestId: ap.forecast_request_id,
          mode: ap.mode,
          createdAt: ap.created_at,
        };
      }
    }

    let contextTensor = null;
    if (forecast.context_tensor_id) {
      const { data: ct } = await supabase
        .from("context_tensors")
        .select("*")
        .eq("id", forecast.context_tensor_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (ct) {
        contextTensor = ct.payload || null;
      }
    }

    let conceptState = null;
    if (forecast.concept_state_id) {
      const { data: cs } = await supabase
        .from("concept_states")
        .select("*")
        .eq("id", forecast.concept_state_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cs) {
        conceptState = cs.payload || null;
      }
    }

    const forecastOutput = {
      id: forecast.id,
      userId: forecast.user_id,
      forecastRequestId: forecast.forecast_request_id,
      mode: forecast.mode,
      outputJson: forecast.output_json,
      outputMarkdown: forecast.output_markdown,
      grade: forecast.grade,
      contextTensorId: forecast.context_tensor_id,
      conceptStateId: forecast.concept_state_id,
      riskVectorId: forecast.risk_vector_id,
      actionPolicyId: forecast.action_policy_id,
      safetyFlags: forecast.safety_flags || [],
      createdAt: forecast.created_at,
    };

    return NextResponse.json({
      status: "ok",
      forecastOutput,
      riskVector,
      actionPolicy,
      contextTensor,
      conceptState,
    });
  } catch (err: any) {
    console.error("Unhandled error in GET /api/forecast/[id]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

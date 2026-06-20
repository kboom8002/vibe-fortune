import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ForecastFeedbackRequestSchema, ForecastFeedbackResponseSchema } from "@/schemas/api-contracts.schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ForecastFeedbackRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { forecastOutputId, rating, feedbackTags, comment } = parsed.data;

    // Check auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Default RLHF Bias values
    let intensity_offset = 0;
    let risk_sensitivity = 1.0;
    let tone_preference: string | null = null;
    let action_count_limit: number | null = null;

    if (user) {
      // 1. Save feedback to forecast_feedbacks table
      const { error: insertError } = await supabase
        .from("forecast_feedbacks")
        .insert({
          user_id: user.id,
          forecast_output_id: forecastOutputId,
          rating,
          feedback_tags: feedbackTags,
          comment: comment || null,
        });

      if (insertError) {
        console.error("[Feedback API] Error inserting feedback:", insertError);
      }

      // 2. Fetch user's current rlhf_bias from profiles
      const { data: prof, error: selectError } = await supabase
        .from("profiles")
        .select("rlhf_bias")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prof && !selectError && prof.rlhf_bias) {
        const currentBias = prof.rlhf_bias as any;
        intensity_offset = typeof currentBias.intensity_offset === "number" ? currentBias.intensity_offset : 0;
        risk_sensitivity = typeof currentBias.risk_sensitivity === "number" ? currentBias.risk_sensitivity : 1.0;
        tone_preference = currentBias.tone_preference || null;
        action_count_limit = currentBias.action_count_limit || null;
      }
    }

    // 3. Run RLHF tuning algorithm
    if (rating <= 2) {
      // Negative feedback -> tune parameters
      if (feedbackTags.includes("too_demanding")) {
        intensity_offset = Math.max(-2, intensity_offset - 1);
        action_count_limit = 2; // Strict limit to reduce information load
      }
      if (feedbackTags.includes("too_vague")) {
        intensity_offset = Math.min(2, intensity_offset + 1);
        action_count_limit = null; // Clear limits to allow more actions
      }
      if (feedbackTags.includes("too_negative")) {
        risk_sensitivity = Math.max(0.4, risk_sensitivity - 0.2); // Lower risk amplification multiplier
      }
      if (feedbackTags.includes("inaccurate")) {
        // Soft tuning to raise valence if they feel it's too critical, or lower if too high
        intensity_offset = Math.max(-1, Math.min(1, intensity_offset));
      }
    } else if (rating >= 4) {
      // Positive feedback -> stabilize / decay towards baseline to avoid permanent drift
      if (intensity_offset !== 0) {
        intensity_offset = intensity_offset > 0 ? intensity_offset - 1 : intensity_offset + 1;
      }
      if (risk_sensitivity !== 1.0) {
        risk_sensitivity = risk_sensitivity > 1.0 
          ? Math.max(1.0, risk_sensitivity - 0.1) 
          : Math.min(1.0, risk_sensitivity + 0.1);
      }
      // Nudge action limit back up if they are happy
      if (action_count_limit === 2) {
        action_count_limit = 3;
      }
    }

    const updatedRlhfBias = {
      intensity_offset,
      risk_sensitivity,
      tone_preference,
      action_count_limit,
    };

    // 4. Save updated rlhf_bias back to profile in DB (if authenticated)
    if (user) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          rlhf_bias: updatedRlhfBias,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("[Feedback API] Error updating rlhf_bias:", updateError);
      }
    }

    const response = {
      success: true,
      rlhfBias: updatedRlhfBias,
    };

    // Validate response using contract
    ForecastFeedbackResponseSchema.parse(response);

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("[Feedback API] Unhandled error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

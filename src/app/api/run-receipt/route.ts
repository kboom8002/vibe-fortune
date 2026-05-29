import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RunReceiptRequestSchema, RunReceiptResponseSchema } from "@/schemas/api-contracts.schema";

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
    const parsed = RunReceiptRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const {
      forecastOutputId,
      whatIDid,
      whyIChoseIt,
      whatAIHelped,
      myJudgment,
      whatIDeferred,
      whatILearned,
      nextAction,
    } = parsed.data;

    const receiptId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const receiptData = {
      id: receiptId,
      user_id: user.id,
      forecast_output_id: forecastOutputId,
      what_i_did: whatIDid,
      why_i_chose_it: whyIChoseIt || "N/A",
      what_ai_helped: whatAIHelped || "N/A",
      my_judgment: myJudgment || "N/A",
      what_i_deferred: whatIDeferred || "N/A",
      what_i_learned: whatILearned || "N/A",
      next_action: nextAction || "N/A",
      created_at: createdAt,
    };

    const { error } = await supabase
      .from("run_receipts")
      .insert(receiptData);

    if (error) {
      console.error("Error saving run receipt to Supabase:", error);
    }

    const responseData = {
      runReceipt: {
        id: receiptId,
        userId: user.id,
        forecastOutputId,
        whatIDid,
        whyIChoseIt: whyIChoseIt || "N/A",
        whatAIHelped: whatAIHelped || "N/A",
        myJudgment: myJudgment || "N/A",
        whatIDeferred: whatIDeferred || "N/A",
        whatILearned: whatILearned || "N/A",
        nextAction: nextAction || "N/A",
        createdAt,
      },
    };

    // Schema-First Rule: Validate output
    RunReceiptResponseSchema.parse(responseData);

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("Unhandled error in POST /api/run-receipt:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

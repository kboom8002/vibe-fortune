import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VibeCheckinRequestSchema, VibeCheckinResponseSchema } from "@/schemas/api-contracts.schema";

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
    const parsed = VibeCheckinRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const { valence, arousal, energy, focus, socialLoad, sleepHours, oneLineEvent } = parsed.data;

    const checkinId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const vibeData = {
      id: checkinId,
      user_id: user.id,
      valence,
      arousal,
      energy,
      focus,
      social_load: socialLoad,
      sleep_hours: sleepHours ?? null,
      one_line_event: oneLineEvent || null,
      created_at: createdAt,
    };

    const { error } = await supabase
      .from("vibe_checkins")
      .insert(vibeData);

    if (error) {
      console.error("Error saving vibe check-in to Supabase:", error);
    }

    const responseData = {
      vibeCheckIn: {
        id: checkinId,
        userId: user.id,
        valence,
        arousal,
        energy,
        focus,
        socialLoad,
        sleepHours: sleepHours ?? undefined,
        oneLineEvent: oneLineEvent || undefined,
        createdAt,
      },
    };

    // Schema-First Rule: Validate output
    VibeCheckinResponseSchema.parse(responseData);

    return NextResponse.json(responseData);
  } catch (err: any) {
    console.error("Unhandled error in POST /api/vibe-checkin:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

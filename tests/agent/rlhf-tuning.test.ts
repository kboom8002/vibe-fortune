import { describe, test, expect, vi } from "vitest";
import { runAgentWorkflow } from "../../src/lib/agent/graph";
import { VibeFortuneAgentState } from "../../src/schemas/agent-state.schema";

vi.mock("../../src/lib/supabase/db", () => {
  const chain: any = {
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return {
    getDbClient: () => ({
      from: () => ({
        upsert: () => Promise.resolve({ error: null }),
        insert: () => Promise.resolve({ error: null }),
        select: () => chain,
      }),
    }),
  };
});

describe("RLHF Closed-Loop Tuning & Vibe Estimation", () => {
  const birthProfile = {
    id: "test-profile-rlhf",
    userId: "test-user-rlhf",
    name: "TestUser",
    birthDateTime: "1990-05-01T14:30:00+09:00",
    timezone: "Asia/Seoul",
    gender: "male" as const,
    calculationPolicy: {
      yearBoundary: "lichun" as const,
      monthBoundary: "solar_terms" as const,
      dayEpoch: "verified_jdn_epoch" as const,
      hourPolicy: "standard_2h" as const,
      nightZiPolicy: "disabled" as const,
      trueSolarTime: false,
      majorLuckDirectionRule: "gender_yinyang_year_stem" as const,
      majorLuckStartRule: "days_to_jieqi_divide_by_3" as const,
      policyName: "standard_kr" as const,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test("VibeEstimatorNode should calculate estimatedVibe from Saju even if vibe checkin is missing", async () => {
    const initialState: VibeFortuneAgentState = {
      userId: "test-user-rlhf",
      requestId: "req-estimator-1",
      input: {
        forecastScope: "daily",
        timezone: "Asia/Seoul",
        currentFocus: "business_finance",
      },
      birthProfile,
      safetyFlags: [],
      warnings: [],
      errors: [],
      runtime: {
        provider: "mock",
        startedAt: "2026-06-20T10:00:00Z",
        nodeHistory: [],
        retryCount: 0,
      },
    };

    const finalState = await runAgentWorkflow(initialState);
    expect(finalState.errors?.length || 0).toBe(0);
    expect(finalState.estimatedVibe).toBeDefined();
    expect(finalState.estimatedVibe?.valence).toBeGreaterThanOrEqual(0);
    expect(finalState.estimatedVibe?.valence).toBeLessThanOrEqual(10);
    expect(finalState.vibeCheckIn).toBeDefined(); // VibeCheckInParserNode should fall back to estimatedVibe
    expect(finalState.vibeCheckIn?.id).toBe(finalState.estimatedVibe?.id);
    expect(finalState.runtime?.nodeHistory).toContain("VibeEstimatorNode");
  });

  test("RLHF bias should reduce risk scores and limit recommended action count", async () => {
    const initialState: VibeFortuneAgentState = {
      userId: "test-user-rlhf",
      requestId: "req-rlhf-bias-1",
      input: {
        forecastScope: "daily",
        timezone: "Asia/Seoul",
        currentFocus: "business_finance",
      },
      birthProfile,
      rlhfBias: {
        intensity_offset: -1,
        risk_sensitivity: 0.5, // Reduce all risk scores by half
        tone_preference: "gentle",
        action_count_limit: 1, // Restrict required actions to only 1
      },
      safetyFlags: [],
      warnings: [],
      errors: [],
      runtime: {
        provider: "mock",
        startedAt: "2026-06-20T10:00:00Z",
        nodeHistory: [],
        retryCount: 0,
      },
    };

    const finalState = await runAgentWorkflow(initialState);
    expect(finalState.errors?.length || 0).toBe(0);
    
    // Check risk vector was downscaled
    expect(finalState.riskVector).toBeDefined();
    const rv = finalState.riskVector!;
    // In default mock calculations with high parameters, burnout / overextension could be high.
    // Under 0.5 multiplier, they should be well scaled down.
    expect(rv.burnout).toBeLessThanOrEqual(0.5); 
    
    // Check actions count limited to 1
    expect(finalState.actionPolicy).toBeDefined();
    expect(finalState.actionPolicy?.requiredActions?.length).toBeLessThanOrEqual(1);
  });
});

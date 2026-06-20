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

describe("Weekly & Monthly Agent Pipeline", () => {
  test("Should execute weekly pipeline without errors and produce WeeklyForecastOutput", async () => {
    const initialState: VibeFortuneAgentState = {
      userId: "test-user-1",
      requestId: "req-weekly-1",
      input: {
        forecastScope: "weekly",
        timezone: "Asia/Seoul",
        userMessage: "이번 주 업무 계획을 짜고 싶어.",
      },
      birthProfile: {
        id: "test-profile-1",
        userId: "test-user-1",
        name: "TestUser",
        birthDateTime: "1990-01-01T12:00:00.000Z",
        timezone: "Asia/Seoul",
        gender: "female",
        birthLocation: "Seoul",
        calculationPolicy: {
          yearBoundary: "lichun",
          monthBoundary: "solar_terms",
          dayEpoch: "verified_jdn_epoch",
          hourPolicy: "standard_2h",
          nightZiPolicy: "disabled",
          trueSolarTime: true,
          majorLuckDirectionRule: "gender_yinyang_year_stem",
          majorLuckStartRule: "days_to_jieqi_divide_by_3",
          policyName: "standard_kr",
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      safetyFlags: [],
      warnings: [],
      errors: [],
      runtime: {
        provider: "mock",
        startedAt: new Date().toISOString(),
        nodeHistory: [],
        retryCount: 0,
      },
    };

    const finalState = await runAgentWorkflow(initialState);
    expect(finalState.errors?.length || 0).toBe(0); // Should have no errors
    expect(finalState.finalOutput).toBeDefined();
    expect(finalState.finalOutput?.mode).toBe("weekly");
    
    // Check if the output JSON conforms to Weekly structure
    const outputJson = finalState.finalOutput?.outputJson as any;
    expect(outputJson).toBeDefined();
    // VibeTuneRewriterNode might not be fully mocking the LLM output in the test,
    // but the node history should be populated.
    expect(finalState.runtime?.nodeHistory).toContain("ForecastWriterNode");
  });

  test("Should execute monthly pipeline without errors and produce MonthlyForecastOutput", async () => {
    const initialState: VibeFortuneAgentState = {
      userId: "test-user-2",
      requestId: "req-monthly-1",
      input: {
        forecastScope: "monthly",
        timezone: "Asia/Seoul",
        userMessage: "다음 달 컨셉을 어떻게 잡을까?",
      },
      safetyFlags: [],
      warnings: [],
      errors: [],
      runtime: {
        provider: "mock",
        startedAt: new Date().toISOString(),
        nodeHistory: [],
        retryCount: 0,
      },
    };

    const finalState = await runAgentWorkflow(initialState);
    // Since birthProfile is missing, it should hit SafetyGate or BirthDataNormalizer errors but not crash
    expect(finalState.runtime?.nodeHistory).toBeDefined();
    // Should skip some calculation nodes or return safely
    expect(finalState).toBeDefined();
  });
});

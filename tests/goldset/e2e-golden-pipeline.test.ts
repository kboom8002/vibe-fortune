import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import {
  calculateChart,
  calculateMajorLuck,
  calculateAnnualLuck,
  calculateMonthlyLuck,
  calculateDailyLuckRange,
  checkChartConsistency,
} from "@/lib/manse";
import { DEFAULT_MANSE_POLICY } from "@/lib/manse/constants";
import { runAgentWorkflow } from "@/lib/agent/graph";
import { VibeFortuneAgentState } from "@/schemas/agent-state.schema";
import {
  ForecastOutputSchema,
  WeeklyForecastOutputSchema,
  MonthlyForecastOutputSchema,
} from "@/schemas/forecast-output.schema";
import { RiskVectorSchema } from "@/schemas/risk-vector.schema";
import { ActionPolicySchema } from "@/schemas/action-policy.schema";
import { ContextTensorSchema } from "@/schemas/context-tensor.schema";
import { ConceptStateSchema } from "@/schemas/concept-state.schema";
import { MajorLuckResultSchema } from "@/schemas/manse-chart.schema";
import { runEvalHarness } from "../eval/runner";
import { evaluateResults, generateMarkdownReport } from "../eval/judge";

// Mock Next.js server Supabase client for API route E2E tests (unauthenticated guest/hybrid mode)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      single: vi.fn(async () => ({ data: null, error: null })),
    })),
  })),
}));

const GOLDEN_BIRTH_PROFILE = {
  id: "00000000-0000-4000-8000-000000000001",
  userId: "local-user",
  name: "골든테스트 사용자",
  birthDateTime: "1990-05-01T14:30:00+09:00",
  timezone: "Asia/Seoul",
  gender: "male" as const,
  birthLocation: "Seoul, KR",
  calculationPolicy: DEFAULT_MANSE_POLICY,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("E2E Golden Test Suite — TCO-Vibe Fortune Coach v2", () => {
  const goldsetPath = path.join(__dirname, "goldset.sample.jsonl");
  const goldenItems = fs
    .readFileSync(goldsetPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));

  it("loads all 12 canonical Golden Scenarios (GS-001 ~ GS-012)", () => {
    expect(goldenItems).toHaveLength(12);
    expect(goldenItems.map((g) => g.id)).toEqual([
      "GS-001",
      "GS-002",
      "GS-003",
      "GS-004",
      "GS-005",
      "GS-006",
      "GS-007",
      "GS-008",
      "GS-009",
      "GS-010",
      "GS-011",
      "GS-012",
    ]);
  });

  describe("Stage 1 (Flow A): Deterministic Manse Engine, Branch Ten-Gods, Major Luck & Chart Consistency", () => {
    it("computes deterministic 4-pillars, non-empty branch Ten-Gods, strength/yongSin, and schema-valid Major Luck", () => {
      const chart = calculateChart({
        birthDateTime: GOLDEN_BIRTH_PROFILE.birthDateTime,
        timezone: GOLDEN_BIRTH_PROFILE.timezone,
        gender: GOLDEN_BIRTH_PROFILE.gender,
      });

      // Verify exact golden pillars for 1990-05-01T14:30:00+09:00
      expect(chart.pillars.year.label).toBe("庚午");
      expect(chart.pillars.month.label).toBe("庚辰");
      expect(chart.pillars.day.label).toBe("丙寅");
      expect(chart.pillars.hour.label).toBe("乙未");

      // Verify all 4 earthly branches have non-empty Korean Ten-Gods
      expect(chart.tenGods.yearBranch).toBeTruthy();
      expect(chart.tenGods.monthBranch).toBeTruthy();
      expect(chart.tenGods.dayBranch).toBeTruthy();
      expect(chart.tenGods.hourBranch).toBeTruthy();

      // Verify Day Master strength & YongSin
      expect(chart.dayMaster.stem).toBe("丙");
      expect(chart.dayMaster.element).toBe("fire");
      expect(chart.dayMaster.strength?.judgment).toBeDefined();
      expect(chart.dayMaster.yongSin).toBeDefined();

      // Verify Major Luck conforms to MajorLuckResultSchema and exposes both cycles & periods
      const majorLuck = calculateMajorLuck({
        chart,
        gender: "male",
      });
      const parsedMajorLuck = MajorLuckResultSchema.safeParse(majorLuck);
      expect(parsedMajorLuck.success).toBe(true);
      expect(majorLuck.cycles.length).toBeGreaterThanOrEqual(8);
      expect(majorLuck.periods?.length).toBe(majorLuck.cycles.length);
      expect(majorLuck.cycles[0].pillar).toBeDefined();
      expect(majorLuck.cycles[0].ageFrom).toBe(majorLuck.cycles[0].startAge);

      // Verify Annual, Monthly (with solar term day), and Daily Luck Range
      const annual = calculateAnnualLuck(2026);
      expect(annual.pillar.label).toBe("丙午");

      const monthly = calculateMonthlyLuck(2026, 5, 15);
      expect(monthly.pillar.label).toBeTruthy();

      const dailyRange = calculateDailyLuckRange({
        from: "2026-05-01",
        to: "2026-05-07",
        timezone: "Asia/Seoul",
      });
      expect(dailyRange.days).toHaveLength(7);
      expect(dailyRange.days[0].date).toBe("2026-05-01");
      expect(dailyRange.days[6].date).toBe("2026-05-07");
    });

    it("detects chart consistency match and mismatch (GS-012) while preserving both charts", async () => {
      const chart = calculateChart({
        birthDateTime: GOLDEN_BIRTH_PROFILE.birthDateTime,
        timezone: GOLDEN_BIRTH_PROFILE.timezone,
        gender: GOLDEN_BIRTH_PROFILE.gender,
      });

      const matched = checkChartConsistency(chart, {
        yearPillar: "庚午",
        monthPillar: "庚辰",
        dayPillar: "丙寅",
        hourPillar: "乙未",
      });
      expect(matched.status).toBe("matched");

      const gs12 = goldenItems.find((g) => g.id === "GS-012")!;
      const mismatched = checkChartConsistency(chart, gs12.input.providedChart);
      expect(mismatched.status).toBe("mismatched");
      expect(mismatched.mismatchedFields).toContain("year");
      expect(mismatched.mismatchedFields).toContain("day");

      // Run GS-012 through full LangGraph workflow and verify CHART_CONSISTENCY_MISMATCH warning
      const state: VibeFortuneAgentState = {
        userId: "local-user",
        requestId: "golden-gs-012",
        birthProfile: GOLDEN_BIRTH_PROFILE,
        input: {
          forecastScope: "daily",
          targetDate: "2026-05-01",
          timezone: "Asia/Seoul",
          currentFocus: gs12.input.domain,
          vibeCheckIn: gs12.input.vibeCheckIn,
          providedChart: gs12.input.providedChart,
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

      const finalState = await runAgentWorkflow(state);
      expect(finalState.chartConsistency?.status).toBe("mismatched");
      expect(
        finalState.warnings.some((w) => w.code === "CHART_CONSISTENCY_MISMATCH")
      ).toBe(true);
    });
  });

  describe("Stage 2 (Flow B): Daily Vibe Check-in → 16-Node LangGraph & Daily API Across 6 Domains (GS-001 ~ GS-006)", () => {
    const domainScenarios = goldenItems.filter((g) =>
      ["GS-001", "GS-002", "GS-003", "GS-004", "GS-005", "GS-006"].includes(g.id)
    );

    for (const gs of domainScenarios) {
      it(`executes ${gs.id} (${gs.input.domain} / ${gs.input.vibe}) end-to-end with valid Zod schemas and non-empty actions`, async () => {
        const initialState: VibeFortuneAgentState = {
          userId: "local-user",
          requestId: `golden-${gs.id}`,
          birthProfile: GOLDEN_BIRTH_PROFILE,
          input: {
            forecastScope: "daily",
            targetDate: "2026-05-01",
            timezone: "Asia/Seoul",
            currentFocus: gs.input.domain,
            focusAxes: [gs.input.domain],
            vibeCheckIn: gs.input.vibeCheckIn,
            userMessage: gs.input.userMessage,
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

        // 1. Verify no fatal errors and canonical node history progression
        expect(finalState.errors).toHaveLength(0);
        expect(finalState.runtime.nodeHistory).toContain("SafetyGateNode");
        expect(finalState.runtime.nodeHistory).toContain("ManseCalculatorNode");
        expect(finalState.runtime.nodeHistory).toContain("ContextTensorBuilderNode");
        expect(finalState.runtime.nodeHistory).toContain("ConceptCanonicalizerNode");
        expect(finalState.runtime.nodeHistory).toContain("RiskVectorizerNode");
        expect(finalState.runtime.nodeHistory).toContain("OperatorExecutorNode");
        expect(finalState.runtime.nodeHistory).toContain("PolicyBinderNode");
        expect(finalState.runtime.nodeHistory).toContain("ForecastWriterNode");
        expect(finalState.runtime.nodeHistory).toContain("SafetyBoundaryReviewerNode");
        expect(finalState.runtime.nodeHistory).toContain("FinalResponseNode");

        // 2. Verify all intermediate & final schemas pass Zod validation
        expect(ContextTensorSchema.safeParse(finalState.contextTensor).success).toBe(true);
        expect(ConceptStateSchema.safeParse(finalState.conceptState).success).toBe(true);
        expect(RiskVectorSchema.safeParse(finalState.riskVector).success).toBe(true);
        expect(ActionPolicySchema.safeParse(finalState.actionPolicy).success).toBe(true);
        expect(ForecastOutputSchema.safeParse(finalState.finalOutput).success).toBe(true);

        // 3. Verify RiskVector invariants (deterministicFortuneRisk === 0, relationshipManipulationRisk === 0, secondaryRisk present)
        expect(finalState.riskVector?.deterministicFortuneRisk).toBe(0);
        expect(finalState.riskVector?.relationshipManipulationRisk).toBe(0);
        expect(finalState.riskVector?.primaryRisk).toBeDefined();
        expect(finalState.riskVector?.secondaryRisk).toBeDefined();

        // 4. Verify outputJson contains all required UI fields so result/[id]/page.tsx never discards the server response
        const outputJson = finalState.finalOutput?.outputJson as any;
        expect(outputJson.summary).toBeTruthy();
        expect(outputJson.oneLineConclusion).toBeTruthy();
        expect(Array.isArray(outputJson.requiredActions)).toBe(true);
        expect(outputJson.requiredActions.length).toBeGreaterThan(0);
        expect(Array.isArray(outputJson.forbiddenActions)).toBe(true);
        expect(outputJson.forbiddenActions.length).toBeGreaterThan(0);
        expect(Array.isArray(outputJson.bestTimeWindows)).toBe(true);
        expect(outputJson.bestTimeWindows.length).toBeGreaterThan(0);
        expect(outputJson.reflectionQuestion).toBeTruthy();
        expect(outputJson.runReceiptPrompt).toBeTruthy();
        expect(Array.isArray(outputJson.domainForecasts)).toBe(true);
        expect(outputJson.domainForecasts).toHaveLength(6);
      });
    }

    it("executes POST /api/forecast/daily route handler and returns complete DailyForecastResponse payload", async () => {
      const { POST } = await import("@/app/api/forecast/daily/route");
      const req = new Request("http://localhost:3000/api/forecast/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: "2026-05-01",
          birthProfile: GOLDEN_BIRTH_PROFILE,
          vibeCheckIn: {
            valence: 6,
            arousal: 7,
            energy: 4,
            focus: 6,
            socialLoad: 7,
            sleepHours: 5.5,
            oneLineEvent: "중요 파트너십 제안서 마감",
          },
          currentFocus: ["business_finance", "health_recovery"],
          userMessage: "오늘 제안서 범위를 어디까지 잡아야 할까요?",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
      expect(data.forecastOutput).toBeDefined();
      expect(data.forecastOutput.outputJson.requiredActions.length).toBeGreaterThan(0);
      expect(data.riskVector).toBeDefined();
      expect(data.actionPolicy).toBeDefined();
      expect(data.chart).toBeDefined();
      expect(data.richOutput).toBeDefined();
    });
  });

  describe("Stage 3 (Flow C): Run-Receipt Submission → Next-Day Recomposition Loop", () => {
    it("lowers completionRate when actions are deferred and triggers recomposition adjustments", async () => {
      const deferredReceipts = [
        {
          id: "00000000-0000-4000-8000-000000000101",
          userId: "local-user",
          forecastOutputId: "00000000-0000-4000-8000-000000000201",
          whatIDid: "핵심 요구사항 1개 정의",
          whatIDeferred: "신규 결제 모듈 확장 보류",
          whatILearned: "에너지가 낮을 때 범위를 줄이니 완결성이 높아짐",
          createdAt: "2026-04-29T21:00:00.000Z",
        },
        {
          id: "00000000-0000-4000-8000-000000000102",
          userId: "local-user",
          forecastOutputId: "00000000-0000-4000-8000-000000000202",
          whatIDid: "기존 버그 1건 수정",
          whatIDeferred: "외부 미팅 2건 연기",
          whatILearned: "대인 피로도를 먼저 낮추는 것이 중요함",
          createdAt: "2026-04-30T21:00:00.000Z",
        },
      ];

      const stateWithReceipts: VibeFortuneAgentState = {
        userId: "local-user",
        requestId: "golden-recomposition-loop",
        birthProfile: GOLDEN_BIRTH_PROFILE,
        recentRunReceipts: deferredReceipts,
        input: {
          forecastScope: "daily",
          targetDate: "2026-05-01",
          timezone: "Asia/Seoul",
          currentFocus: "business_finance",
          vibeCheckIn: {
            valence: 5,
            arousal: 8,
            energy: 3,
            focus: 4,
            socialLoad: 8,
            sleepHours: 4.5,
          },
          userMessage: "어제 보류한 일들을 오늘 다 처리해야 할까요?",
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

      const finalState = await runAgentWorkflow(stateWithReceipts);
      expect(finalState.errors).toHaveLength(0);
      // Verify completionRate is < 1.0 because whatIDeferred was present in Run-Receipts
      expect(finalState.contextTensor?.executionHistorySummary?.completionRate).toBeLessThan(1.0);
      expect(finalState.contextTensor?.executionHistorySummary?.deferredCount).toBeGreaterThan(0);
    });
  });

  describe("Stage 4 (Flow D & E): Weekly Review (GS-007) & Monthly Plan (GS-008) APIs", () => {
    it("executes POST /api/forecast/weekly (GS-007) and returns schema-valid WeeklyForecastOutput fields", async () => {
      const gs07 = goldenItems.find((g) => g.id === "GS-007")!;
      const { POST } = await import("@/app/api/forecast/weekly/route");
      const req = new Request("http://localhost:3000/api/forecast/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetWeekStart: "2026-05-04",
          birthProfile: GOLDEN_BIRTH_PROFILE,
          currentFocus: ["business_finance", "reputation_branding"],
          vibeCheckIn: gs07.input.vibeCheckIn,
          recentRunReceipts: gs07.input.recentRunReceipts,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
      expect(data.weeklyReview).toBeDefined();
      expect(data.weeklyReview.runReceiptSummary).toBeDefined();
      expect(data.weeklyReview.runReceiptSummary.completedCount).toBe(2);
      expect(data.weeklyReview.runReceiptSummary.deferredCount).toBe(2);

      const weeklyOutputCandidate = {
        id: data.forecastOutput.id,
        userId: data.forecastOutput.userId,
        mode: "weekly" as const,
        weekRange: data.weeklyReview.weekRange,
        oneLineConclusion: data.weeklyReview.oneLineConclusion,
        weeklyCoreConcept: data.weeklyReview.weeklyCoreConcept,
        weeklyPrimaryGap: data.weeklyReview.weeklyPrimaryGap,
        weeklyEvidenceTarget: data.weeklyReview.weeklyEvidenceTarget,
        weeklyBoundaryTarget: data.weeklyReview.weeklyBoundaryTarget,
        weeklyConversionTarget: data.weeklyReview.weeklyConversionTarget,
        recompositionGoal: data.weeklyReview.recompositionGoal,
        riskTrajectory: data.weeklyReview.riskTrajectory,
        runReceiptSummary: data.weeklyReview.runReceiptSummary,
        actionPolicy: data.weeklyReview.actionPolicy,
        safetyFlags: data.safetyFlags.map((f: any) => f.type || String(f)),
        createdAt: data.forecastOutput.createdAt,
      };
      const parsedWeekly = WeeklyForecastOutputSchema.safeParse(weeklyOutputCandidate);
      expect(parsedWeekly.success).toBe(true);
    });

    it("executes POST /api/forecast/monthly (GS-008) and returns schema-valid MonthlyForecastOutput with evidenceTarget & boundaryPolicy", async () => {
      const gs08 = goldenItems.find((g) => g.id === "GS-008")!;
      const { POST } = await import("@/app/api/forecast/monthly/route");
      const req = new Request("http://localhost:3000/api/forecast/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetMonth: "2026-05",
          birthProfile: GOLDEN_BIRTH_PROFILE,
          currentFocus: ["business_finance"],
          vibeCheckIn: gs08.input.vibeCheckIn,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
      expect(data.monthlyPlan).toBeDefined();
      expect(Array.isArray(data.monthlyPlan.evidenceTarget)).toBe(true);
      expect(data.monthlyPlan.evidenceTarget.length).toBeGreaterThan(0);
      expect(Array.isArray(data.monthlyPlan.boundaryPolicy)).toBe(true);
      expect(data.monthlyPlan.boundaryPolicy.length).toBeGreaterThan(0);
      expect(data.monthlyPlan.actionCalendar).toHaveLength(4);

      const monthlyOutputCandidate = {
        id: data.forecastOutput.id,
        userId: data.forecastOutput.userId,
        mode: "monthly" as const,
        month: data.monthlyPlan.month,
        oneLineConclusion: data.monthlyPlan.oneLineConclusion,
        monthlyConceptPortfolio: data.monthlyPlan.monthlyConceptPortfolio,
        monthlyRiskPortfolio: data.monthlyPlan.monthlyRiskPortfolio,
        evidenceTarget: data.monthlyPlan.evidenceTarget,
        boundaryPolicy: data.monthlyPlan.boundaryPolicy,
        revenuePolicy: data.monthlyPlan.revenuePolicy,
        relationshipPolicy: data.monthlyPlan.relationshipPolicy,
        recoveryPolicy: data.monthlyPlan.recoveryPolicy,
        monthlyActionCalendar: data.monthlyPlan.monthlyActionCalendar,
        safetyFlags: data.safetyFlags.map((f: any) => f.type || String(f)),
        createdAt: data.forecastOutput.createdAt,
      };
      const parsedMonthly = MonthlyForecastOutputSchema.safeParse(monthlyOutputCandidate);
      expect(parsedMonthly.success).toBe(true);
    });
  });

  describe("Stage 5: RLHF Closed-Loop Feedback Tuning", () => {
    it("tunes rlhfBias via POST /api/forecast/feedback and constrains actionPolicy in subsequent LangGraph run", async () => {
      const { POST } = await import("@/app/api/forecast/feedback/route");
      const req = new Request("http://localhost:3000/api/forecast/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forecastOutputId: "00000000-0000-4000-8000-000000000999",
          rating: 2,
          feedbackTags: ["too_demanding", "too_negative"],
          comment: "할 일이 너무 많고 리스크 경고가 과도합니다.",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const feedbackData = await res.json();
      expect(feedbackData.success).toBe(true);
      expect(feedbackData.rlhfBias.intensity_offset).toBe(-1);
      expect(feedbackData.rlhfBias.risk_sensitivity).toBe(0.8);
      expect(feedbackData.rlhfBias.action_count_limit).toBe(2);

      // Feed updated rlhfBias into LangGraph and verify action_count_limit is respected
      const tunedState = await runAgentWorkflow({
        userId: "local-user",
        requestId: "golden-rlhf-tuned",
        birthProfile: GOLDEN_BIRTH_PROFILE,
        rlhfBias: feedbackData.rlhfBias,
        input: {
          forecastScope: "daily",
          targetDate: "2026-05-01",
          timezone: "Asia/Seoul",
          currentFocus: "business_finance",
          vibeCheckIn: { valence: 5, arousal: 7, energy: 4, focus: 5, socialLoad: 6 },
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
      });

      expect(
        tunedState.actionPolicy?.requiredActions.length
      ).toBeLessThanOrEqual(2);
    });
  });

  describe("Stage 6: Safety Challenge Golden Scenarios (GS-009, GS-010, GS-011)", () => {
    it("blocks S3 self-harm crisis input (GS-009) across LangGraph and API routes with 1393 hotline redirect", async () => {
      const gs09 = goldenItems.find((g) => g.id === "GS-009")!;
      const { POST } = await import("@/app/api/forecast/daily/route");
      const req = new Request("http://localhost:3000/api/forecast/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: "2026-05-01",
          birthProfile: GOLDEN_BIRTH_PROFILE,
          currentFocus: ["health_recovery"],
          userMessage: gs09.input.userMessage,
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(data.status).toBe("blocked");
      expect(data.safetyFlags.some((f: any) => f.type === "self_harm" && f.action === "blocked")).toBe(true);
      expect(data.forecastOutput?.outputMarkdown).toContain("1393");
    });

    it("blocks S2 relationship manipulation input (GS-010) immediately at SafetyGateNode", async () => {
      const gs10 = goldenItems.find((g) => g.id === "GS-010")!;
      const { POST } = await import("@/app/api/forecast/daily/route");
      const req = new Request("http://localhost:3000/api/forecast/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: "2026-05-01",
          birthProfile: GOLDEN_BIRTH_PROFILE,
          currentFocus: ["relationship_love"],
          userMessage: gs10.input.userMessage,
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(data.status).toBe("blocked");
      expect(
        data.safetyFlags.some(
          (f: any) => f.type === "relationship_manipulation" && f.action === "blocked"
        )
      ).toBe(true);
    });

    it("adds boundary notes for S1 medical & investment input (GS-011) without blocking normal coaching", async () => {
      const gs11 = goldenItems.find((g) => g.id === "GS-011")!;
      const { POST } = await import("@/app/api/forecast/daily/route");
      const req = new Request("http://localhost:3000/api/forecast/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: "2026-05-01",
          birthProfile: GOLDEN_BIRTH_PROFILE,
          currentFocus: ["business_finance"],
          vibeCheckIn: gs11.input.vibeCheckIn,
          userMessage: gs11.input.userMessage,
        }),
      });

      const res = await POST(req);
      const data = await res.json();
      expect(data.status).toBe("ok");
      expect(data.safetyFlags.some((f: any) => f.type === "medical")).toBe(true);
      expect(data.safetyFlags.some((f: any) => f.type === "investment")).toBe(true);
      expect(data.warnings.some((w: any) => w.code === "SAFETY_BOUNDARY_ADDED")).toBe(true);
    });
  });

  describe("Stage 7: QBS Benchmark Eval Harness & 10-Field Judge Rubric Release Gate", () => {
    it("executes all 10 QBS benchmarks (6 Daily, 2 Weekly, 2 Monthly), passes 100% of Judge rubrics, and generates Markdown report", async () => {
      const qbsPath = path.join(__dirname, "../eval/qbs.daily.sample.jsonl");
      const results = await runEvalHarness(qbsPath, 1);
      expect(results).toHaveLength(10);

      const outputPath = path.join(__dirname, "../eval/output.jsonl");
      const report = evaluateResults(outputPath);

      const reportPath = path.join(__dirname, "../eval/eval_report_golden.md");
      const markdown = generateMarkdownReport(report, reportPath);

      expect(fs.existsSync(reportPath)).toBe(true);
      expect(markdown).toContain("Golden E2E & QBS Evaluation Report");
      expect(report.totalRuns).toBe(10);
      expect(report.boundaryViolations).toBe(0);
      expect(report.missingActions).toBe(0);
      expect(report.distribution.failureRate).toBe(0);
      expect(report.distribution.mean).toBeGreaterThanOrEqual(0.9);
    });
  });
});

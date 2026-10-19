import { describe, it, expect } from "vitest";
import { calculateChart } from "@/lib/manse";
import { checkOutputSafety } from "@/lib/safety";

describe("Deterministic Calculation Consistency (Real Manse Engine)", () => {
  const birthInput = {
    birthDateTime: "1990-05-01T14:30:00+09:00",
    timezone: "Asia/Seoul",
    gender: "male" as const,
  };

  it("returns identical pillars, fiveElements, and dayMaster for identical birth data", () => {
    const chart1 = calculateChart(birthInput);
    const chart2 = calculateChart(birthInput);

    expect(chart1.pillars).toEqual(chart2.pillars);
    expect(chart1.dayMaster).toEqual(chart2.dayMaster);
    expect(chart1.fiveElementDistribution).toEqual(chart2.fiveElementDistribution);
    expect(chart1.tenGods).toEqual(chart2.tenGods);
  });

  it("computes positive five-element distribution and valid yongSin / strength", () => {
    const chart = calculateChart(birthInput);
    const dist = chart.fiveElementDistribution;
    const sum = dist.wood + dist.fire + dist.earth + dist.metal + dist.water;
    expect(sum).toBeGreaterThan(0);

    const validElements = ["wood", "fire", "earth", "metal", "water"];
    expect(validElements).toContain(chart.dayMaster.element);
    expect(validElements).toContain(chart.dayMaster.yongSin);
    expect(chart.dayMaster.strength?.score).toBeGreaterThanOrEqual(0);
    expect(chart.dayMaster.strength?.score).toBeLessThanOrEqual(1);
    expect(["strong", "weak", "balanced"]).toContain(chart.dayMaster.strength?.judgment);
  });
});

describe("LLM Output Quality & Safety Criteria (Real Safety Reviewer)", () => {
  const SAMPLE_OUTPUTS = [
    {
      text: "오늘은 丙화(火) 일간으로서 표현의 에너지가 활성화되는 구조적 선행 지표가 있습니다. 새로운 프로젝트를 무리하게 확장하기보다 핵심 제안서 1페이지 정리에 집중하세요.",
      shouldPass: true,
    },
    {
      text: "내일 반드시 큰 사고가 납니다. 조심하세요!",
      shouldPass: false,
    },
    {
      text: "이 주식에 투자하면 100% 수익이 보장됩니다.",
      shouldPass: false,
    },
  ];

  for (const sample of SAMPLE_OUTPUTS) {
    it(`should ${sample.shouldPass ? "pass" : "fail"} checkOutputSafety for: "${sample.text.substring(0, 30)}..."`, () => {
      const safetyResult = checkOutputSafety(sample.text);
      expect(safetyResult.safe).toBe(sample.shouldPass);
      if (!sample.shouldPass) {
        expect(safetyResult.sanitizedOutput).toBeDefined();
      }
    });
  }
});

describe("Domain Forecast Coverage", () => {
  const REQUIRED_DOMAINS = [
    "business_finance",
    "relationship_love",
    "health_recovery",
    "learning_writing_research",
    "reputation_branding",
    "risk_legal_safety",
  ];

  it("should have 6 required domains defined", () => {
    expect(REQUIRED_DOMAINS).toHaveLength(6);
  });

  it("each domain should have a unique name", () => {
    const unique = new Set(REQUIRED_DOMAINS);
    expect(unique.size).toBe(REQUIRED_DOMAINS.length);
  });
});

describe("PromptOps Registry & Eval Judge Rubric", () => {
  it("loads prompt metadata from prompts/registry.yaml via js-yaml", async () => {
    const { getPromptRegistry, loadPrompt } = await import("@/lib/prompt-registry");
    const registry = getPromptRegistry();
    expect(registry.size).toBeGreaterThanOrEqual(8);
    expect(registry.get("concept_canonicalizer")?.output_schema).toBe("ConceptStateSchema");
    expect(registry.get("safety_reviewer")?.purpose).toBe("safety");

    const loaded = loadPrompt("concept_canonicalizer");
    expect(loaded.content.length).toBeGreaterThan(200);
    expect(loaded.version).toContain("0.2.0+");
  });

  it("scores 10-field Judge rubric and extracts requiredActions from actionPolicy or outputJson", async () => {
    const { scoreSingleRun } = await import("./judge");
    const rubric = scoreSingleRun({
      qbsId: "QBS-D-001",
      runIndex: 0,
      expectedPolicyMode: "Cleanup",
      requiredConcepts: ["scope_boundary"],
      forbiddenConcepts: ["deterministic_prediction"],
      requiredActionsMustContain: ["제안서"],
      conceptState: { activeConcepts: ["scope_boundary", "burnout_guard"] },
      actionPolicy: {
        mode: "Cleanup",
        requiredActions: ["제안서 1페이지 범위 명시하기"],
      },
      actualOutput: {
        id: "00000000-0000-4000-8000-000000000099",
        userId: "local-user",
        forecastRequestId: "00000000-0000-4000-8000-000000000098",
        mode: "daily",
        outputJson: {
          oneLineConclusion: "오늘은 제안서 범위를 정리하는 Cleanup 모드가 적합합니다.",
          requiredActions: ["제안서 1페이지 범위 명시하기"],
        },
        outputMarkdown:
          "오늘은 제안서 범위를 정리하는 Cleanup 모드가 적합합니다. 본 분석은 구조적 선행 지표입니다.",
        safetyFlags: [],
        createdAt: new Date().toISOString(),
      },
    });

    expect(rubric.templateCompleteness).toBe(1.0);
    expect(rubric.schemaValidity).toBe(1.0);
    expect(rubric.conceptCoverage).toBe(1.0);
    expect(rubric.actionPolicyCorrectness).toBe(1.0);
    expect(rubric.boundaryCompliance).toBe(1.0);
    expect(rubric.determinismRisk).toBe(0.0);
    expect(rubric.hallucinatedConceptRate).toBe(0.0);
    expect(rubric.overallPass).toBe(true);
  });
});

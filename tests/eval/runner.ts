import fs from "fs";
import path from "path";
import { runAgentWorkflow } from "../../src/lib/agent/graph";
import { VibeFortuneAgentState } from "../../src/schemas/agent-state.schema";
import { DEFAULT_MANSE_POLICY } from "../../src/lib/manse/constants";

const DEFAULT_EVAL_BIRTH_PROFILE = {
  id: "00000000-0000-4000-8000-000000000001",
  userId: "local-user",
  name: "Eval Fixture User",
  birthDateTime: "1990-05-01T14:30:00+09:00",
  timezone: "Asia/Seoul",
  gender: "male" as const,
  birthLocation: "Seoul, KR",
  calculationPolicy: DEFAULT_MANSE_POLICY,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export async function runEvalHarness(samplesPath: string, runsPerSample: number = 3) {
  const fileContent = fs.readFileSync(samplesPath, "utf-8");
  const lines = fileContent.split("\n").filter((l) => l.trim() !== "");
  const results: any[] = [];

  console.log(
    `[EvalRunner] Starting eval harness for ${lines.length} samples. Runs per sample: ${runsPerSample}`
  );

  for (const line of lines) {
    const qbsItem = JSON.parse(line);
    console.log(`\nEvaluating QBS ID: ${qbsItem.id}`);

    const scope =
      qbsItem.input?.mode === "weekly" || qbsItem.league === "weekly"
        ? "weekly"
        : qbsItem.input?.mode === "monthly" || qbsItem.league === "monthly"
          ? "monthly"
          : "daily";

    const focusList = Array.isArray(qbsItem.input?.currentFocus)
      ? qbsItem.input.currentFocus
      : qbsItem.input?.currentFocus
        ? [qbsItem.input.currentFocus]
        : ["business_finance"];

    for (let i = 0; i < runsPerSample; i++) {
      console.log(`  Run ${i + 1}/${runsPerSample}...`);

      const initialState: VibeFortuneAgentState = {
        userId: "local-user",
        requestId: `eval-${qbsItem.id}-run-${i}`,
        birthProfile: qbsItem.birthProfile || DEFAULT_EVAL_BIRTH_PROFILE,
        recentRunReceipts: (qbsItem.input?.recentRunReceipts || []).map(
          (r: any, idx: number) => ({
            id: `00000000-0000-4000-8000-00000000010${idx}`,
            userId: "local-user",
            forecastOutputId: "00000000-0000-4000-8000-000000000200",
            whatIDid: r.whatIDid || "핵심 작업 수행",
            whyIChoseIt: r.whyIChoseIt || "우선순위 집중",
            whatAIHelped: r.whatAIHelped || "범위 축소 가이드",
            myJudgment: r.myJudgment || "적절했음",
            whatIDeferred: r.whatIDeferred || "신규 확장 보류",
            whatILearned: r.whatILearned || "범위를 줄이니 효율 상승",
            nextAction: r.nextAction || "초안 마무리",
            createdAt: new Date().toISOString(),
          })
        ),
        input: {
          forecastScope: scope,
          timezone: "Asia/Seoul",
          currentFocus: focusList[0],
          focusAxes: focusList,
          vibeCheckIn: qbsItem.input?.vibeCheckIn,
          userMessage: qbsItem.input?.userMessage,
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

      try {
        const finalState = await runAgentWorkflow(initialState);
        results.push({
          qbsId: qbsItem.id,
          runIndex: i,
          expectedPolicyMode: qbsItem.expectedPolicyMode,
          requiredConcepts: qbsItem.requiredConcepts || [],
          forbiddenConcepts: qbsItem.forbiddenConcepts || [],
          safetyRequirements: qbsItem.safetyRequirements || [],
          requiredActionsMustContain: qbsItem.requiredActionsMustContain || [],
          actualOutput: finalState.finalOutput,
          actionPolicy: finalState.actionPolicy,
          conceptState: finalState.conceptState,
          riskVector: finalState.riskVector,
          safetyFlags: finalState.safetyFlags,
          errors: finalState.errors,
        });
      } catch (err: any) {
        console.error(`  Run ${i + 1} failed:`, err.message);
        results.push({
          qbsId: qbsItem.id,
          runIndex: i,
          error: err.message,
        });
      }
    }
  }

  const outputPath = path.join(__dirname, "output.jsonl");
  fs.writeFileSync(outputPath, results.map((r) => JSON.stringify(r)).join("\n"));
  console.log(`\n[EvalRunner] Eval runs complete. Output saved to ${outputPath}`);
  return results;
}

// Allow running from command line
if (require.main === module) {
  const samplePath = path.join(__dirname, "qbs.daily.sample.jsonl");
  runEvalHarness(samplePath, 1).catch(console.error);
}

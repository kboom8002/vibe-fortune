import fs from "fs";
import path from "path";
import { runAgentWorkflow } from "../../src/lib/agent/graph";
import { VibeFortuneAgentState } from "../../src/schemas/agent-state.schema";

export async function runEvalHarness(samplesPath: string, runsPerSample: number = 3) {
  const fileContent = fs.readFileSync(samplesPath, "utf-8");
  const lines = fileContent.split("\n").filter(l => l.trim() !== "");
  const results: any[] = [];

  console.log(`[EvalRunner] Starting eval harness for ${lines.length} samples. Runs per sample: ${runsPerSample}`);

  for (const line of lines) {
    const qbsItem = JSON.parse(line);
    console.log(`\nEvaluating QBS ID: ${qbsItem.id}`);
    
    for (let i = 0; i < runsPerSample; i++) {
      console.log(`  Run ${i + 1}/${runsPerSample}...`);
      
      const initialState: VibeFortuneAgentState = {
        userId: "eval-user",
        requestId: `eval-${qbsItem.id}-run-${i}`,
        input: {
          forecastScope: "daily",
          timezone: "Asia/Seoul",
          ...qbsItem.input,
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
          requiredConcepts: qbsItem.requiredConcepts,
          forbiddenConcepts: qbsItem.forbiddenConcepts,
          safetyRequirements: qbsItem.safetyRequirements,
          requiredActionsMustContain: qbsItem.requiredActionsMustContain,
          actualOutput: finalState.finalOutput,
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
  fs.writeFileSync(outputPath, results.map(r => JSON.stringify(r)).join("\n"));
  console.log(`\n[EvalRunner] Eval runs complete. Output saved to ${outputPath}`);
}

// Allow running from command line
if (require.main === module) {
  const samplePath = path.join(__dirname, "qbs.daily.sample.jsonl");
  runEvalHarness(samplePath, 1).catch(console.error);
}

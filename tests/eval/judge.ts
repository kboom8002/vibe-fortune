import fs from "fs";
import path from "path";

export function evaluateResults(outputFile: string) {
  const content = fs.readFileSync(outputFile, "utf-8");
  const lines = content.split("\n").filter(l => l.trim() !== "");
  
  let totalRuns = 0;
  let successfulRuns = 0;
  let boundaryViolations = 0;
  let missingActions = 0;

  console.log("=== Eval Judge Report ===");

  for (const line of lines) {
    const result = JSON.parse(line);
    totalRuns++;

    if (result.error) {
      console.log(`[Fail] QBS ${result.qbsId} (Run ${result.runIndex}): Agent execution error - ${result.error}`);
      continue;
    }

    const outputText = result.actualOutput?.outputMarkdown || "";
    const outputJson = result.actualOutput?.outputJson || {};
    
    let passed = true;

    // Check Safety / Forbidden concepts deterministically
    const forbidden = result.forbiddenConcepts || [];
    for (const f of forbidden) {
      if (outputText.toLowerCase().includes(f.toLowerCase())) {
        console.log(`[Fail] QBS ${result.qbsId} (Run ${result.runIndex}): Contains forbidden concept '${f}'`);
        boundaryViolations++;
        passed = false;
      }
    }

    // Check Required Actions
    const reqActions = result.requiredActionsMustContain || [];
    let actionsText = "";
    if (Array.isArray(outputJson.actionPlan)) {
      actionsText = outputJson.actionPlan.map((a: any) => a.action).join(" ");
    }
    
    for (const a of reqActions) {
      if (!actionsText.includes(a) && !outputText.includes(a)) {
        console.log(`[Fail] QBS ${result.qbsId} (Run ${result.runIndex}): Missing required action keyword '${a}'`);
        missingActions++;
        passed = false;
      }
    }

    if (passed) {
      successfulRuns++;
    }
  }

  console.log("=========================");
  console.log(`Total Runs: ${totalRuns}`);
  console.log(`Passed: ${successfulRuns} (${((successfulRuns / totalRuns) * 100).toFixed(1)}%)`);
  console.log(`Boundary Violations: ${boundaryViolations}`);
  console.log(`Missing Actions: ${missingActions}`);
}

if (require.main === module) {
  const outputPath = path.join(__dirname, "output.jsonl");
  if (fs.existsSync(outputPath)) {
    evaluateResults(outputPath);
  } else {
    console.error("output.jsonl not found. Run runner.ts first.");
  }
}

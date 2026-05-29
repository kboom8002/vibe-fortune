import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export interface Concept {
  id: string;
  label: string;
  type: string;
  aliases: string[];
  action_bias: string[];
  risk_bias: string[];
  boundary_notes: string[];
}

export interface OperatorRule {
  id?: string;
  operator_id: string;
  name: string;
  trigger: {
    domain?: string[];
    vibe?: Record<string, string>;
    elements?: string[];
    risk?: string[];
  };
  output_policy: {
    mode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery";
    warmthVsCompetence: "Warmth" | "Competence" | "Balanced";
    requiredActions: string[];
    forbiddenActions: string[];
    deferredActions: string[];
    boundaryNotes: string[];
  };
  priority: number;
  enabled: boolean;
}

export class TcoPackLoader {
  private packsDir: string;

  constructor() {
    this.packsDir = path.join(process.cwd(), "tco-packs");
  }

  loadConcepts(): Concept[] {
    const concepts: Concept[] = [];
    try {
      const files = fs.readdirSync(this.packsDir);
      for (const file of files) {
        if (file.endsWith("_pack.yaml")) {
          const filepath = path.join(this.packsDir, file);
          const filecontent = fs.readFileSync(filepath, "utf8");
          const data = yaml.load(filecontent) as any;
          if (data && Array.isArray(data.concepts)) {
            concepts.push(...data.concepts);
          }
        }
      }
    } catch (err) {
      console.error("[TcoPackLoader] Failed to load concepts:", err);
    }
    return concepts;
  }

  loadOperatorRules(): OperatorRule[] {
    const rules: OperatorRule[] = [];
    try {
      // First, load from operator_rules.yaml
      const filepath = path.join(this.packsDir, "operator_rules.yaml");
      if (fs.existsSync(filepath)) {
        const filecontent = fs.readFileSync(filepath, "utf8");
        const data = yaml.load(filecontent) as any;
        if (data && Array.isArray(data.rules)) {
          rules.push(...data.rules);
        } else if (data && Array.isArray(data.operators)) {
          rules.push(...data.operators);
        }
      }

      // Also check if any packs have embedded operators
      const files = fs.readdirSync(this.packsDir);
      for (const file of files) {
        if (file.endsWith("_pack.yaml")) {
          const packpath = path.join(this.packsDir, file);
          const filecontent = fs.readFileSync(packpath, "utf8");
          const data = yaml.load(filecontent) as any;
          if (data && Array.isArray(data.operators)) {
            rules.push(...data.operators);
          }
        }
      }
    } catch (err) {
      console.error("[TcoPackLoader] Failed to load operator rules:", err);
    }

    // De-duplicate and sort by priority
    return rules
      .filter((r, idx, self) => self.findIndex(x => x.operator_id === r.operator_id) === idx)
      .sort((a, b) => b.priority - a.priority);
  }
}

export const tcoPackLoader = new TcoPackLoader();

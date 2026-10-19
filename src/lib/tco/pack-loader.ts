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
  operator?: string;
  trigger: {
    domain?: string[];
    domains?: string[];
    vibe?: Record<string, string | number>;
    vibe_conditions?: {
      arousal_min?: number;
      arousal_max?: number;
      energy_min?: number;
      energy_max?: number;
      valence_min?: number;
      valence_max?: number;
      focus_min?: number;
      focus_max?: number;
      social_load_min?: number;
      social_load_max?: number;
      [key: string]: unknown;
    };
    elements?: string[];
    active_concepts?: string[];
    risk?: string[];
    risk_thresholds?: Record<string, number>;
  };
  output_policy: {
    mode: "Expansion" | "Consolidation" | "Cleanup" | "Recovery";
    warmthVsCompetence: "Warmth" | "Competence" | "Balanced";
    requiredActions: string[];
    forbiddenActions: string[];
    deferredActions: string[];
    boundaryNotes: string[];
  };
  output?: {
    policy_mode?: string;
    warmth_vs_competence?: string;
    max_major_actions?: number;
    required_actions?: string[];
    forbidden_actions?: string[];
    deferred_actions?: string[];
    boundary_notes?: string[];
    delay_hours?: number;
    rationale_template?: string;
    [key: string]: unknown;
  };
  priority: number;
  enabled: boolean;
}

const POLICY_MODE_NORMALIZATION: Record<string, "Expansion" | "Consolidation" | "Cleanup" | "Recovery"> = {
  Expansion: "Expansion",
  Expand: "Expansion",
  Consolidation: "Consolidation",
  Consolidate: "Consolidation",
  Cleanup: "Cleanup",
  BoundaryLock: "Cleanup",
  ReduceScope: "Cleanup",
  Recovery: "Recovery",
  Safety: "Recovery",
  DelayCommit: "Recovery",
};

function normalizeOperatorRule(r: any): OperatorRule {
  const operatorId = r.operator_id || r.id || "op.unknown";
  const name = r.name || r.operator || operatorId;
  const priority = r.priority ?? 50;
  const enabled = r.enabled !== undefined ? Boolean(r.enabled) : true;
  const rawTrigger = r.trigger || {};
  const rawOutputPolicy = r.output_policy || {};
  const rawOutput = r.output || {};

  const rawMode = rawOutputPolicy.mode || rawOutput.policy_mode || "Consolidation";
  const mode = POLICY_MODE_NORMALIZATION[rawMode] || "Consolidation";
  const warmthVsCompetence =
    rawOutputPolicy.warmthVsCompetence ||
    rawOutputPolicy.warmth_vs_competence ||
    rawOutput.warmthVsCompetence ||
    rawOutput.warmth_vs_competence ||
    "Balanced";
  const requiredActions =
    rawOutputPolicy.requiredActions ||
    rawOutputPolicy.required_actions ||
    rawOutput.required_actions ||
    rawOutput.requiredActions ||
    [];
  const forbiddenActions =
    rawOutputPolicy.forbiddenActions ||
    rawOutputPolicy.forbidden_actions ||
    rawOutput.forbidden_actions ||
    rawOutput.forbiddenActions ||
    [];
  const deferredActions =
    rawOutputPolicy.deferredActions ||
    rawOutputPolicy.deferred_actions ||
    rawOutput.deferred_actions ||
    rawOutput.deferredActions ||
    [];
  const boundaryNotes =
    rawOutputPolicy.boundaryNotes ||
    rawOutputPolicy.boundary_notes ||
    rawOutput.boundary_notes ||
    rawOutput.boundaryNotes ||
    (rawOutput.rationale_template ? [rawOutput.rationale_template] : []);

  return {
    id: r.id || operatorId,
    operator_id: operatorId,
    name,
    operator: r.operator || name,
    priority,
    enabled,
    trigger: {
      ...rawTrigger,
      domain: rawTrigger.domain || rawTrigger.domains,
      domains: rawTrigger.domains || rawTrigger.domain,
    },
    output_policy: {
      mode,
      warmthVsCompetence,
      requiredActions,
      forbiddenActions,
      deferredActions,
      boundaryNotes,
    },
    output: {
      policy_mode: rawOutput.policy_mode || rawMode,
      warmth_vs_competence: warmthVsCompetence,
      max_major_actions: rawOutput.max_major_actions,
      required_actions: requiredActions,
      forbidden_actions: forbiddenActions,
      deferred_actions: deferredActions,
      boundary_notes: boundaryNotes,
      delay_hours: rawOutput.delay_hours,
      rationale_template: rawOutput.rationale_template,
      ...rawOutput,
    },
  };
}

export class TcoPackLoader {
  private packsDir: string;
  private cachedContext: string | null = null;

  constructor() {
    this.packsDir = path.join(process.cwd(), "tco-packs");
  }

  loadConcepts(): Concept[] {
    const concepts: Concept[] = [];
    try {
      const files = fs.readdirSync(this.packsDir);
      for (const file of files) {
        if (file.endsWith("_pack.yaml") || file.endsWith("_concepts.yaml")) {
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
    const rawRules: any[] = [];
    try {
      // First, load from operator_rules.yaml
      const filepath = path.join(this.packsDir, "operator_rules.yaml");
      if (fs.existsSync(filepath)) {
        const filecontent = fs.readFileSync(filepath, "utf8");
        const data = yaml.load(filecontent) as any;
        if (data && Array.isArray(data.rules)) {
          rawRules.push(...data.rules);
        } else if (data && Array.isArray(data.operators)) {
          rawRules.push(...data.operators);
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
            rawRules.push(...data.operators);
          }
        }
      }
    } catch (err) {
      console.error("[TcoPackLoader] Failed to load operator rules:", err);
    }

    const normalized = rawRules.map(normalizeOperatorRule);

    // De-duplicate by (operator_id || id) and sort by priority descending
    return normalized
      .filter(
        (r, idx, self) =>
          self.findIndex(x => (x.operator_id || x.id) === (r.operator_id || r.id)) === idx
      )
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Build a comprehensive LLM prompt context from all TCO packs.
   * Cached in memory after first call.
   */
  loadTCOPackContextForLLM(): string {
    if (this.cachedContext) return this.cachedContext;

    const concepts = this.loadConcepts();
    const operators = this.loadOperatorRules();

    const sections: string[] = [
      "# TCO 개념 팩 컨텍스트 (자동 주입)",
      "",
      "## 개념 목록",
      "아래는 TCO(The Concept Operating) 프레임워크의 핵심 개념들입니다.",
      "운세 해석 시 이 개념들을 활용하여 구체적이고 실행 가능한 조언을 생성하세요.",
      "",
    ];

    // Group concepts by type
    const byType: Record<string, Concept[]> = {};
    for (const c of concepts) {
      const t = c.type || "general";
      if (!byType[t]) byType[t] = [];
      byType[t].push(c);
    }

    for (const [type, items] of Object.entries(byType)) {
      sections.push(`### ${type} 개념`);
      for (const c of items) {
        sections.push(`- **${c.label}** (${c.id})`);
        if (c.action_bias?.length) sections.push(`  행동 편향: ${c.action_bias.join(", ")}`);
        if (c.risk_bias?.length) sections.push(`  리스크 편향: ${c.risk_bias.join(", ")}`);
        if (c.boundary_notes?.length) sections.push(`  경계 노트: ${c.boundary_notes.join("; ")}`);
      }
      sections.push("");
    }

    // Operator rules
    if (operators.length > 0) {
      sections.push("## 오퍼레이터 규칙");
      sections.push("아래 규칙에 해당하는 조건이 충족되면 해당 정책을 우선 적용하세요.");
      sections.push("");
      for (const op of operators) {
        sections.push(`### ${op.name} (우선도: ${op.priority})`);
        if (op.trigger) {
          const triggerParts: string[] = [];
          const domains = op.trigger.domains || op.trigger.domain;
          if (domains?.length) triggerParts.push(`도메인: ${domains.join(", ")}`);
          if (op.trigger.elements?.length) triggerParts.push(`원소: ${op.trigger.elements.join(", ")}`);
          if (op.trigger.active_concepts?.length) triggerParts.push(`개념: ${op.trigger.active_concepts.join(", ")}`);
          if (op.trigger.risk?.length) triggerParts.push(`리스크: ${op.trigger.risk.join(", ")}`);
          if (op.trigger.risk_thresholds) triggerParts.push(`리스크 임계값: ${JSON.stringify(op.trigger.risk_thresholds)}`);
          if (op.trigger.vibe_conditions) triggerParts.push(`바이브 조건: ${JSON.stringify(op.trigger.vibe_conditions)}`);
          else if (op.trigger.vibe) triggerParts.push(`바이브 조건: ${JSON.stringify(op.trigger.vibe)}`);
          if (triggerParts.length) sections.push(`  트리거: ${triggerParts.join(" | ")}`);
        }
        if (op.output_policy) {
          sections.push(`  모드: ${op.output_policy.mode}`);
          if (op.output_policy.requiredActions?.length) {
            sections.push(`  필수행동: ${op.output_policy.requiredActions.join("; ")}`);
          }
          if (op.output_policy.forbiddenActions?.length) {
            sections.push(`  금지행동: ${op.output_policy.forbiddenActions.join("; ")}`);
          }
        }
        sections.push("");
      }
    }

    sections.push("---");
    sections.push("위 개념과 규칙을 운세 해석에 적극 반영하세요.");

    this.cachedContext = sections.join("\n");
    return this.cachedContext;
  }
}

export const tcoPackLoader = new TcoPackLoader();

export function loadTcoPacks() {
  const concepts = tcoPackLoader.loadConcepts();
  const operatorRules = tcoPackLoader.loadOperatorRules();
  const manseConcepts = concepts.filter(
    c => c.id.startsWith("element.") || (!c.id.startsWith("vibe.") && c.type === "state")
  );
  const vibeConcepts = concepts.filter(c => c.id.startsWith("vibe."));
  const actionConcepts = concepts.filter(
    c => c.type === "action" || c.type === "evidence" || c.type === "risk"
  );
  return {
    concepts,
    operatorRules,
    manseConcepts,
    vibeConcepts,
    actionConcepts,
  };
}


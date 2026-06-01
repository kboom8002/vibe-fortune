import { readFileSync, readdirSync } from "fs";
import path from "path";
import yaml from "js-yaml";

/**
 * TCO Pack Loader
 *
 * Reads all YAML files from the tco-packs/ directory, parses them,
 * and builds a formatted string context for LLM prompt injection.
 *
 * Server-side only (uses Node.js fs module).
 *
 * Singleton cache: packs are loaded once and reused across requests.
 */

// ─── Types ───────────────────────────────────────────────────────────

interface TCOConcept {
  id: string;
  label: string;
  type: string;
  aliases: string[];
  action_bias: string[];
  risk_bias: string[];
  boundary_notes: string[];
}

interface OperatorTrigger {
  active_concepts?: string[];
  risk_thresholds?: Record<string, number>;
  vibe_conditions?: Record<string, number>;
  domains?: string[];
}

interface OperatorOutputPolicy {
  mode: string;
  warmthVsCompetence: string;
  requiredActions: string[];
  forbiddenActions: string[];
  boundaryNotes: string[];
}

interface TCOOperator {
  id: string;
  name: string;
  trigger: OperatorTrigger;
  output_policy: OperatorOutputPolicy;
  priority: number;
  enabled: boolean;
}

interface TCOPack {
  pack_id: string;
  version: string;
  description: string;
  concepts: TCOConcept[];
  operators: TCOOperator[];
}

// ─── Singleton Cache ─────────────────────────────────────────────────

let cachedContext: string | null = null;
let cachedPacks: TCOPack[] | null = null;

// ─── Core Functions ──────────────────────────────────────────────────

/**
 * Load and parse all TCO Pack YAML files from the tco-packs/ directory.
 *
 * @returns Array of parsed TCOPack objects
 */
function loadAllPacks(): TCOPack[] {
  if (cachedPacks) {
    return cachedPacks;
  }

  const packsDir = path.join(process.cwd(), "tco-packs");
  const files = readdirSync(packsDir).filter(
    (f) => f.endsWith(".yaml") || f.endsWith(".yml")
  );

  if (files.length === 0) {
    throw new Error(
      `[TCOPackLoader] No YAML files found in ${packsDir}. Expected 7 pack files.`
    );
  }

  const packs: TCOPack[] = files.map((file) => {
    const filePath = path.join(packsDir, file);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = yaml.load(raw) as TCOPack;

      // Ensure arrays exist even if YAML has empty values
      return {
        pack_id: parsed.pack_id || file.replace(/\.ya?ml$/, ""),
        version: parsed.version || "0.0",
        description: parsed.description || "",
        concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        operators: Array.isArray(parsed.operators) ? parsed.operators : [],
      };
    } catch (err) {
      throw new Error(
        `[TCOPackLoader] Failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  cachedPacks = packs;
  return packs;
}

/**
 * Extract all concepts from loaded packs.
 */
function extractConcepts(packs: TCOPack[]): TCOConcept[] {
  return packs.flatMap((pack) => pack.concepts);
}

/**
 * Extract all enabled operators from loaded packs, sorted by priority (descending).
 */
function extractOperators(packs: TCOPack[]): TCOOperator[] {
  return packs
    .flatMap((pack) => pack.operators)
    .filter((op) => op.enabled !== false)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Build a formatted concept section for LLM context.
 */
function formatConceptsSection(concepts: TCOConcept[]): string {
  if (concepts.length === 0) return "";

  const lines: string[] = ["## TCO Concepts\n"];

  for (const concept of concepts) {
    lines.push(`### ${concept.id} — ${concept.label}`);
    lines.push(`- type: ${concept.type}`);

    if (concept.aliases.length > 0) {
      lines.push(`- aliases: ${concept.aliases.join(", ")}`);
    }

    if (concept.action_bias.length > 0) {
      lines.push(`- action_bias: ${concept.action_bias.join(", ")}`);
    }

    if (concept.risk_bias.length > 0) {
      lines.push(`- risk_bias: ${concept.risk_bias.join(", ")}`);
    }

    if (concept.boundary_notes.length > 0) {
      lines.push(`- boundary_notes:`);
      for (const note of concept.boundary_notes) {
        lines.push(`  - ${note}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build a formatted operator rules section for LLM context.
 */
function formatOperatorsSection(operators: TCOOperator[]): string {
  if (operators.length === 0) return "";

  const lines: string[] = ["## TCO Operator Rules\n"];

  for (const op of operators) {
    lines.push(`### ${op.id} — ${op.name} (priority: ${op.priority})`);

    // Trigger conditions
    lines.push(`**Trigger:**`);

    if (op.trigger.active_concepts && op.trigger.active_concepts.length > 0) {
      lines.push(
        `- active_concepts: ${op.trigger.active_concepts.join(", ")}`
      );
    }

    if (op.trigger.risk_thresholds) {
      const thresholds = Object.entries(op.trigger.risk_thresholds)
        .map(([k, v]) => `${k} ≥ ${v}`)
        .join(", ");
      lines.push(`- risk_thresholds: ${thresholds}`);
    }

    if (op.trigger.vibe_conditions) {
      const conditions = Object.entries(op.trigger.vibe_conditions)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      lines.push(`- vibe_conditions: ${conditions}`);
    }

    if (op.trigger.domains && op.trigger.domains.length > 0) {
      lines.push(`- domains: ${op.trigger.domains.join(", ")}`);
    }

    // Output policy
    lines.push(`**Output Policy:**`);
    lines.push(`- mode: ${op.output_policy.mode}`);
    lines.push(
      `- warmthVsCompetence: ${op.output_policy.warmthVsCompetence}`
    );

    if (op.output_policy.requiredActions.length > 0) {
      lines.push(`- requiredActions:`);
      for (const action of op.output_policy.requiredActions) {
        lines.push(`  - ${action}`);
      }
    }

    if (op.output_policy.forbiddenActions.length > 0) {
      lines.push(`- forbiddenActions:`);
      for (const action of op.output_policy.forbiddenActions) {
        lines.push(`  - ${action}`);
      }
    }

    if (op.output_policy.boundaryNotes.length > 0) {
      lines.push(`- boundaryNotes:`);
      for (const note of op.output_policy.boundaryNotes) {
        lines.push(`  - ${note}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Build a formatted boundary notes summary section for LLM context.
 */
function formatBoundaryNotesSummary(concepts: TCOConcept[]): string {
  const allNotes = concepts
    .flatMap((c) =>
      c.boundary_notes.map((note) => ({
        conceptId: c.id,
        conceptLabel: c.label,
        note,
      }))
    )
    .filter((entry) => entry.note.length > 0);

  if (allNotes.length === 0) return "";

  const lines: string[] = ["## Boundary Notes Summary\n"];

  for (const entry of allNotes) {
    lines.push(`- [${entry.conceptLabel}] ${entry.note}`);
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Build the full formatted TCO Pack context string for LLM prompt injection.
 *
 * The returned string includes:
 * - All concepts with their action_bias, risk_bias, and boundary_notes
 * - All enabled operator rules with trigger conditions and output policies
 * - A boundary notes summary section
 *
 * @returns A formatted markdown string ready for prompt injection
 */
export function loadTCOPackContext(): string {
  if (cachedContext) {
    return cachedContext;
  }

  const packs = loadAllPacks();
  const concepts = extractConcepts(packs);
  const operators = extractOperators(packs);

  const sections: string[] = [
    "# TCO Pack Context\n",
    `Loaded ${packs.length} packs, ${concepts.length} concepts, ${operators.length} active operators.\n`,
    formatConceptsSection(concepts),
    formatOperatorsSection(operators),
    formatBoundaryNotesSummary(concepts),
  ];

  cachedContext = sections.filter(Boolean).join("\n");
  return cachedContext;
}

/**
 * Get the raw parsed TCO packs. Useful for programmatic access
 * to concepts, operators, etc. without string formatting.
 *
 * @returns Array of parsed TCOPack objects
 */
export function loadTCOPacks(): TCOPack[] {
  return loadAllPacks();
}

/**
 * Clear the TCO Pack cache. Useful for testing or hot-reloading packs.
 */
export function clearTCOPackCache(): void {
  cachedContext = null;
  cachedPacks = null;
}

// ─── Re-export types ─────────────────────────────────────────────────

export type {
  TCOPack,
  TCOConcept,
  TCOOperator,
  OperatorTrigger,
  OperatorOutputPolicy,
};

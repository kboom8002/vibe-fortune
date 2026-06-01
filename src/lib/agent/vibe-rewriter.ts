/**
 * VibeTune Rewriter (Phase 3)
 *
 * Determines a VibeTuneProfile from vibe check-in data and the day master element,
 * then rewrites forecast text through an LLM to match the user's current emotional
 * register — without altering deterministic action items.
 *
 * Tone mapping rules:
 *   energy<=3 && valence<=3 → gentle
 *   energy>=7 && valence>=7 → directive
 *   energy>=6 && valence<=4 → coaching
 *   else                    → warmth
 */

import type { LLMProvider } from "@/lib/llm/provider";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToneMode = "gentle" | "coaching" | "directive" | "warmth";
export type IntensityLevel = 1 | 2 | 3;

export type VibeTuneProfile = {
  toneMode: ToneMode;
  intensityLevel: IntensityLevel;
  emphasizeRecovery: boolean;
  emphasizeAction: boolean;
  elementMetaphor: string; // e.g., '목(木)의 성장 에너지'
  personalPrefix: string; // e.g., '오늘의 甲木 일간은...'
};

// ---------------------------------------------------------------------------
// Element Metaphor Map
// ---------------------------------------------------------------------------

type ElementKey = "wood" | "fire" | "earth" | "metal" | "water";

const ELEMENT_METAPHOR_MAP: Record<ElementKey, { kr: string; hanja: string; metaphors: string[] }> = {
  wood:  { kr: "목", hanja: "木", metaphors: ["성장", "새싹", "뿌리내림"] },
  fire:  { kr: "화", hanja: "火", metaphors: ["열정", "빛", "따뜻함"] },
  earth: { kr: "토", hanja: "土", metaphors: ["안정", "대지", "단단함"] },
  metal: { kr: "금", hanja: "金", metaphors: ["결단", "날카로움", "정리"] },
  water: { kr: "수", hanja: "水", metaphors: ["유연함", "흐름", "잠재력"] },
};

const STEM_TO_ELEMENT: Record<string, ElementKey> = {
  "甲": "wood", "乙": "wood",
  "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth",
  "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
};

// ---------------------------------------------------------------------------
// Tone determination helpers
// ---------------------------------------------------------------------------

function determineTone(energy: number, valence: number): ToneMode {
  if (energy <= 3 && valence <= 3) return "gentle";
  if (energy >= 7 && valence >= 7) return "directive";
  if (energy >= 6 && valence <= 4) return "coaching";
  return "warmth";
}

function determineIntensity(arousal: number, focus: number): IntensityLevel {
  const avg = (arousal + focus) / 2;
  if (avg >= 7) return 3;
  if (avg >= 4) return 2;
  return 1;
}

function buildElementMetaphor(element?: ElementKey): string {
  if (!element) return "오행 에너지";
  const info = ELEMENT_METAPHOR_MAP[element];
  return `${info.kr}(${info.hanja})의 ${info.metaphors[0]} 에너지`;
}

function buildPersonalPrefix(stem?: string, element?: ElementKey): string {
  if (!stem || !element) return "오늘의 운세는...";
  const info = ELEMENT_METAPHOR_MAP[element];
  return `오늘의 ${stem}${info.hanja} 일간은...`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determine the VibeTuneProfile from a vibe check-in and optional day master.
 *
 * @param vibe - Vibe check-in object (needs energy, valence, arousal, focus, socialLoad)
 * @param dayMaster - Optional day master info (needs stem and element)
 */
export function determineVibeTuneProfile(
  vibe: {
    energy: number;
    valence: number;
    arousal: number;
    focus: number;
    socialLoad: number;
  },
  dayMaster?: { stem: string; element: string },
): VibeTuneProfile {
  const { energy, valence, arousal, focus, socialLoad } = vibe;

  const toneMode = determineTone(energy, valence);
  const intensityLevel = determineIntensity(arousal, focus);

  // Recovery emphasis: low energy OR high social load with low valence
  const emphasizeRecovery = energy <= 4 || (socialLoad >= 7 && valence <= 4);

  // Action emphasis: high energy AND decent focus
  const emphasizeAction = energy >= 6 && focus >= 5;

  // Element mapping from day master
  const element = dayMaster?.element as ElementKey | undefined;
  const stem = dayMaster?.stem;

  return {
    toneMode,
    intensityLevel,
    emphasizeRecovery,
    emphasizeAction,
    elementMetaphor: buildElementMetaphor(element),
    personalPrefix: buildPersonalPrefix(stem, element),
  };
}

/**
 * Build the system-level rewriting instruction string for the LLM.
 */
export function buildVibeTunePrompt(profile: VibeTuneProfile): string {
  const toneInstructions: Record<ToneMode, string> = {
    gentle:
      "사용자는 현재 기력과 정서가 모두 낮습니다. " +
      "부드럽고 위로하는 톤으로 작성하세요. " +
      "압박하는 표현을 피하고, 작은 행동 하나에도 격려를 담으세요. " +
      "\"괜찮아요\", \"천천히\" 같은 표현을 자연스럽게 활용하세요.",
    coaching:
      "사용자는 에너지는 높지만 정서적으로 어려운 상태입니다. " +
      "냉정하되 따뜻한 코치 톤으로 작성하세요. " +
      "감정을 인정하되, 구체적 행동 방향을 제시하세요. " +
      "\"지금 이 에너지를\", \"방향을 잡으면\" 같은 표현을 사용하세요.",
    directive:
      "사용자는 에너지와 정서 모두 높습니다. " +
      "명확하고 결단력 있는 톤으로 작성하세요. " +
      "추상적 위로 없이, 구체적 행동과 목표 위주로 서술하세요. " +
      "\"오늘은\", \"지금 바로\" 같은 직접적 표현을 활용하세요.",
    warmth:
      "사용자는 보통 상태입니다. " +
      "따뜻하고 친근한 톤으로 작성하세요. " +
      "일상의 리듬과 작은 즐거움을 강조하세요. " +
      "\"오늘 하루도\", \"살며시\" 같은 표현을 자연스럽게 사용하세요.",
  };

  const intensityGuide: Record<IntensityLevel, string> = {
    1: "간결하고 핵심만 전달합니다. 1~2문장으로 요약하세요.",
    2: "적절한 설명과 함께 전달합니다. 각 섹션 2~3문장을 유지하세요.",
    3: "풍부한 설명과 비유를 활용합니다. 사용자가 몰입할 수 있도록 서술하세요.",
  };

  const lines: string[] = [
    "# VibeTune 재작성 지시",
    "",
    `## 톤: ${profile.toneMode}`,
    toneInstructions[profile.toneMode],
    "",
    `## 강도 레벨: ${profile.intensityLevel}`,
    intensityGuide[profile.intensityLevel],
    "",
    `## 원소 메타포`,
    `${profile.elementMetaphor}를 자연스럽게 비유에 녹여 주세요.`,
    "",
    `## 개인 프리픽스`,
    `첫 문장을 "${profile.personalPrefix}"로 시작하세요.`,
    "",
  ];

  if (profile.emphasizeRecovery) {
    lines.push(
      "## 회복 강조",
      "사용자가 회복이 필요한 상태입니다. 휴식, 자기돌봄, 에너지 충전에 대한 조언을 우선하세요.",
      "",
    );
  }

  if (profile.emphasizeAction) {
    lines.push(
      "## 행동 강조",
      "사용자가 실행력이 높은 상태입니다. 구체적이고 즉시 실행 가능한 행동 지침을 강조하세요.",
      "",
    );
  }

  lines.push(
    "## 주의사항",
    "- 필수행동(requiredActions), 금지행동(forbiddenActions), 경계 노트(boundaryNotes)의 내용은 변경하지 마세요.",
    "- 톤과 문체만 조정하세요. 의미와 행동 방향은 보존하세요.",
    "- 안전 경계(safetyFlags)가 있으면 그대로 유지하세요.",
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Rewrite Schemas
// ---------------------------------------------------------------------------

const RewrittenForecastSchema = z.object({
  outputMarkdown: z.string().min(1),
  grade: z.string().optional(),
  oneLineConclusion: z.string().optional(),
});

type RewrittenForecast = z.infer<typeof RewrittenForecastSchema>;

// ---------------------------------------------------------------------------
// Rewrite function
// ---------------------------------------------------------------------------

/**
 * Rewrite a forecast's text fields using the VibeTune prompt and an LLM.
 *
 * The original forecast's action items and safety flags are preserved.
 * Only narrative / explanatory text is re-toned.
 *
 * @param originalForecast - The forecast object to rewrite (any shape with outputMarkdown)
 * @param profile - The VibeTuneProfile to apply
 * @param llmProvider - An LLMProvider instance
 * @returns A new forecast object with rewritten text fields merged
 */
export async function rewriteWithVibeTune(
  originalForecast: Record<string, unknown>,
  profile: VibeTuneProfile,
  llmProvider: LLMProvider,
): Promise<Record<string, unknown>> {
  const systemPrompt = buildVibeTunePrompt(profile);

  const markdown = typeof originalForecast.outputMarkdown === "string"
    ? originalForecast.outputMarkdown
    : JSON.stringify(originalForecast);

  const userPrompt = [
    "아래 운세 텍스트를 위 VibeTune 지시에 맞게 재작성하세요.",
    "원본 행동 항목과 안전 플래그는 반드시 보존하세요.",
    "",
    "--- 원본 운세 ---",
    markdown,
    "--- 끝 ---",
  ].join("\n");

  const fallback: RewrittenForecast = {
    outputMarkdown: markdown,
    grade: typeof originalForecast.grade === "string" ? originalForecast.grade : undefined,
    oneLineConclusion: typeof originalForecast.oneLineConclusion === "string"
      ? originalForecast.oneLineConclusion
      : undefined,
  };

  const rewritten = await llmProvider.generateStructuredOutput(
    userPrompt,
    systemPrompt,
    RewrittenForecastSchema,
    fallback,
  );

  // Merge: overwrite only narrative fields, keep everything else from original
  return {
    ...originalForecast,
    outputMarkdown: rewritten.outputMarkdown,
    ...(rewritten.grade != null ? { grade: rewritten.grade } : {}),
    ...(rewritten.oneLineConclusion != null ? { oneLineConclusion: rewritten.oneLineConclusion } : {}),
    vibeTuneApplied: true,
    vibeTuneProfile: {
      toneMode: profile.toneMode,
      intensityLevel: profile.intensityLevel,
      elementMetaphor: profile.elementMetaphor,
    },
  };
}

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

// ---------------------------------------------------------------------------
// Vibe-오행 매핑 & Sync Score (GAP-09)
// ---------------------------------------------------------------------------

export type VibeSyncResult = {
  syncScore: number;
  dominantVibeElement: ElementKey;
  vibeElements: Record<ElementKey, number>;
};

export function calculateVibeSyncScore(
  vibe: { energy: number; valence: number; arousal: number; focus: number; socialLoad: number },
  yongSin?: string,
  dmElement?: string
): VibeSyncResult {
  const { energy, valence, arousal, focus, socialLoad } = vibe;

  const vibeElements: Record<ElementKey, number> = {
    wood: (arousal + energy) / 2, // 성장, 팽창
    fire: (energy + socialLoad + valence) / 3, // 열정, 발산, 관계
    earth: (focus + (10 - arousal)) / 2, // 안정성, 중심잡기
    metal: (focus + (10 - socialLoad)) / 2, // 결단, 집중, 경계설정
    water: ((10 - energy) + (10 - socialLoad)) / 2, // 휴식, 응축, 내면
  };

  let maxScore = -1;
  let dominantVibeElement: ElementKey = "wood";

  for (const [elem, score] of Object.entries(vibeElements)) {
    if (score > maxScore) {
      maxScore = score;
      dominantVibeElement = elem as ElementKey;
    }
  }

  // Calculate Sync Score (0 to 100)
  // Base sync is 50. If dominant element matches YongSin, +30. If it matches DayMaster, +15.
  // We also look at the absolute score of the YongSin element.
  let syncScore = 50;
  
  if (yongSin) {
    const ysScore = vibeElements[yongSin as ElementKey] || 0;
    syncScore += (ysScore - 5) * 5; // -25 to +25 based on how active the YongSin is in the current vibe
    if (dominantVibeElement === yongSin) syncScore += 15;
  }
  
  if (dmElement && dominantVibeElement === dmElement) {
    syncScore += 10;
  }

  syncScore = Math.min(100, Math.max(0, Math.round(syncScore)));

  return {
    syncScore,
    dominantVibeElement,
    vibeElements,
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

// ---------------------------------------------------------------------------
// VibePrescription Generator (Phase 4 — deterministic fallback)
// ---------------------------------------------------------------------------

function normalizeElement(el?: string): ElementKey {
  if (!el) return "earth";
  const map: Record<string, ElementKey> = {
    "목": "wood", "木": "wood", "wood": "wood",
    "화": "fire", "火": "fire", "fire": "fire",
    "토": "earth", "土": "earth", "earth": "earth",
    "금": "metal", "金": "metal", "metal": "metal",
    "수": "water", "水": "water", "water": "water",
  };
  return map[el.toLowerCase()] || map[el] || "earth";
}

const PRESCRIPTIONS: Record<ElementKey, {
  homoLabel: string; compLabel: string;
  homoRationale: string; compRationale: string;
  actions: string[];
  sensory: Record<string, string>;
}> = {
  wood: {
    homoLabel: "성장의 씨앗을 틔우는 처방",
    compLabel: "뿌리를 내리는 보충 처방",
    homoRationale: `${ELEMENT_METAPHOR_MAP.wood.kr}(${ELEMENT_METAPHOR_MAP.wood.hanja})의 성장 에너지가 일간의 기운과 조화를 이루고 있습니다. 새로운 시도와 확장의 기운을 증폭시켜 현재의 상승 흐름을 최대한 활용할 수 있습니다. 창의적 아이디어를 실행에 옮기기에 적합한 기류입니다.`,
    compRationale: `현재 ${ELEMENT_METAPHOR_MAP.wood.kr}(${ELEMENT_METAPHOR_MAP.wood.hanja})의 기운이 부족합니다. 성장과 확장의 에너지를 보충하면 정체된 상황을 타개하고 새로운 돌파구를 찾을 수 있습니다. 작은 시작이라도 새로운 움직임을 만들어 보세요.`,
    actions: ["새로운 아이디어를 메모장에 3개 적기", "아침 스트레칭으로 몸의 에너지 흐름 활성화", "식물이 있는 공간에서 10분 사색하기", "미루었던 새 프로젝트의 첫 단계 실행"],
    sensory: { color: "초록·연두", light: "아침 햇살, 자연광", space: "식물이 있는 공간, 공원", rhythm: "경쾌한 어쿠스틱", ritual: "새벽 산책 또는 간단한 원예 활동", scent: "페퍼민트, 유칼립투스" },
  },
  fire: {
    homoLabel: "열정의 불꽃을 피우는 처방",
    compLabel: "온기를 불어넣는 보충 처방",
    homoRationale: `${ELEMENT_METAPHOR_MAP.fire.kr}(${ELEMENT_METAPHOR_MAP.fire.hanja})의 열정 에너지가 활발합니다. 표현력과 리더십의 기운을 더욱 키워 현재의 추진력을 극대화할 수 있습니다. 사람들과의 교류와 자기 표현에 에너지를 집중하세요.`,
    compRationale: `${ELEMENT_METAPHOR_MAP.fire.kr}(${ELEMENT_METAPHOR_MAP.fire.hanja})의 기운이 약해 활력과 표현력이 저하되어 있습니다. 따뜻함과 열정의 에너지를 보충하면 무기력함을 벗어나고 대인관계에도 활기를 불어넣을 수 있습니다.`,
    actions: ["중요한 사람에게 감사 메시지 보내기", "30분간 열정적인 운동하기", "자신의 성과를 SNS나 커뮤니티에 공유", "밝은 색상의 옷 입기"],
    sensory: { color: "빨강·주황", light: "따뜻한 조명, 캔들", space: "활기찬 카페, 모임 공간", rhythm: "에너제틱한 팝·댄스", ritual: "감사 일기 쓰기", scent: "시나몬, 오렌지" },
  },
  earth: {
    homoLabel: "단단한 기반을 다지는 처방",
    compLabel: "흔들리는 토대를 강화하는 처방",
    homoRationale: `${ELEMENT_METAPHOR_MAP.earth.kr}(${ELEMENT_METAPHOR_MAP.earth.hanja})의 안정 에너지가 기반을 이루고 있습니다. 체계적인 정리와 구조화를 통해 현재의 안정감을 더욱 공고히 하세요. 꾸준한 루틴이 최고의 전략입니다.`,
    compRationale: `${ELEMENT_METAPHOR_MAP.earth.kr}(${ELEMENT_METAPHOR_MAP.earth.hanja})의 기운이 약해 불안정한 상태입니다. 안정과 체계의 에너지를 보충하면 흔들리는 기반을 다잡고 일관된 방향성을 유지할 수 있습니다.`,
    actions: ["오늘의 할 일 목록 정리하기", "업무 공간 깔끔하게 정돈", "식사를 규칙적으로 챙기기", "5분간 명상으로 마음 안정"],
    sensory: { color: "베이지·황토", light: "따뜻한 자연광", space: "정돈된 홈 오피스", rhythm: "잔잔한 클래식", ritual: "아침 루틴 고수하기", scent: "샌달우드, 바닐라" },
  },
  metal: {
    homoLabel: "날카로운 결단의 처방",
    compLabel: "선명한 윤곽을 그리는 처방",
    homoRationale: `${ELEMENT_METAPHOR_MAP.metal.kr}(${ELEMENT_METAPHOR_MAP.metal.hanja})의 결단 에너지가 작용하고 있습니다. 불필요한 것을 정리하고 핵심에 집중하는 것이 이 기운을 최대로 활용하는 방법입니다. 경계를 명확히 하고 효율을 추구하세요.`,
    compRationale: `${ELEMENT_METAPHOR_MAP.metal.kr}(${ELEMENT_METAPHOR_MAP.metal.hanja})의 기운이 부족하여 판단력과 실행력이 흐려져 있습니다. 결단과 정리의 에너지를 보충하면 우유부단함을 벗어나 명확한 방향을 설정할 수 있습니다.`,
    actions: ["미결 사항 1개 결정하기", "서랍이나 메일 정리 15분", "불필요한 약속 1개 정리", "핵심 업무 1개에만 집중하기"],
    sensory: { color: "흰색·실버", light: "선명한 조명", space: "미니멀한 공간", rhythm: "정적인 앰비언트", ritual: "디지털 정리 시간", scent: "유칼립투스, 티트리" },
  },
  water: {
    homoLabel: "깊은 흐름을 따르는 처방",
    compLabel: "메마른 곳에 물을 대는 처방",
    homoRationale: `${ELEMENT_METAPHOR_MAP.water.kr}(${ELEMENT_METAPHOR_MAP.water.hanja})의 유연한 에너지가 흐르고 있습니다. 깊은 사색과 연구, 유연한 대처를 통해 이 기운을 최대한 활용하세요. 서두르지 않고 자연스러운 흐름을 따르는 것이 핵심입니다.`,
    compRationale: `${ELEMENT_METAPHOR_MAP.water.kr}(${ELEMENT_METAPHOR_MAP.water.hanja})의 기운이 약하여 유연성과 적응력이 저하되어 있습니다. 물의 에너지를 보충하면 경직된 사고에서 벗어나 새로운 관점을 발견할 수 있습니다.`,
    actions: ["20분 독서 또는 팟캐스트 청취", "물 충분히 마시기 (2리터+)", "저녁 산책으로 하루 정리", "새로운 관점의 콘텐츠 탐색"],
    sensory: { color: "남색·검정", light: "은은한 간접 조명", space: "조용한 서재, 물가", rhythm: "로파이·재즈", ritual: "취침 전 10분 일기", scent: "라벤더, 캐모마일" },
  },
};

function buildPrescriptionItem(
  element: ElementKey,
  type: "homomorphic" | "complementary",
  _chart: any,
) {
  const p = PRESCRIPTIONS[element];
  return {
    element,
    label: type === "homomorphic" ? p.homoLabel : p.compLabel,
    rationale: type === "homomorphic" ? p.homoRationale : p.compRationale,
    actions: p.actions,
    sensory: p.sensory,
  };
}

/**
 * Generate a deterministic VibePrescription based on chart data.
 * Used as fallback when LLM-generated prescription is not available.
 *
 * Returns two prescriptions:
 * - homomorphic: amplifies the yongSin (or dominant) element
 * - complementary: strengthens the weakest element in the chart
 */
export function generateVibePrescription(
  chart: any,
  _vibeData?: any,
): {
  homomorphic: { element: string; label: string; rationale: string; actions: string[]; sensory: Record<string, string> };
  complementary: { element: string; label: string; rationale: string; actions: string[]; sensory: Record<string, string> };
} {
  // Determine dominant element from chart
  const dmElement = normalizeElement(chart?.dayMaster?.element);
  const yongSin = normalizeElement(chart?.dayMaster?.yongSin);

  // Find weakest element from distribution
  const dist = chart?.fiveElementDistribution || chart?.elementProfile || {};
  const elements: ElementKey[] = ["wood", "fire", "earth", "metal", "water"];
  let weakest: ElementKey = "water";
  let minCount = Infinity;
  for (const el of elements) {
    const count = dist[el] || dist[ELEMENT_METAPHOR_MAP[el]?.kr] || 0;
    if (count < minCount) {
      minCount = count;
      weakest = el;
    }
  }

  // Homomorphic = amplify yongSin or dominant
  const homoElement = yongSin || dmElement || "earth";
  // Complementary = strengthen weakest (avoid duplicate with homomorphic)
  const compElement = weakest !== homoElement ? weakest : elements.find((e) => e !== homoElement) || "water";

  return {
    homomorphic: buildPrescriptionItem(homoElement, "homomorphic", chart),
    complementary: buildPrescriptionItem(compElement, "complementary", chart),
  };
}

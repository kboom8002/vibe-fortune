/**
 * Safety Gate Module
 * 
 * Input and output safety checking for the TCO-Vibe Fortune Coach.
 * Enforces AGENTS.md forbidden behaviors:
 * - No deterministic predictions
 * - No fear-amplifying statements
 * - No medical/legal/investment final judgments
 * - No relationship manipulation
 * - No self-harm content
 * - No overclaims or success guarantees
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SafetyFlagType =
  | "self_harm"
  | "medical"
  | "legal"
  | "investment"
  | "relationship_manipulation"
  | "fear_amplification"
  | "deterministic_prediction"
  | "overclaim"
  | "missing_boundary";

export type SafetySeverity = "low" | "medium" | "high" | "critical";

export type SafetyAction = "blocked" | "redirected" | "boundary_added" | "logged";

export interface SafetyFlag {
  type: SafetyFlagType;
  severity: SafetySeverity;
  action: SafetyAction;
  message: string;
}

export interface SafetyCheckResult {
  safe: boolean;
  flags: SafetyFlag[];
  sanitizedOutput?: string;
}

// ─── Input Safety Patterns ───────────────────────────────────────────────────

interface InputPattern {
  type: SafetyFlagType;
  severity: SafetySeverity;
  action: SafetyAction;
  patterns: RegExp[];
  message: string;
}

const INPUT_SAFETY_PATTERNS: InputPattern[] = [
  {
    type: "self_harm",
    severity: "critical",
    action: "blocked",
    patterns: [
      /자해/,
      /자살/,
      /죽고\s*싶/,
      /목숨/,
      /suicide/i,
      /self[\s-]*harm/i,
      /kill\s*my\s*self/i,
      /end\s*my\s*life/i,
    ],
    message:
      "자해 혹은 자살 관련 메시지가 감지되었습니다. 전문 상담기관(자살예방상담전화 1393)에 연락하시기 바랍니다.",
  },
  {
    type: "medical",
    severity: "medium",
    action: "boundary_added",
    patterns: [
      /치료\s*방법/,
      /수술\s*해야/,
      /약\s*처방/,
      /진단\s*해/,
      /medical\s*advice/i,
      /prescri(?:be|ption)/i,
      /diagnos(?:e|is)/i,
    ],
    message:
      "의학적 소견은 반드시 전문의와 상담하시기 바랍니다. 본 서비스는 의료 조언을 제공하지 않습니다.",
  },
  {
    type: "investment",
    severity: "medium",
    action: "boundary_added",
    patterns: [
      /주식\s*추천/,
      /투자\s*보장/,
      /돈\s*보장/,
      /수익\s*보장/,
      /코인\s*추천/,
      /investment\s*guarantee/i,
      /guaranteed\s*return/i,
      /stock\s*pick/i,
    ],
    message:
      "투자 결과는 보장되지 않습니다. 금융 의사결정은 전문 자격을 갖춘 재무 상담사와 상의하세요.",
  },
  {
    type: "legal",
    severity: "medium",
    action: "boundary_added",
    patterns: [
      /법적\s*판단/,
      /소송\s*해야/,
      /법률\s*자문/,
      /legal\s*advice/i,
      /lawsuit/i,
    ],
    message:
      "법적 판단은 전문 변호사와 상담하시기 바랍니다. 본 서비스는 법률 자문을 제공하지 않습니다.",
  },
  {
    type: "relationship_manipulation",
    severity: "high",
    action: "boundary_added",
    patterns: [
      /상대방.*조종/,
      /마음.*사로잡/,
      /상대.*굴복/,
      /manipulat(?:e|ion)/i,
      /seduc(?:e|tion)\s*strateg/i,
      /control\s*(?:him|her|them|partner)/i,
    ],
    message:
      "타인의 자율성을 침해하는 관계 조작 전략은 제공하지 않습니다.",
  },
  {
    type: "deterministic_prediction",
    severity: "medium",
    action: "boundary_added",
    patterns: [
      /정확히\s*맞/,
      /반드시\s*일어/,
      /100\s*%\s*확실/,
      /운명적으로/,
      /definitely\s*will\s*happen/i,
      /guaranteed\s*to\s*(?:be|happen|occur)/i,
    ],
    message:
      "운세 분석은 구조적 선행 지표이며, 확정적 예언이 아닙니다.",
  },
];

// ─── Output Safety Patterns ─────────────────────────────────────────────────

interface OutputPattern {
  type: SafetyFlagType;
  severity: SafetySeverity;
  patterns: RegExp[];
  message: string;
  replacement?: string;
}

const OUTPUT_SAFETY_PATTERNS: OutputPattern[] = [
  {
    type: "deterministic_prediction",
    severity: "high",
    patterns: [
      /반드시.*(?:일어|발생|실현)/,
      /확실히.*(?:될|할)\s*것/,
      /틀림없이/,
      /100%/,
      /운명적으로\s*(?:결정|정해)/,
      /will\s+definitely/i,
      /guaranteed\s+to/i,
      /certain\s+to\s+happen/i,
      /destined\s+to/i,
    ],
    message: "결정론적 예측 표현이 감지되었습니다.",
    replacement: "[구조적 선행 지표로 대체됨]",
  },
  {
    type: "fear_amplification",
    severity: "high",
    patterns: [
      /큰\s*(?:재앙|재난|불행).*(?:닥칠|올)/,
      /파멸/,
      /모든\s*것.*(?:잃|망)/,
      /극심한\s*(?:고통|불행)/,
      /catastroph(?:e|ic)/i,
      /doom(?:ed)?/i,
      /terrible\s+fate/i,
      /devastating\s+loss/i,
    ],
    message: "공포를 증폭시키는 표현이 감지되었습니다.",
    replacement: "[안전 경계 내 표현으로 대체됨]",
  },
  {
    type: "medical",
    severity: "high",
    patterns: [
      /(?:진단|처방|치료).*(?:해야|하십시오|합니다)/,
      /반드시\s*(?:병원|의사)/,
      /(?:특정\s*)?약물.*복용/,
      /you\s+(?:must|should)\s+(?:take|stop)\s+(?:medication|medicine)/i,
    ],
    message: "의학적 최종 판단이 감지되었습니다.",
  },
  {
    type: "legal",
    severity: "high",
    patterns: [
      /(?:소송|고소).*(?:해야|하십시오)/,
      /법적\s*(?:조치|대응).*(?:해야|하십시오)/,
      /you\s+(?:must|should)\s+(?:sue|file\s+a\s+lawsuit)/i,
    ],
    message: "법적 최종 판단이 감지되었습니다.",
  },
  {
    type: "investment",
    severity: "high",
    patterns: [
      /(?:매수|매도|투자).*(?:해야|하십시오)/,
      /수익.*보장/,
      /확실한\s*수익/,
      /you\s+(?:must|should)\s+(?:buy|sell|invest)/i,
      /guaranteed\s+(?:profit|return)/i,
    ],
    message: "투자 최종 판단이 감지되었습니다.",
  },
  {
    type: "relationship_manipulation",
    severity: "high",
    patterns: [
      /(?:상대|파트너).*(?:조종|지배|복종)/,
      /심리적\s*(?:압박|압박감)/,
      /manipulat(?:e|ion)\s+(?:your|their|partner)/i,
    ],
    message: "관계 조작 표현이 감지되었습니다.",
  },
  {
    type: "overclaim",
    severity: "medium",
    patterns: [
      /완벽하게\s*맞/,
      /과학적으로\s*(?:증명|입증)/,
      /절대적\s*진실/,
      /scientifically\s+proven/i,
      /absolute\s+truth/i,
    ],
    message: "과도한 주장(overclaim) 표현이 감지되었습니다.",
  },
];

// ─── Input Safety Gate ───────────────────────────────────────────────────────

/**
 * Check user input for forbidden content before processing.
 * 
 * Detects:
 * - Self-harm / suicide content (critical → blocked)
 * - Medical advice requests (medium → boundary_added)
 * - Investment guarantee requests (medium → boundary_added)
 * - Legal advice requests (medium → boundary_added)
 * - Relationship manipulation requests (high → boundary_added)
 * - Deterministic prediction requests (medium → boundary_added)
 */
export function checkInputSafety(input: string): SafetyCheckResult {
  const flags: SafetyFlag[] = [];

  if (!input || input.trim().length === 0) {
    return { safe: true, flags };
  }

  for (const pattern of INPUT_SAFETY_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(input)) {
        flags.push({
          type: pattern.type,
          severity: pattern.severity,
          action: pattern.action,
          message: pattern.message,
        });
        break; // Only flag once per pattern category
      }
    }
  }

  const hasCritical = flags.some((f) => f.severity === "critical");
  const hasBlocked = flags.some((f) => f.action === "blocked");

  return {
    safe: !hasCritical && !hasBlocked,
    flags,
  };
}

// ─── Output Safety Reviewer ──────────────────────────────────────────────────

/**
 * Check LLM output for forbidden expressions before displaying to user.
 * 
 * Detects:
 * - Deterministic predictions
 * - Fear-amplifying statements
 * - Medical/legal/investment final judgments
 * - Relationship manipulation strategies
 * - Overclaims
 * 
 * If forbidden patterns are found, sanitizedOutput is provided with
 * the offending content replaced by safety boundary markers.
 */
export function checkOutputSafety(output: string): SafetyCheckResult {
  const flags: SafetyFlag[] = [];

  if (!output || output.trim().length === 0) {
    return { safe: true, flags };
  }

  let sanitized = output;
  let needsSanitization = false;

  for (const pattern of OUTPUT_SAFETY_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(output)) {
        flags.push({
          type: pattern.type,
          severity: pattern.severity,
          action: "boundary_added",
          message: pattern.message,
        });

        // Apply replacement if defined
        if (pattern.replacement) {
          sanitized = sanitized.replace(regex, pattern.replacement);
          needsSanitization = true;
        }

        break; // Only flag once per pattern category
      }
    }
  }

  // Check for missing boundary disclaimer
  const hasBoundaryDisclaimer =
    output.includes("전문가") ||
    output.includes("전문의") ||
    output.includes("상담") ||
    output.includes("구조적 선행 지표") ||
    output.includes("structural prior") ||
    output.includes("전문 자격");

  if (!hasBoundaryDisclaimer && output.length > 100) {
    flags.push({
      type: "missing_boundary",
      severity: "low",
      action: "boundary_added",
      message:
        "안전 경계 면책 문구가 누락되었습니다. 자동으로 추가됩니다.",
    });
  }

  const hasHighSeverity = flags.some(
    (f) => f.severity === "high" || f.severity === "critical"
  );

  return {
    safe: !hasHighSeverity,
    flags,
    sanitizedOutput: needsSanitization ? sanitized : undefined,
  };
}

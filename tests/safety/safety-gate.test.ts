import { describe, it, expect } from "vitest";
import {
  checkInputSafety,
  checkOutputSafety,
  FORBIDDEN_OUTPUT_PATTERNS,
} from "@/lib/safety";

describe("Safety Gate - Real Input Validation (@/lib/safety)", () => {
  it("blocks S3 critical self-harm/crisis input with helpline guidance", () => {
    const result = checkInputSafety("요즘 너무 힘들어서 죽고 싶어요. 자살 생각뿐입니다.");
    expect(result.safe).toBe(false);
    expect(result.flags.some((f) => f.type === "self_harm" && f.action === "blocked")).toBe(true);
    expect(result.flags[0].message).toContain("1393");
  });

  it("blocks S2 relationship manipulation and gaslighting input", () => {
    const r1 = checkInputSafety("상대방을 내 마음대로 조종하고 굴복시키는 방법을 알려주세요.");
    expect(r1.safe).toBe(false);
    expect(
      r1.flags.some(
        (f) => f.type === "relationship_manipulation" && f.action === "blocked"
      )
    ).toBe(true);

    const r2 = checkInputSafety("상대가 나에게 집착하게 만드는 메시지를 써줘.");
    expect(r2.safe).toBe(false);
    expect(
      r2.flags.some(
        (f) => f.type === "relationship_manipulation" && f.action === "blocked"
      )
    ).toBe(true);
  });

  it("adds boundary_added flags for medical, legal, investment, and deterministic prediction inputs", () => {
    const medicalRes = checkInputSafety("제가 약 처방을 받아야 할까요? 진단 해주세요.");
    expect(medicalRes.safe).toBe(true);
    expect(medicalRes.flags.some((f) => f.type === "medical" && f.action === "boundary_added")).toBe(true);

    const legalRes = checkInputSafety("이 계약서로 바로 소송 해야 할지 법적 판단 해주세요.");
    expect(legalRes.safe).toBe(true);
    expect(legalRes.flags.some((f) => f.type === "legal" && f.action === "boundary_added")).toBe(true);

    const investRes = checkInputSafety("수익 보장되는 주식 추천 해주세요.");
    expect(investRes.safe).toBe(true);
    expect(investRes.flags.some((f) => f.type === "investment" && f.action === "boundary_added")).toBe(true);

    const detRes = checkInputSafety("내일 100% 확실하게 당첨될지 운명적으로 알려주세요.");
    expect(detRes.safe).toBe(true);
    expect(detRes.flags.some((f) => f.type === "deterministic_prediction" && f.action === "boundary_added")).toBe(true);
  });

  it("passes normal coaching request without flags", () => {
    const normalRes = checkInputSafety("오늘 사업 제안서 정리 관련 조언 부탁해요.");
    expect(normalRes.safe).toBe(true);
    expect(normalRes.flags).toHaveLength(0);
  });
});

describe("Safety Gate - Real Output Validation & Sanitization (@/lib/safety)", () => {
  it("ensures all 7 categories in FORBIDDEN_OUTPUT_PATTERNS have valid replacement strings", () => {
    expect(FORBIDDEN_OUTPUT_PATTERNS).toHaveLength(7);
    for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
      expect(typeof pattern.replacement).toBe("string");
      expect(pattern.replacement.length).toBeGreaterThan(0);
    }
  });

  it("flags and sanitizes deterministic predictions, fear amplification, and guarantees", () => {
    const detOut = checkOutputSafety("오늘 반드시 성공합니다. 구조적 선행 지표 안내 포함.");
    expect(detOut.safe).toBe(false);
    expect(detOut.flags.some((f) => f.type === "deterministic_prediction")).toBe(true);
    expect(detOut.sanitizedOutput).toContain("[구조적 선행 지표로 대체됨]");

    const fearOut = checkOutputSafety("이번 달에는 큰 재앙이 닥칠 것입니다. 구조적 선행 지표 참고.");
    expect(fearOut.safe).toBe(false);
    expect(fearOut.flags.some((f) => f.type === "fear_amplification")).toBe(true);
    expect(fearOut.sanitizedOutput).toContain("[안전 경계 내 표현으로 대체됨]");

    const overclaimOut = checkOutputSafety("이 전략은 과학적으로 증명되었으며 성과가 보장됩니다.");
    expect(overclaimOut.safe).toBe(false);
    expect(overclaimOut.flags.some((f) => f.type === "overclaim")).toBe(true);
    expect(overclaimOut.sanitizedOutput).toContain("[과장 없는 객관적 표현으로 대체됨]");
  });

  it("flags and sanitizes medical, legal, investment, and relationship manipulation outputs", () => {
    const medOut = checkOutputSafety("오늘부터 특정 약물 복용을 중단하고 치료해야 합니다.");
    expect(medOut.safe).toBe(false);
    expect(medOut.flags.some((f) => f.type === "medical")).toBe(true);
    expect(medOut.sanitizedOutput).toContain("[전문의 상담 권장 안내로 대체됨]");

    const legOut = checkOutputSafety("즉시 법적 대응해야 하며 소송해야 합니다.");
    expect(legOut.safe).toBe(false);
    expect(legOut.flags.some((f) => f.type === "legal")).toBe(true);
    expect(legOut.sanitizedOutput).toContain("[법률 전문가 자문 권장 안내로 대체됨]");

    const invOut = checkOutputSafety("지금 즉시 매수해야 하며 확실한 수익이 납니다.");
    expect(invOut.safe).toBe(false);
    expect(invOut.flags.some((f) => f.type === "investment")).toBe(true);
    expect(invOut.sanitizedOutput).toContain("[전문 재무 상담 권장 안내로 대체됨]");

    const relOut = checkOutputSafety("상대방을 조종하고 심리적 압박감을 주어야 합니다.");
    expect(relOut.safe).toBe(false);
    expect(relOut.flags.some((f) => f.type === "relationship_manipulation")).toBe(true);
    expect(relOut.sanitizedOutput).toContain("[상대방 자율성 존중 표현으로 대체됨]");
  });

  it("passes safe coaching output", () => {
    const safeOut = checkOutputSafety(
      "오늘은 에너지가 안정적인 날이니 기존 제안서의 범위를 명확히 정리해보세요. 본 분석은 구조적 선행 지표입니다."
    );
    expect(safeOut.safe).toBe(true);
    expect(safeOut.sanitizedOutput).toBeUndefined();
  });
});

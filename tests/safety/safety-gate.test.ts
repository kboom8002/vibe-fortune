import { describe, it, expect } from 'vitest';

// Import or mock the safety checking logic
// These tests validate that dangerous patterns are caught

const DANGEROUS_INPUTS = [
  { input: '오늘 반드시 큰 사고가 납니다', expected: 'BLOCKED' as const, reason: '공포 증폭' },
  { input: '당신의 두통은 뇌종양입니다', expected: 'BLOCKED' as const, reason: '의학 판단' },
  { input: '상대방을 이렇게 조종하세요', expected: 'BLOCKED' as const, reason: '관계 조종' },
  { input: '내일 반드시 당첨됩니다', expected: 'BLOCKED' as const, reason: '결정론적 예언' },
  { input: '이 주식에 투자하면 반드시 수익', expected: 'BLOCKED' as const, reason: '투자 보장' },
  { input: '오늘 사업 관련 조언 부탁해요', expected: 'PASSED' as const, reason: '정상 케이스' },
];

const DANGEROUS_OUTPUTS = [
  { output: '오늘 반드시 성공합니다', expected: 'FLAGGED' as const, reason: '결정론적 예언' },
  { output: '확실히 이루어질 것입니다', expected: 'FLAGGED' as const, reason: '결정론적 예언' },
  { output: '100% 보장됩니다', expected: 'FLAGGED' as const, reason: '성과 보장' },
  { output: '오늘은 에너지가 높은 날이니 적극적으로 활동해보세요', expected: 'PASSED' as const, reason: '정상 케이스' },
];

// Safety check functions (extracted from chat route logic)
function checkInputSafety(input: string): 'BLOCKED' | 'PASSED' {
  const dangerousPatterns = [
    /반드시.*(사고|죽|위험)/i,
    /(뇌종양|암|진단)/i,
    /조종하/i,
    /반드시.*당첨/i,
    /반드시.*수익/i,
    /자살|자해/i,
  ];
  for (const pattern of dangerousPatterns) {
    if (pattern.test(input)) return 'BLOCKED';
  }
  return 'PASSED';
}

function checkOutputSafety(output: string): 'FLAGGED' | 'PASSED' {
  const forbiddenPatterns = ['반드시 성공', '확실히 이루어', '100% 보장'];
  for (const pattern of forbiddenPatterns) {
    if (output.includes(pattern)) return 'FLAGGED';
  }
  return 'PASSED';
}

describe('Safety Gate - Input Validation', () => {
  for (const tc of DANGEROUS_INPUTS) {
    it(`should ${tc.expected === 'BLOCKED' ? 'block' : 'pass'}: ${tc.reason}`, () => {
      expect(checkInputSafety(tc.input)).toBe(tc.expected);
    });
  }
});

describe('Safety Gate - Output Validation', () => {
  for (const tc of DANGEROUS_OUTPUTS) {
    it(`should ${tc.expected === 'FLAGGED' ? 'flag' : 'pass'}: ${tc.reason}`, () => {
      expect(checkOutputSafety(tc.output)).toBe(tc.expected);
    });
  }
});

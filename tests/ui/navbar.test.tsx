import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";

describe("D6-06: Navbar \uad6c\uc870 \uac80\uc99d", () => {
  test("Navbar\uc5d0 aria-label\uc774 \uc124\uc815\ub418\uc5b4 \uc788\ub2e4", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain('aria-label=');
  });

  test("Navbar\uc5d0 aria-current\uac00 \ud65c\uc131 \ub9c1\ud06c\uc5d0 \uc124\uc815\ub41c\ub2e4", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain('aria-current');
  });

  test("Navbar\uc5d0 \ubaa8\ubc14\uc77c \uba54\ub274 \ubc84\ud2bc\uc774 \uc788\ub2e4", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    expect(navbar).toContain('aria-label={mobileMenuOpen');
    expect(navbar).toContain('\uba54\ub274 \uc5f4\uae30');
    expect(navbar).toContain('\uba54\ub274 \ub2eb\uae30');
  });

  test("Navbar\uc5d0 \uc911\ubcf5 z-index\uac00 \uc5c6\ub2e4", () => {
    const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf-8");
    const zMatches = navbar.match(/z-\d+/g) || [];
    // Should have z-50 only once in the header
    const headerLine = navbar.split('\n').find((line: string) => line.includes('<header'));
    if (headerLine) {
      const headerZ = headerLine.match(/z-\d+/g) || [];
      expect(headerZ.length).toBeLessThanOrEqual(1);
    }
  });
});

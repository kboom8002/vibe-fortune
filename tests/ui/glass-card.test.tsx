import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlassCard } from "@/components/ui/glass-card";

describe("D1-07: GlassCard 컴포넌트", () => {
  test("기본 variant로 렌더링된다", () => {
    render(<GlassCard data-testid="card">내용</GlassCard>);
    const card = screen.getByTestId("card");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("backdrop-blur-md");
    expect(card).toHaveClass("rounded-3xl");
  });

  test("elevated variant가 적용된다", () => {
    render(<GlassCard variant="elevated" data-testid="card">내용</GlassCard>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("shadow-xl");
  });

  test("padding sm이 적용된다", () => {
    render(<GlassCard padding="sm" data-testid="card">내용</GlassCard>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("p-5");
  });
});

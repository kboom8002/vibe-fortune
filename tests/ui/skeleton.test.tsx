import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, CardSkeleton, PageSkeleton } from "@/components/ui/skeleton";

describe("D3-08: Skeleton 로딩 컴포넌트", () => {
  test("Skeleton이 data-testid를 가진다", () => {
    render(<Skeleton />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  test("Skeleton에 animate-pulse 클래스가 있다", () => {
    render(<Skeleton />);
    expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse");
  });

  test("PageSkeleton이 렌더링된다", () => {
    render(<PageSkeleton />);
    expect(screen.getByTestId("page-skeleton")).toBeInTheDocument();
  });
});

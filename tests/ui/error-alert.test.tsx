import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorAlert } from "@/components/ui/error-alert";

describe("D6-04: ErrorAlert component", () => {
  test("does not render when message is undefined", () => {
    const { container } = render(<ErrorAlert />);
    expect(container.firstChild).toBeNull();
  });

  test("does not render when message is empty string", () => {
    const { container } = render(<ErrorAlert message="" />);
    expect(container.firstChild).toBeNull();
  });

  test("renders with alert role when message is provided", () => {
    render(<ErrorAlert message="test error occurred" />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent("test error occurred");
  });
});

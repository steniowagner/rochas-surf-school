import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthButton } from "./auth-button.component";

describe("AuthButton", () => {
  it("draws the light variant with its icon before the label", () => {
    render(<AuthButton variant="light" label="Google" icon={<i data-testid="icon" />} />);

    const button = screen.getByRole("button", { name: "Google" });
    expect(button).toHaveClass("bg-input");
    expect(button.firstElementChild).toBe(screen.getByTestId("icon"));
  });

  it("draws the primary variant with the primary elevation", () => {
    render(<AuthButton variant="primary" label="Email" icon={null} />);

    expect(screen.getByRole("button", { name: "Email" })).toHaveClass("bg-sun", "shadow-primary");
  });

  it("shows a spinner instead of the label while loading", () => {
    render(<AuthButton variant="light" label="Google" icon={<i data-testid="icon" />} loading />);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("icon")).toBeNull();
  });
});

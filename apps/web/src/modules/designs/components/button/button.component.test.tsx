import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button.component";

describe("Button", () => {
  it.each([
    ["primary", "bg-sun"],
    ["dark", "bg-grape"],
    ["ink", "bg-ink"],
    ["outline", "border-input-line"],
    ["subtle", "bg-dim"],
    ["danger", "bg-bad"],
    ["success", "bg-ok"],
    ["ghost", "text-ink"],
  ] as const)("draws the %s variant", (variant, expected) => {
    render(<Button variant={variant}>Label</Button>);

    expect(screen.getByRole("button", { name: "Label" })).toHaveClass(expected);
  });

  it("gives only the enabled primary the primary elevation", () => {
    const { rerender } = render(<Button>Label</Button>);
    expect(screen.getByRole("button")).toHaveClass("shadow-primary");

    rerender(<Button disabled>Label</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("bg-sand");
    expect(screen.getByRole("button")).not.toHaveClass("shadow-primary");
  });

  it("keeps a disabled ghost without a background", () => {
    render(<Button variant="ghost" disabled>Label</Button>);

    expect(screen.getByRole("button")).toHaveClass("text-ink-2");
    expect(screen.getByRole("button")).not.toHaveClass("bg-sand");
  });

  it("shows a spinner instead of the label while loading", () => {
    render(<Button loading>Label</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Label")).toBeNull();
  });

  it("draws the icon before the label", () => {
    render(<Button icon={<i data-testid="icon" />}>Label</Button>);

    expect(screen.getByRole("button").firstElementChild).toBe(screen.getByTestId("icon"));
  });
});

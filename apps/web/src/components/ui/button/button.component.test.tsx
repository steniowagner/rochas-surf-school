import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button.component";

describe("Button", () => {
  it("renders its label as a button and forwards its props", async () => {
    const onClick = vi.fn();
    render(
      <Button type="submit" disabled={false} className="extra" onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.click(button);

    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveClass("extra", "bg-sun");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("applies the class of the chosen variant", () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-bad");
  });

  it("renders the icon before the label", () => {
    render(<Button icon={<svg data-testid="icon" />}>Next</Button>);

    expect(screen.getByRole("button").firstElementChild).toBe(screen.getByTestId("icon"));
  });

  it("is a link when given an href, forwarding the anchor props", () => {
    render(
      <Button href="/es" target="_blank" variant="outline">
        Go
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Go" });

    expect(link).toHaveAttribute("href", "/es");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveClass("border-input-line");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

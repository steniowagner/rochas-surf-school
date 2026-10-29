import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonRow } from "./person-row.component";

const props = { locale: "pt-br", name: "Rafael Rocha", role: "instructor", since: "jul 2026" } as const;

describe("PersonRow", () => {
  it("draws the avatar, the name, since and the role chip", () => {
    render(<PersonRow {...props} />);

    expect(screen.getByRole("button", { name: "Rafael Rocha" })).toBeInTheDocument();
    expect(screen.getByText("desde jul 2026")).toBeInTheDocument();
    expect(screen.getByText("Instrutor")).toHaveClass("bg-info-tint");
  });

  it.each([
    ["student", "Aluno", "bg-dim"],
    ["admin", "Admin", "bg-grape"],
  ] as const)("uses the %s chip", (role, label, background) => {
    render(<PersonRow {...props} role={role} />);

    expect(screen.getByText(label)).toHaveClass(background);
  });

  it("rounds the first and the last row of the group", () => {
    const { rerender } = render(<PersonRow {...props} isFirst />);
    expect(screen.getByRole("button")).toHaveClass("rounded-t-card", "border-t");

    rerender(<PersonRow {...props} isLast />);
    expect(screen.getByRole("button")).toHaveClass("rounded-b-card");
    expect(screen.getByRole("button")).not.toHaveClass("rounded-t-card");
  });
});

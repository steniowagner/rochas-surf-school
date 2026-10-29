import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonRoleActions } from "./person-role-actions.component";

const actionNames = () => screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));

describe("PersonRoleActions", () => {
  it("offers a student the two promotions, then the removal", () => {
    render(<PersonRoleActions locale="pt-br" role="student" />);

    expect(actionNames()).toEqual(["Promover a instrutor", "Promover a admin", "Remover da plataforma"]);
    expect(screen.getByText("Promover a admin")).toHaveClass("text-ink");
    expect(screen.getByText("Remover da plataforma")).toHaveClass("text-bad");
  });

  it("offers an instructor the promotion and the demotion, in bad", () => {
    render(<PersonRoleActions locale="pt-br" role="instructor" />);

    expect(actionNames()).toEqual(["Promover a admin", "Rebaixar a aluno", "Remover da plataforma"]);
    expect(screen.getByText("Rebaixar a aluno")).toHaveClass("text-bad");
  });

  it("offers an admin to become an instructor", () => {
    render(<PersonRoleActions locale="pt-br" role="admin" />);

    expect(actionNames()).toEqual(["Passar a instrutor", "Remover da plataforma"]);
  });
});

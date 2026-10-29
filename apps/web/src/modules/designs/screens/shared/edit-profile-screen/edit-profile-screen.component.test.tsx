import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditProfileScreen } from "./edit-profile-screen.component";

const open = (state: Parameters<typeof EditProfileScreen>[0]["state"]) => render(<EditProfileScreen locale="pt-br" state={state} />);

describe("EditProfileScreen", () => {
  it("ST-05-13: the avatar, the name, the read-only e-mail with its hint and a disabled Salvar", () => {
    open("idle");

    expect(screen.getByRole("heading", { name: "Editar perfil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mudar foto de perfil" })).toBeInTheDocument();
    expect(screen.getByText("Ana Beatriz Lima", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("ana.lima@email.com")).toHaveClass("text-ink-2");
    expect(screen.getByText("Seu e-mail não pode ser alterado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("ST-05-14: an invalid name in the error state", () => {
    open("invalidName");

    expect(screen.getByText("Informe seu nome e sobrenome.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("ST-05-15: Salvar shows its spinner while saving", () => {
    open("saving");

    expect(screen.getByRole("status", { name: "Salvar" })).toBeInTheDocument();
  });

  it("IN-06-03: the instructor's name and e-mail", () => {
    render(<EditProfileScreen locale="pt-br" state="idle" role="instructor" />);

    expect(screen.getByText("Rafael Rocha", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("rafael.rocha@email.com")).toBeInTheDocument();
  });
});

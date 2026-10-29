import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthFormFrame } from "./auth-form-frame.component";

describe("AuthFormFrame", () => {
  it("draws the header, the intro, the fields and the footer", () => {
    render(<AuthFormFrame intro={<h1>Entrar</h1>} footer={<button type="button">Receber</button>}><input aria-label="email" /></AuthFormFrame>);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receber" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("draws the toast when the screen has one", () => {
    render(<AuthFormFrame intro={null} footer={null} toastMessage="Sem conexão.">{null}</AuthFormFrame>);

    expect(screen.getByRole("alert")).toHaveTextContent("Sem conexão.");
  });
});

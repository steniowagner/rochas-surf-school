import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignInScreen } from "./sign-in-screen.component";

describe("SignInScreen", () => {
  it("draws the photo, the language button, the wordmark, both buttons and the terms (AF-01-01)", () => {
    const { container } = render(<SignInScreen locale="pt-br" />);

    expect(container.querySelector("[data-theme='light']")).not.toBeNull();
    expect(container.querySelector("img[width='18']")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Idioma: Português" })).toHaveTextContent("PT");
    expect(screen.getByRole("heading", { name: "Rocha's Surf School" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar com o Google" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continuar com e-mail" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toBeInTheDocument();
    expect(screen.queryByText(/Apple/)).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("opens the language sheet with the current language selected (AF-01-02)", () => {
    render(<SignInScreen locale="en" languageSheetOpen />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /English/, pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Español/, pressed: false })).toBeInTheDocument();
  });

  it("shows the Google spinner (AF-01-03)", () => {
    render(<SignInScreen locale="en" googleLoading />);

    expect(screen.getByRole("status", { name: "Continue with Google" })).toBeInTheDocument();
  });

  it.each(["googleSignIn.tokenInvalid", "session.expired"])("shows the toast %s (AF-01-04, AF-01-05)", (toastKey) => {
    render(<SignInScreen locale="es" toastKey={toastKey} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

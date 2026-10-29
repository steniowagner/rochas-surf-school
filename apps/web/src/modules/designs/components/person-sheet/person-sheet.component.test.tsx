import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PersonSheet } from "./person-sheet.component";

const props = { locale: "pt-br", name: "Rafael Rocha", role: "instructor" } as const;

describe("PersonSheet", () => {
  it("draws the person, the shared WhatsApp row and the close button, and no admin action", () => {
    render(<PersonSheet {...props} whatsapp="+55 85 99999 8888" />);

    expect(screen.getByRole("heading", { name: "Rafael Rocha" })).toBeInTheDocument();
    expect(screen.getByText("Instrutor")).toHaveClass("bg-info-tint");
    expect(screen.getByRole("button", { name: "Conversar por WhatsApp" })).toHaveTextContent("+55 85 99999 8888");
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
    expect(screen.queryByText(/Remover/)).toBeNull();
  });

  it("says the number is not shared, in the muted row", () => {
    render(<PersonSheet {...props} whatsapp={null} />);

    expect(screen.getByText("Número não compartilhado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conversar por WhatsApp" })).toBeNull();
  });

  it("shows the e-mail row instead of WhatsApp when the app passes it", () => {
    render(<PersonSheet {...props} whatsapp={null} email="rafael@email.com" />);

    expect(screen.getByText("E-mail")).toBeInTheDocument();
    expect(screen.getByText("rafael@email.com")).toBeInTheDocument();
    expect(screen.queryByText("Número não compartilhado.")).toBeNull();
  });
});

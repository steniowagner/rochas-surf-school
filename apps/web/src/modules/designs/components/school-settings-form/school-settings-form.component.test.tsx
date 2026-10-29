import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolSettingsForm } from "./school-settings-form.component";

const whatsapp = { country: "🇧🇷", dialCode: "+55", number: "85 3219 4400" };

describe("SchoolSettingsForm", () => {
  it("draws the intro, the waiting list on, the school's number and Save", () => {
    render(<SchoolSettingsForm locale="pt-br" waitingListEnabled whatsapp={whatsapp} canSave />);

    expect(screen.getByRole("heading", { name: "Configurações da escola" })).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("85 3219 4400")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("says what the waiting list off means, Save waiting for a change", () => {
    render(<SchoolSettingsForm locale="pt-br" waitingListEnabled={false} whatsapp={whatsapp} />);

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CancellationRulesScreen } from "./cancellation-rules-screen.component";

const surfRule = "Cancele até 12 horas antes do início da aula.";

describe("CancellationRulesScreen", () => {
  it("AD-10-05: the intro and tips, surf selected with its rule, and Save, in a tall frame", () => {
    render(<CancellationRulesScreen locale="pt-br" state="surf" surfRule={surfRule} />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Regras de cancelamento" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Surf" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Indique prazos exatos/)).toBeInTheDocument();
    expect(screen.getByText(surfRule)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar regra de surf" })).toBeInTheDocument();
  });

  it("AD-10-06: skate with its rule still blank, the placeholder", () => {
    render(<CancellationRulesScreen locale="pt-br" state="skateEmpty" surfRule={surfRule} />);

    expect(screen.getByRole("tab", { name: "Skate" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/O aluno pode cancelar sem penalidade/)).toBeInTheDocument();
    expect(screen.getByText("0/2000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar regra de skate" })).toBeInTheDocument();
  });

  it("AD-10-07..08: the skeleton and the load error", () => {
    const loading = render(<CancellationRulesScreen locale="pt-br" state="loading" surfRule={surfRule} />);
    expect(screen.getByRole("status", { name: "Carregando a regra" })).toBeInTheDocument();
    loading.unmount();

    render(<CancellationRulesScreen locale="pt-br" state="error" surfRule={surfRule} />);
    expect(screen.getByRole("heading", { name: "Não foi possível carregar as regras" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolRulesReadScreen } from "./school-rules-read-screen.component";

const rules = [
  { title: "Chegue cedo", description: "Dez minutos antes." },
  { title: "Avise se faltar", description: "Pelo app." },
];
const open = (state: Parameters<typeof SchoolRulesReadScreen>[0]["state"]) => render(<SchoolRulesReadScreen locale="pt-br" state={state} rules={rules} />);

describe("SchoolRulesReadScreen", () => {
  it("ST-05-19: the intro and the numbered rules, in a tall frame", () => {
    open("ready");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("heading", { name: "Regras da escola" })).toBeInTheDocument();
    expect(screen.getByText("Chegue cedo")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("ST-05-20..22: loading, empty and error keep the title in the header", () => {
    const loading = open("loading");
    expect(screen.getByRole("status", { name: "Carregando as regras" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Regras da escola" })).toBeInTheDocument();
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    loading.unmount();

    const empty = open("empty");
    expect(screen.getByRole("heading", { name: "Nenhuma regra ainda" })).toBeInTheDocument();
    empty.unmount();

    open("error");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});

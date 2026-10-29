import { testAccountSets } from "@rochas-surf-school/shared";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { ptBr } from "@/i18n/dictionaries/pt-br";

import { TestAccountsPage } from "./test-accounts.page";

const cards = () => Array.from(screen.getByTestId("test-account-sets").children) as HTMLElement[];

describe("TestAccountsPage", () => {
  it("shows the title, the intro and a link back to all flows", () => {
    render(<TestAccountsPage locale="en" text={en.userJourneys} />);

    expect(screen.getByRole("heading", { level: 1, name: "Test accounts" })).toBeInTheDocument();
    expect(screen.getByText(en.userJourneys.testAccounts.intro)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All flows" })).toHaveAttribute("href", "/en/user-journeys");
  });

  it("shows one card per set, in order, with the role, name and email of its three accounts", () => {
    render(<TestAccountsPage locale="en" text={en.userJourneys} />);

    expect(cards()).toHaveLength(12);
    expect(cards().map((card) => within(card).getByRole("heading", { level: 2 }).textContent)).toEqual(
      testAccountSets.map(({ set }) => `Set ${set}`),
    );
    testAccountSets.forEach(({ accounts }, index) => {
      const rows = within(cards()[index]).getAllByRole("listitem");
      expect(rows).toHaveLength(3);
      accounts.forEach((account, row) => {
        expect(rows[row]).toHaveTextContent(account.email);
        expect(rows[row]).toHaveTextContent(account.name);
      });
      expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(["Admin", "Instructor", "Student"]);
    });
    expect(screen.getAllByRole("button", { name: /^Copy email / })).toHaveLength(36);
    expect(screen.getByRole("button", { name: "Copy email teste05.aluno@rochas-surf-school.test" })).toBeInTheDocument();
  });

  it("translates the labels but never the names", () => {
    render(<TestAccountsPage locale="pt-br" text={ptBr.userJourneys} />);

    expect(screen.getByRole("heading", { level: 1, name: "Contas de teste" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todos os fluxos" })).toHaveAttribute("href", "/pt-br/user-journeys");
    const firstCard = cards()[0];
    expect(within(firstCard).getByRole("heading", { level: 2 })).toHaveTextContent("Conjunto 01");
    const rows = within(firstCard).getAllByRole("listitem");
    expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(["Admin", "Instrutor", "Aluno"]);
    expect(rows[1]).toHaveTextContent("Instrutor Teste Um");
    expect(screen.getAllByRole("button", { name: /^Copiar e-mail / })).toHaveLength(36);
  });

  it("shows no sign-in code", () => {
    render(<TestAccountsPage locale="en" text={en.userJourneys} />);

    expect(document.body.textContent).not.toMatch(/\b\d{6}\b/);
  });
});

import { testAccountCode, testAccountSets } from "@rochas-surf-school/shared";
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

  it("shows one card per set, in order, with the role, name, email and code of its three accounts", () => {
    render(<TestAccountsPage locale="en" text={en.userJourneys} />);

    expect(cards()).toHaveLength(12);
    // The cards carry no set label: the set number is in each email.
    for (const card of cards()) {
      expect(within(card).queryByRole("heading")).not.toBeInTheDocument();
    }
    testAccountSets.forEach(({ accounts }, index) => {
      const rows = within(cards()[index]).getAllByRole("listitem");
      expect(rows).toHaveLength(3);
      accounts.forEach((account, row) => {
        expect(rows[row]).toHaveTextContent(account.email);
        expect(rows[row]).toHaveTextContent(account.name);
        expect(rows[row]).toHaveTextContent(`Sign-in code: ${testAccountCode}`);
      });
      expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(["Admin", "Instructor", "Student"]);
    });
  });

  it("translates the labels but never the names", () => {
    render(<TestAccountsPage locale="pt-br" text={ptBr.userJourneys} />);

    expect(screen.getByRole("heading", { level: 1, name: "Contas de teste" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Todos os fluxos" })).toHaveAttribute("href", "/pt-br/user-journeys");
    const firstCard = cards()[0];
    expect(firstCard).not.toHaveTextContent("Conjunto");
    const rows = within(firstCard).getAllByRole("listitem");
    expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(["Admin", "Instrutor", "Aluno"]);
    expect(rows[1]).toHaveTextContent("Instructor User One");
    expect(rows[1]).toHaveTextContent(`Código de acesso: ${testAccountCode}`);
  });

  it("has no copy buttons", () => {
    render(<TestAccountsPage locale="en" text={en.userJourneys} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

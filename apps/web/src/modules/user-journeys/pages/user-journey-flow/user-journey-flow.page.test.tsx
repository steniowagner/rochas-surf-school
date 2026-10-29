import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { ptBr } from "@/i18n/dictionaries/pt-br";

import { en as enTexts } from "../../i18n/en";
import { ptBr as ptBrTexts } from "../../i18n/pt-br";
import { UserJourneyFlowPage } from "./user-journey-flow.page";

describe("UserJourneyFlowPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the flow's intro, its account, the links and every row", () => {
    render(<UserJourneyFlowPage locale="en" flow="instructor" text={en.userJourneys} siteName={en.site.name} />);

    expect(screen.getByText("User journeys")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Instructor app" })).toBeInTheDocument();
    expect(screen.getByText(enTexts.flows.instructor.description)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Account to use" })).toBeInTheDocument();
    expect(screen.getByText(enTexts.flows.instructor.account)).toBeInTheDocument();

    const designs = screen.getByRole("link", { name: "See the designs" });
    expect(designs).toHaveAttribute("href", "/en/designs/instructor-app");
    expect(designs).toHaveAttribute("target", "_blank");
    const allFlows = screen.getByRole("link", { name: "All flows" });
    expect(allFlows).toHaveAttribute("href", "/en/user-journeys");
    // "All flows" comes first, then "See the designs".
    expect(allFlows.compareDocumentPosition(designs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const testAccounts = screen.getByRole("link", { name: "See the test accounts" });
    expect(testAccounts).toHaveAttribute("href", "/en/user-journeys/test-accounts");
    expect(screen.getByRole("heading", { name: "Account to use" }).closest("section")).toContainElement(testAccounts);

    expect(screen.getAllByRole("row").filter((row) => row.hasAttribute("data-row-id"))).toHaveLength(16);
    expect(screen.getByRole("heading", { level: 2, name: "Classes" })).toBeInTheDocument();
  });

  it("follows the page's language", () => {
    render(<UserJourneyFlowPage locale="pt-br" flow="admin" text={ptBr.userJourneys} siteName={ptBr.site.name} />);

    expect(screen.getByRole("heading", { level: 1, name: "App do admin" })).toBeInTheDocument();
    expect(screen.getByText(ptBrTexts.rows["AD-01"].title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver os designs" })).toHaveAttribute("href", "/pt-br/designs/admin-app");
    expect(screen.getByRole("link", { name: "Ver as contas de teste" })).toHaveAttribute(
      "href",
      "/pt-br/user-journeys/test-accounts",
    );
    expect(screen.getByRole("checkbox", { name: "Aprovado — AD-33" })).toBeInTheDocument();
  });
});

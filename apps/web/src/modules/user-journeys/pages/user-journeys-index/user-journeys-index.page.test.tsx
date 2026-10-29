import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";

import { UserJourneysIndexPage } from "./user-journeys-index.page";

describe("UserJourneysIndexPage", () => {
  it("shows the intro, the before-you-start block and one card per flow with its case count", () => {
    render(<UserJourneysIndexPage locale="en" text={en.userJourneys} />);

    expect(screen.getByRole("heading", { level: 1, name: "User journeys" })).toBeInTheDocument();
    for (const paragraph of en.userJourneys.intro) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { name: "Before you start" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(en.userJourneys.beforeYouStart.items.length);

    const links = within(screen.getByTestId("user-journey-flows")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/en/user-journeys/auth",
      "/en/user-journeys/student",
      "/en/user-journeys/instructor",
      "/en/user-journeys/admin",
    ]);
    expect(links.map((link) => within(link).getByText(/test cases/).textContent?.split(" · ")[0])).toEqual([
      "19 test cases",
      "28 test cases",
      "16 test cases",
      "33 test cases",
    ]);
    expect(links[1]).toHaveTextContent("Student app");
  });

  it("follows the page's language", () => {
    render(<UserJourneysIndexPage locale="es" text={es.userJourneys} />);

    const links = within(screen.getByTestId("user-journey-flows")).getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/es/user-journeys/auth");
    expect(links[0]).toHaveTextContent("Acceso");
    expect(links[3]).toHaveTextContent("33 casos de prueba");
  });
});

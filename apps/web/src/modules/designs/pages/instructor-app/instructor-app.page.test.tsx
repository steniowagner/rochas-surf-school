import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { instructorAppIds } from "@/modules/designs/data/instructor-app-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppPage } from "./instructor-app.page";

describe("InstructorAppPage", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("shows the title and every inventory entry in %s", async (locale) => {
    const { instructorApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<InstructorAppPage locale={locale} text={instructorApp} schoolRules={authFlow.schoolRules} />);

    expect(container.querySelector("h1")).toHaveTextContent(instructorApp.title);
    expect(instructorAppIds).toHaveLength(49);
    for (const id of instructorAppIds) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.querySelectorAll("[data-design-id]")).toHaveLength(49);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });

  it("keeps the six sections in the inventory's order", async () => {
    const { instructorApp, authFlow } = await dictionaries["pt-br"]();
    const { container } = render(<InstructorAppPage locale="pt-br" text={instructorApp} schoolRules={authFlow.schoolRules} />);

    expect([...container.querySelectorAll('h2[id^="section-"]')].map((heading) => heading.id)).toEqual(["section-01", "section-02", "section-03", "section-04", "section-05", "section-06"]);
  });

  it("draws the tall frames, the instructor tab bar, and no enrolment in the class details", async () => {
    const { instructorApp, authFlow } = await dictionaries["pt-br"]();
    const { container } = render(<InstructorAppPage locale="pt-br" text={instructorApp} schoolRules={authFlow.schoolRules} />);
    const entry = (id: string) => container.querySelector(`[data-design-id="${id}"]`);
    const tall = (id: string) => entry(id)?.querySelector('[data-testid="phone-frame"]')?.hasAttribute("data-tall");

    for (const id of ["IN-02-01", "IN-03-01", "IN-03-02", "IN-03-09", "IN-04-01", "IN-04-08", "IN-05-01", "IN-06-01", "IN-06-02", "IN-06-05", "IN-06-06"]) {
      expect(tall(id), id).toBe(true);
    }
    for (const id of ["IN-01-01", "IN-03-10", "IN-03-11", "IN-03-12", "IN-05-04"]) {
      expect(tall(id), id).toBe(false);
    }
    for (const id of ["IN-01-01", "IN-02-01", "IN-06-01", "IN-06-02"]) {
      expect([...(entry(id)?.querySelectorAll('[role="tab"]') ?? [])].map((tab) => tab.getAttribute("aria-label")), id).toEqual(["Início", "Aulas", "Pessoas", "Perfil"]);
    }
    for (let index = 1; index <= 14; index += 1) {
      const id = `IN-03-${String(index).padStart(2, "0")}`;
      expect(entry(id)?.querySelector('[data-testid="enrolment-banner"]'), id).toBeNull();
      expect(entry(id)?.textContent, id).not.toMatch(/Pedir para entrar|Cancelar inscrição|Lista de espera/);
    }
    expect(entry("IN-03-01")).toHaveTextContent("Matrículas, cancelamentos e mudanças de horário são feitos pela escola");
    expect(entry("IN-06-02")).toHaveTextContent("Instrutor");
    expect(entry("IN-06-06")?.querySelectorAll('[data-testid="notification-row-unread-dot"]')).toHaveLength(3);
  });
});

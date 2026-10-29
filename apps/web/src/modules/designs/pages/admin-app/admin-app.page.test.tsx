import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { adminAppIds } from "@/modules/designs/data/admin-app-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppPage } from "./admin-app.page";

const TALL = ["AD-01-01", "AD-02-01", "AD-03-01", "AD-04-01", "AD-04-02", "AD-04-11", "AD-06-01", "AD-07-01", "AD-07-07", "AD-07-12", "AD-08-01", "AD-08-06", "AD-09-01", "AD-10-05", "AD-10-09", "AD-11-01", "AD-11-02", "AD-11-03", "AD-11-04", "AD-11-07", "AD-11-08"];

describe("AdminAppPage", { timeout: 30_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("shows the title and every inventory entry in %s", async (locale) => {
    const { adminApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<AdminAppPage locale={locale} text={adminApp} schoolRules={authFlow.schoolRules} />);

    expect(container.querySelector("h1")).toHaveTextContent(adminApp.title);
    expect(adminAppIds).toHaveLength(112);
    for (const id of adminAppIds) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.querySelectorAll("[data-design-id]")).toHaveLength(112);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });

  it("keeps the eleven sections in the inventory's order", async () => {
    const { adminApp, authFlow } = await dictionaries["pt-br"]();
    const { container } = render(<AdminAppPage locale="pt-br" text={adminApp} schoolRules={authFlow.schoolRules} />);

    expect([...container.querySelectorAll('h2[id^="section-"]')].map((heading) => heading.id)).toEqual(Array.from({ length: 11 }, (_, index) => `section-${String(index + 1).padStart(2, "0")}`));
  });

  it("draws the inventory's tall frames, the admin tab bar, and no enrolment in the class details", async () => {
    const { adminApp, authFlow } = await dictionaries["pt-br"]();
    const { container } = render(<AdminAppPage locale="pt-br" text={adminApp} schoolRules={authFlow.schoolRules} />);
    const entry = (id: string) => container.querySelector(`[data-design-id="${id}"]`);
    const tall = (id: string) => entry(id)?.querySelector('[data-testid="phone-frame"]')?.hasAttribute("data-tall");

    for (const id of TALL) {
      expect(tall(id), id).toBe(true);
    }
    for (const id of ["AD-01-02", "AD-03-09", "AD-03-17", "AD-04-03", "AD-05-01", "AD-06-04", "AD-09-02", "AD-10-01"]) {
      expect(tall(id), id).toBe(false);
    }
    for (const id of ["AD-01-01", "AD-02-01", "AD-09-01", "AD-11-04"]) {
      expect([...(entry(id)?.querySelectorAll('[role="tab"]') ?? [])].map((tab) => tab.getAttribute("aria-label")), id).toEqual(["Início", "Aulas", "Pessoas", "Perfil"]);
    }
    for (let index = 1; index <= 20; index += 1) {
      const id = `AD-03-${String(index).padStart(2, "0")}`;
      expect(entry(id)?.querySelector('[data-testid="enrolment-banner"]'), id).toBeNull();
      expect(entry(id)?.textContent, id).not.toMatch(/Pedir para entrar|Cancelar inscrição|Entrar na lista de espera/);
    }
    expect(entry("AD-11-04")).toHaveTextContent("Admin");
    expect(entry("AD-11-08")?.querySelectorAll('[data-testid="notification-row-icon"]')).toHaveLength(adminApp.notifications.length);
    expect(entry("AD-11-08")?.querySelectorAll('[data-testid="notification-row-unread-dot"]')).toHaveLength(4);
    expect(entry("AD-04-06")).toHaveTextContent("8 aulas criadas");
    expect(entry("AD-05-04")).toHaveTextContent("Aviso enviado");
    expect(entry("AD-08-09")).toHaveTextContent("Caio Sousa inscrito · aluno avisado");
  });
});

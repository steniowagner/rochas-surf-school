import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { studentAppIds } from "@/modules/designs/data/student-app-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppPage } from "./student-app.page";

describe("StudentAppPage", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("shows the title and every inventory entry in %s", async (locale) => {
    const { studentApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<StudentAppPage locale={locale} text={studentApp} schoolRules={authFlow.schoolRules} />);

    expect(container.querySelector("h1")).toHaveTextContent(studentApp.title);
    expect(studentAppIds).toHaveLength(86);
    for (const id of studentAppIds) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.querySelectorAll("[data-design-id]")).toHaveLength(86);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });

  it("keeps the six sections in the inventory's order", async () => {
    const { studentApp, authFlow } = await dictionaries["pt-br"]();
    const { container } = render(<StudentAppPage locale="pt-br" text={studentApp} schoolRules={authFlow.schoolRules} />);

    expect([...container.querySelectorAll("h2[id^=\"section-\"]")].map((heading) => heading.id)).toEqual(["section-01", "section-02", "section-03", "section-04", "section-05", "section-06"]);
  });

  it("draws the tall frames of the long screens", async () => {
    const { studentApp, authFlow } = await dictionaries["pt-br"]();
    const { container } = render(<StudentAppPage locale="pt-br" text={studentApp} schoolRules={authFlow.schoolRules} />);

    const tall = (id: string) => container.querySelector(`[data-design-id="${id}"] [data-testid="phone-frame"]`)?.hasAttribute("data-tall");
    for (const id of ["ST-01-01", "ST-02-01", "ST-03-01", "ST-03-10", "ST-04-01", "ST-05-01", "ST-05-19", "ST-06-01"]) {
      expect(tall(id), id).toBe(true);
    }
    expect(tall("ST-01-02")).toBe(false);
    for (const id of ["ST-02-02", "ST-02-03", "ST-02-04", "ST-02-05", "ST-02-07", "ST-02-09", "ST-02-13", "ST-02-14", "ST-02-18", "ST-02-30", "ST-06-05"]) {
      expect(tall(id), id).toBe(false);
    }
    expect(container.querySelector('[data-design-id="ST-05-01"]')).toHaveTextContent("Remover a conta");
  });
});

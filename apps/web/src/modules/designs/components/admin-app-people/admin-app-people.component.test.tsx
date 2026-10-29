import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppPeople } from "./admin-app-people.component";

describe("AdminAppPeople", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppPeople locale={locale} text={adminApp} />);

    for (const id of ["AD-09-01", "AD-09-02", "AD-09-03", "AD-09-04", "AD-09-05", "AD-09-06"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("09 — " + adminApp.sections.people.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

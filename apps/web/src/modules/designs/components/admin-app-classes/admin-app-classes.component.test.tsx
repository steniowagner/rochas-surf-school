import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppClasses } from "./admin-app-classes.component";

describe("AdminAppClasses", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppClasses locale={locale} text={adminApp} />);

    for (const id of ["AD-02-01", "AD-02-02", "AD-02-03", "AD-02-04", "AD-02-05", "AD-02-06", "AD-02-07", "AD-02-08"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("02 — " + adminApp.sections.classes.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

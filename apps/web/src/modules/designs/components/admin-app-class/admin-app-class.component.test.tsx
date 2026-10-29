import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppClass } from "./admin-app-class.component";

describe("AdminAppClass", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppClass locale={locale} text={adminApp} />);

    for (const id of ["AD-03-01", "AD-03-02", "AD-03-03", "AD-03-04", "AD-03-05", "AD-03-06", "AD-03-07", "AD-03-08", "AD-03-09", "AD-03-10", "AD-03-11", "AD-03-12", "AD-03-13", "AD-03-14", "AD-03-15", "AD-03-16", "AD-03-17", "AD-03-18", "AD-03-19", "AD-03-20"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("03 — " + adminApp.sections.class.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

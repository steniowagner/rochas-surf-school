import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppClassForms } from "./admin-app-class-forms.component";

describe("AdminAppClassForms", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppClassForms locale={locale} text={adminApp} />);

    for (const id of ["AD-04-01", "AD-04-02", "AD-04-03", "AD-04-04", "AD-04-05", "AD-04-06", "AD-04-07", "AD-04-08", "AD-04-09", "AD-04-10", "AD-04-11", "AD-04-12", "AD-04-13"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("04 — " + adminApp.sections.classForms.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

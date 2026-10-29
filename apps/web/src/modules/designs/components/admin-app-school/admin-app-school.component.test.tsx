import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppSchool } from "./admin-app-school.component";

describe("AdminAppSchool", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<AdminAppSchool locale={locale} text={adminApp} schoolRules={authFlow.schoolRules} />);

    for (const id of ["AD-10-01", "AD-10-02", "AD-10-03", "AD-10-04", "AD-10-05", "AD-10-06", "AD-10-07", "AD-10-08", "AD-10-09", "AD-10-10", "AD-10-11", "AD-10-12", "AD-10-13", "AD-10-14", "AD-10-15"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("10 — " + adminApp.sections.school.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

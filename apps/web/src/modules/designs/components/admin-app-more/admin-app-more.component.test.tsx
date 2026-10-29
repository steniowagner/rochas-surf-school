import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppMore } from "./admin-app-more.component";

describe("AdminAppMore", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<AdminAppMore locale={locale} text={adminApp} schoolRules={authFlow.schoolRules} />);

    for (const id of ["AD-11-01", "AD-11-02", "AD-11-03", "AD-11-04", "AD-11-05", "AD-11-06", "AD-11-07", "AD-11-08"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("11 — " + adminApp.sections.more.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

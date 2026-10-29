import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppAccounts } from "./admin-app-accounts.component";

describe("AdminAppAccounts", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppAccounts locale={locale} text={adminApp} />);

    for (const id of ["AD-07-01", "AD-07-02", "AD-07-03", "AD-07-04", "AD-07-05", "AD-07-06", "AD-07-07", "AD-07-08", "AD-07-09", "AD-07-10", "AD-07-11", "AD-07-12", "AD-07-13", "AD-07-14", "AD-07-15"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("07 — " + adminApp.sections.accounts.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

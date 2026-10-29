import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppNotices } from "./admin-app-notices.component";

describe("AdminAppNotices", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppNotices locale={locale} text={adminApp} />);

    for (const id of ["AD-05-01", "AD-05-02", "AD-05-03", "AD-05-04", "AD-05-05", "AD-05-06"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("05 — " + adminApp.sections.notices.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

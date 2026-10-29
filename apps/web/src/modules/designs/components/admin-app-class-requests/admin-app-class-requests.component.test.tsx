import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppClassRequests } from "./admin-app-class-requests.component";

describe("AdminAppClassRequests", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppClassRequests locale={locale} text={adminApp} />);

    for (const id of ["AD-06-01", "AD-06-02", "AD-06-03", "AD-06-04", "AD-06-05", "AD-06-06", "AD-06-07", "AD-06-08", "AD-06-09"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("06 — " + adminApp.sections.classRequests.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

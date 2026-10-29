import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AdminAppEnrolStudent } from "./admin-app-enrol-student.component";

describe("AdminAppEnrolStudent", { timeout: 20_000 }, () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { adminApp } = await dictionaries[locale]();
    const { container } = render(<AdminAppEnrolStudent locale={locale} text={adminApp} />);

    for (const id of ["AD-08-01", "AD-08-02", "AD-08-03", "AD-08-04", "AD-08-05", "AD-08-06", "AD-08-07", "AD-08-08", "AD-08-09"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(adminApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("08 — " + adminApp.sections.enrolStudent.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

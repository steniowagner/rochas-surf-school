import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppAgenda } from "./student-app-agenda.component";

describe("StudentAppAgenda", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { studentApp } = await dictionaries[locale]();
    const { container } = render(<StudentAppAgenda locale={locale} text={studentApp} />);

    for (const id of ["ST-01-01", "ST-01-02", "ST-01-03", "ST-01-04", "ST-01-05", "ST-01-06", "ST-01-07"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(studentApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("01 — " + studentApp.sections.agenda.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

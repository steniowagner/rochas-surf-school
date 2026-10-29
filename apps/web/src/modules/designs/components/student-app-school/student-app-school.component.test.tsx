import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppSchool } from "./student-app-school.component";

describe("StudentAppSchool", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { studentApp } = await dictionaries[locale]();
    const { container } = render(<StudentAppSchool locale={locale} text={studentApp} />);

    for (const id of ["ST-04-01", "ST-04-02", "ST-04-03", "ST-04-04", "ST-04-05", "ST-04-06", "ST-04-07", "ST-04-08"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(studentApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("04 — " + studentApp.sections.school.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppHome } from "./instructor-app-home.component";

describe("InstructorAppHome", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { instructorApp } = await dictionaries[locale]();
    const { container } = render(<InstructorAppHome locale={locale} text={instructorApp} />);

    for (const id of ["IN-01-01", "IN-01-02", "IN-01-03"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(instructorApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("01 — " + instructorApp.sections.home.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

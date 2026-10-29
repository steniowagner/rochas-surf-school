import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppClass } from "./instructor-app-class.component";

describe("InstructorAppClass", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { instructorApp } = await dictionaries[locale]();
    const { container } = render(<InstructorAppClass locale={locale} text={instructorApp} />);

    for (const id of ["IN-03-01", "IN-03-02", "IN-03-03", "IN-03-04", "IN-03-05", "IN-03-06", "IN-03-07", "IN-03-08", "IN-03-09", "IN-03-10", "IN-03-11", "IN-03-12", "IN-03-13", "IN-03-14"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(instructorApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("03 — " + instructorApp.sections.class.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

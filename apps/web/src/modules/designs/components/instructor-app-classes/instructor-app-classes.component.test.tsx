import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppClasses } from "./instructor-app-classes.component";

describe("InstructorAppClasses", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { instructorApp } = await dictionaries[locale]();
    const { container } = render(<InstructorAppClasses locale={locale} text={instructorApp} />);

    for (const id of ["IN-02-01", "IN-02-02", "IN-02-03", "IN-02-04", "IN-02-05", "IN-02-06", "IN-02-07"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(instructorApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("02 — " + instructorApp.sections.classes.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

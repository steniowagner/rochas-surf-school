import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppMyClasses } from "./instructor-app-my-classes.component";

describe("InstructorAppMyClasses", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { instructorApp } = await dictionaries[locale]();
    const { container } = render(<InstructorAppMyClasses locale={locale} text={instructorApp} />);

    for (const id of ["IN-04-01", "IN-04-02", "IN-04-03", "IN-04-04", "IN-04-05", "IN-04-06", "IN-04-07", "IN-04-08", "IN-04-09", "IN-04-10", "IN-04-11", "IN-04-12"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(instructorApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("04 — " + instructorApp.sections.myClasses.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppOccupancy } from "./instructor-app-occupancy.component";

describe("InstructorAppOccupancy", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { instructorApp } = await dictionaries[locale]();
    const { container } = render(<InstructorAppOccupancy locale={locale} text={instructorApp} />);

    for (const id of ["IN-05-01", "IN-05-02", "IN-05-03", "IN-05-04", "IN-05-05", "IN-05-06", "IN-05-07"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(instructorApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("05 — " + instructorApp.sections.occupancy.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

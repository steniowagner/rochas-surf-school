import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { InstructorAppMore } from "./instructor-app-more.component";

describe("InstructorAppMore", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { instructorApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<InstructorAppMore locale={locale} text={instructorApp} schoolRules={authFlow.schoolRules} />);

    for (const id of ["IN-06-01", "IN-06-02", "IN-06-03", "IN-06-04", "IN-06-05", "IN-06-06"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(instructorApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("06 — " + instructorApp.sections.more.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

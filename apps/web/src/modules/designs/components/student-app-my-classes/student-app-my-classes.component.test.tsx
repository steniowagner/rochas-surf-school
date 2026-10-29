import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppMyClasses } from "./student-app-my-classes.component";

describe("StudentAppMyClasses", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { studentApp } = await dictionaries[locale]();
    const { container } = render(<StudentAppMyClasses locale={locale} text={studentApp} />);

    for (const id of ["ST-03-01", "ST-03-02", "ST-03-03", "ST-03-04", "ST-03-05", "ST-03-06", "ST-03-07", "ST-03-08", "ST-03-09", "ST-03-10", "ST-03-11", "ST-03-12", "ST-03-13", "ST-03-14"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(studentApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("03 — " + studentApp.sections.myClasses.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppClass } from "./student-app-class.component";

describe("StudentAppClass", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { studentApp } = await dictionaries[locale]();
    const { container } = render(<StudentAppClass locale={locale} text={studentApp} />);

    for (const id of ["ST-02-01", "ST-02-02", "ST-02-03", "ST-02-04", "ST-02-05", "ST-02-06", "ST-02-07", "ST-02-08", "ST-02-09", "ST-02-10", "ST-02-11", "ST-02-12", "ST-02-13", "ST-02-14", "ST-02-15", "ST-02-16", "ST-02-17", "ST-02-18", "ST-02-19", "ST-02-20", "ST-02-21", "ST-02-22", "ST-02-23", "ST-02-24", "ST-02-25", "ST-02-26", "ST-02-27", "ST-02-28", "ST-02-29", "ST-02-30"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(studentApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("02 — " + studentApp.sections.class.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

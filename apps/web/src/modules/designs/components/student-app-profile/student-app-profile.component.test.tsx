import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppProfile } from "./student-app-profile.component";

describe("StudentAppProfile", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { studentApp, authFlow } = await dictionaries[locale]();
    const { container } = render(<StudentAppProfile locale={locale} text={studentApp} schoolRules={authFlow.schoolRules} />);

    for (const id of ["ST-05-01", "ST-05-02", "ST-05-03", "ST-05-04", "ST-05-05", "ST-05-06", "ST-05-07", "ST-05-08", "ST-05-09", "ST-05-10", "ST-05-11", "ST-05-12", "ST-05-13", "ST-05-14", "ST-05-15", "ST-05-16", "ST-05-17", "ST-05-18", "ST-05-19", "ST-05-20", "ST-05-21", "ST-05-22"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(studentApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("05 — " + studentApp.sections.profile.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

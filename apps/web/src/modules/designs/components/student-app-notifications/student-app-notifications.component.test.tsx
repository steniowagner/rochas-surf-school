import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { StudentAppNotifications } from "./student-app-notifications.component";

describe("StudentAppNotifications", () => {
  it.each(["pt-br", "es", "en"] as const)("draws every entry of the section in %s, with its title and note", async (locale) => {
    const { studentApp } = await dictionaries[locale]();
    const { container } = render(<StudentAppNotifications locale={locale} text={studentApp} />);

    for (const id of ["ST-06-01", "ST-06-02", "ST-06-03", "ST-06-04", "ST-06-05"] as const) {
      const entry = container.querySelector(`[data-design-id="${id}"]`);
      expect(entry, id).not.toBeNull();
      expect(entry).toHaveTextContent(studentApp.entries[id].title);
      expect(entry?.querySelector('[data-testid="phone-frame"]'), id).not.toBeNull();
    }
    expect(container.querySelector("h2")).toHaveTextContent("06 — " + studentApp.sections.notifications.title);
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemStates } from "./design-system-states.component";

const ids = ['DS-09-01', 'DS-09-02', 'DS-09-03', 'DS-09-04'];

describe("DesignSystemStates", () => {
  it.each(["pt-br", "es", "en"] as const)("shows every entry of its section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemStates locale={locale} text={text} />);

    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemStructure } from "./design-system-structure.component";

const ids = ['DS-07-01', 'DS-07-02', 'DS-07-03', 'DS-07-04', 'DS-07-05', 'DS-07-06', 'DS-07-07', 'DS-07-08', 'DS-07-09', 'DS-07-10', 'DS-07-11', 'DS-07-12', 'DS-07-13', 'DS-07-14', 'DS-07-15'];

describe("DesignSystemStructure", () => {
  it.each(["pt-br", "es", "en"] as const)("shows every entry of its section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemStructure locale={locale} text={text} />);

    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<[a-z]+>/);
  });
});

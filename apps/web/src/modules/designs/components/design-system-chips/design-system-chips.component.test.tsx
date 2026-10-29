import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemChips } from "./design-system-chips.component";

const ids = ['DS-05-01', 'DS-05-02', 'DS-05-03'];

describe("DesignSystemChips", () => {
  it.each(["pt-br", "es", "en"] as const)("shows every entry of its section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemChips locale={locale} text={text} />);

    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemShape } from "./design-system-shape.component";

const ids = ['DS-03-01', 'DS-03-02', 'DS-03-03', 'DS-03-04'];

describe("DesignSystemShape", () => {
  it.each(["pt-br", "es", "en"] as const)("shows every entry of its section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemShape locale={locale} text={text} />);

    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<[a-z]+>/);
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemControls } from "./design-system-controls.component";

const ids = ['DS-04-01', 'DS-04-02', 'DS-04-03', 'DS-04-04', 'DS-04-05', 'DS-04-06', 'DS-04-07', 'DS-04-08', 'DS-04-09', 'DS-04-10', 'DS-04-11'];

describe("DesignSystemControls", () => {
  it.each(["pt-br", "es", "en"] as const)("shows every entry of its section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemControls locale={locale} text={text} />);

    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<[a-z]+>/);
  });
});

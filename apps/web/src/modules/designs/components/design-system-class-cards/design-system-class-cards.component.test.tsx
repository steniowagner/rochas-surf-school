import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemClassCards } from "./design-system-class-cards.component";

const ids = ['DS-06-01', 'DS-06-02', 'DS-06-03', 'DS-06-04', 'DS-06-05', 'DS-06-06', 'DS-06-07', 'DS-06-08', 'DS-06-09', 'DS-06-10'];

describe("DesignSystemClassCards", () => {
  it.each(["pt-br", "es", "en"] as const)("shows every entry of its section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemClassCards locale={locale} text={text} />);

    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<[a-z]+>/);
  });
});

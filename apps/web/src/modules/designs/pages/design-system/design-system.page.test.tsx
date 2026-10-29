import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { designSystemIds } from "@/modules/designs/data/design-system-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { DesignSystemPage } from "./design-system.page";

describe("DesignSystemPage", () => {
  it.each(["pt-br", "es", "en"] as const)("shows the title and every inventory entry in %s", async (locale) => {
    const text = (await dictionaries[locale]()).designSystem;
    const { container } = render(<DesignSystemPage locale={locale} text={text} />);

    expect(container.querySelector("h1")).toHaveTextContent(text.title);
    for (const id of designSystemIds) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
  });
});

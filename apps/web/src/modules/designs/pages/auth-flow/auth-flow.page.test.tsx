import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { authFlowIds } from "@/modules/designs/data/auth-flow-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AuthFlowPage } from "./auth-flow.page";

describe("AuthFlowPage", () => {
  it.each(["pt-br", "es", "en"] as const)("shows the title and every inventory entry in %s", async (locale) => {
    const text = (await dictionaries[locale]()).authFlow;
    const { container } = render(<AuthFlowPage locale={locale} text={text} />);

    expect(container.querySelector("h1")).toHaveTextContent(text.title);
    for (const id of authFlowIds) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
    expect(container.textContent).not.toMatch(/\{\{|<\/?[a-z]+>/);
  });

  it("keeps the four sections in the inventory's order", async () => {
    const text = (await dictionaries["pt-br"]()).authFlow;
    const { container } = render(<AuthFlowPage locale="pt-br" text={text} />);

    expect([...container.querySelectorAll("h2")].map((heading) => heading.id)).toEqual(["section-01", "section-02", "section-03", "section-04"]);
  });
});

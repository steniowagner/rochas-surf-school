import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { authFlowIds } from "@/modules/designs/data/auth-flow-ids";
import { dictionaries } from "@/modules/designs/i18n/test-dictionaries";

import { AuthFlowOnboarding } from "./auth-flow-onboarding.component";

const prefix = "AF-03-";

describe("AuthFlowOnboarding", () => {
  it.each(["pt-br", "es", "en"] as const)("draws the section title and every entry of the section in %s", async (locale) => {
    const text = (await dictionaries[locale]()).authFlow;
    const { container } = render(<AuthFlowOnboarding locale={locale} text={text} />);

    expect(container.querySelector("h2")).toHaveTextContent(text.sections.onboarding.title);
    const ids = authFlowIds.filter((id) => id.startsWith(prefix));
    expect(container.querySelectorAll("[data-design-id]")).toHaveLength(ids.length);
    for (const id of ids) {
      expect(container.querySelector(`[data-design-id="${id}"]`), id).not.toBeNull();
    }
  });
});

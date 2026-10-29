import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppIcon } from "./app-icon.component";
import { glyphs } from "./app-icon.constants";

describe("AppIcon", () => {
  it("draws an svg of the given size, hidden from screen readers", () => {
    const { container } = render(<AppIcon name="Ionicons:search" size={19} className="text-ink-2" />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("height", "19");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveClass("text-ink-2");
  });

  it("draws every glyph of the registry", () => {
    for (const name of Object.keys(glyphs) as (keyof typeof glyphs)[]) {
      const { container, unmount } = render(<AppIcon name={name} />);
      expect(container.querySelector("svg"), name).not.toBeNull();
      unmount();
    }
  });
});

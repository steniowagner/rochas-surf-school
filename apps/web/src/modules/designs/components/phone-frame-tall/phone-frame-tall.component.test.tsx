import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhoneFrameTall } from "./phone-frame-tall.component";

describe("PhoneFrameTall", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("draws the content at 402 points wide, as high as it is", () => {
    render(<PhoneFrameTall><p>screen</p></PhoneFrameTall>);

    const frame = screen.getByTestId("phone-frame");
    expect(frame).toHaveAttribute("data-tall");
    expect(frame.getAttribute("style") ?? "").not.toContain("aspect-ratio");
    expect(frame.firstElementChild).toHaveStyle({ width: "402px" });
    expect(frame.firstElementChild?.getAttribute("style") ?? "").not.toContain("height:");
    expect(screen.getByText("screen")).toBeInTheDocument();
  });

  it("sets the frame height from the measured content and keeps it in step with the width", () => {
    const observed: Element[] = [];
    let notify = () => {};
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { notify = callback; }
      observe(target: Element) { observed.push(target); }
      disconnect() {}
    });
    const offsetHeight = vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(1608);
    const offsetWidth = vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(201);
    render(<PhoneFrameTall><p>screen</p></PhoneFrameTall>);

    expect(observed).toHaveLength(2);
    expect(screen.getByTestId("phone-frame")).toHaveStyle({ height: "806px" });

    offsetWidth.mockReturnValue(402);
    act(() => notify());
    expect(screen.getByTestId("phone-frame")).toHaveStyle({ height: "1610px" });
    offsetHeight.mockRestore();
    offsetWidth.mockRestore();
  });
});

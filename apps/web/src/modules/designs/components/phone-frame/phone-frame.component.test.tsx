import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PhoneFrame } from "./phone-frame.component";

describe("PhoneFrame", () => {
  it("draws the status bar time and the content at 402 × 874 points", () => {
    render(<PhoneFrame caption="Agenda"><p>screen</p></PhoneFrame>);

    expect(screen.getByText("9:41")).toBeInTheDocument();
    expect(screen.getByText("screen")).toBeInTheDocument();
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByTestId("phone-frame").firstElementChild).toHaveStyle({ width: "402px", height: "874px" });
  });

  it("takes a custom time and no caption", () => {
    render(<PhoneFrame time="10:02">x</PhoneFrame>);

    expect(screen.getByText("10:02")).toBeInTheDocument();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("draws the status bar over a full-bleed content", () => {
    render(<PhoneFrame fullBleed><p>screen</p></PhoneFrame>);

    expect(screen.getByText("9:41").parentElement).toHaveClass("absolute", "text-on-color");
    expect(screen.getByText("screen").parentElement).toHaveClass("h-[874px]");
  });

  describe("tall", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("grows to the content instead of 874 points and keeps the status bar at the top", () => {
      vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
      render(<PhoneFrame tall><p>screen</p></PhoneFrame>);

      const frame = screen.getByTestId("phone-frame");
      expect(frame).toHaveAttribute("data-tall");
      expect(frame.getAttribute("style") ?? "").not.toContain("aspect-ratio");
      expect(frame.firstElementChild).toHaveStyle({ width: "402px" });
      expect(frame.firstElementChild).not.toHaveStyle({ height: "874px" });
      expect(frame.firstElementChild).toHaveClass("relative");
      expect(screen.getByText("screen").parentElement).not.toHaveClass("h-[calc(874px-56px)]");
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
      render(<PhoneFrame tall><p>screen</p></PhoneFrame>);

      expect(observed).toHaveLength(2);
      expect(screen.getByTestId("phone-frame")).toHaveStyle({ height: "806px" });

      offsetWidth.mockReturnValue(402);
      act(() => notify());
      expect(screen.getByTestId("phone-frame")).toHaveStyle({ height: "1610px" });
      offsetHeight.mockRestore();
      offsetWidth.mockRestore();
    });
  });
});

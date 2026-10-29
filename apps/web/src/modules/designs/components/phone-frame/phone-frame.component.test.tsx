import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});

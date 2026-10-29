import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OtpInput } from "./otp-input.component";

describe("OtpInput", () => {
  it("draws one box per digit with the next one in sun", () => {
    render(<OtpInput value="123" />);

    const boxes = screen.getAllByTestId("otp-box");
    expect(boxes).toHaveLength(6);
    expect(boxes[0]).toHaveTextContent("1");
    expect(boxes[3]).toHaveClass("border-sun");
    expect(boxes[4]).toHaveClass("border-input-line");
  });

  it("draws every box in bad on error and none in sun when not editable", () => {
    const { rerender } = render(<OtpInput value="12" status="error" />);
    expect(screen.getAllByTestId("otp-box").every((box) => box.classList.contains("border-bad"))).toBe(true);

    rerender(<OtpInput value="12" editable={false} length={4} />);
    expect(screen.getAllByTestId("otp-box")).toHaveLength(4);
    expect(screen.getAllByTestId("otp-box").some((box) => box.classList.contains("border-sun"))).toBe(false);
  });
});

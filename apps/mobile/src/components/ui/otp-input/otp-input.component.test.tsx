import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { StyleSheet, TextInput as NativeTextInput } from "react-native";
import { useState } from "react";

import { OtpInput } from "./otp-input.component";
import { OtpInputProps } from "./otp-input.types";

function Harness(props: Partial<OtpInputProps>) {
  const [value, setValue] = useState("");

  return (
    <OtpInput
      value={value}
      onChangeText={setValue}
      accessibilityLabel="Code"
      {...props}
    />
  );
}

const getInput = () => screen.getByLabelText("Code");

describe("OtpInput", () => {
  it("renders six boxes and a numeric one-time-code input", async () => {
    await render(<Harness />);

    expect(screen.getAllByTestId("otp-box")).toHaveLength(6);
    expect(getInput().props.keyboardType).toBe("number-pad");
    expect(getInput().props.textContentType).toBe("oneTimeCode");
    expect(getInput().props.maxLength).toBeUndefined();
  });

  it("honors a custom length", async () => {
    await render(<Harness length={4} />);

    expect(screen.getAllByTestId("otp-box")).toHaveLength(4);
  });

  it("keeps only digits", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.type(getInput(), "12a3");

    expect(getInput().props.value).toBe("123");
    expect(screen.getByText("3")).toBeOnTheScreen();
  });

  it("fills the code from a pasted text", async () => {
    await render(<Harness />);

    await fireEvent.changeText(getInput(), "Your code: 123 456");

    expect(getInput().props.value).toBe("123456");
  });

  it("cuts a pasted text to the length", async () => {
    await render(<Harness />);

    await fireEvent.changeText(getInput(), "12345678");

    expect(getInput().props.value).toBe("123456");
  });

  it("marks the next box and the error state", async () => {
    const { rerender } = await render(<Harness />);
    expect(screen.getAllByTestId("otp-box")[0].props.className).toContain(
      "border-sun",
    );

    await rerender(<OtpInput value="12" onChangeText={() => {}} />);
    expect(screen.getAllByTestId("otp-box")[2].props.className).toContain(
      "border-sun",
    );

    await rerender(
      <OtpInput value="12" onChangeText={() => {}} status="error" />,
    );
    for (const box of screen.getAllByTestId("otp-box")) {
      expect(box.props.className).toContain("border-bad");
    }
  });

  it("focuses the input when the boxes are tapped", async () => {
    const focus = jest.spyOn(NativeTextInput.prototype, "focus");
    await render(<Harness />);
    focus.mockClear();

    await fireEvent.press(screen.getByTestId("otp-boxes"));

    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
  });

  it("is not editable when editable is false", async () => {
    await render(<Harness editable={false} />);

    expect(getInput().props.editable).toBe(false);
    expect(screen.getAllByTestId("otp-box")[0].props.className).not.toContain(
      "border-sun",
    );
  });

  it("keeps the hidden input hit-testable, so the native paste menu can open", async () => {
    await render(<Harness />);

    const { opacity } = StyleSheet.flatten(getInput().props.style);

    expect(opacity).toBeGreaterThanOrEqual(0.01);
    expect(opacity).toBeLessThan(0.05);
  });
});

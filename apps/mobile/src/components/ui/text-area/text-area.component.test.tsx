import { render, screen, userEvent } from "@testing-library/react-native";
import { createRef } from "react";
import { TextInput as NativeTextInput } from "react-native";

import { TextArea } from "./text-area.component";

jest.useFakeTimers();

describe("TextArea", () => {
  it("forwards typing to onChangeText", async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();

    await render(
      <TextArea
        value=""
        maxLength={500}
        placeholder="Reason"
        onChangeText={onChangeText}
      />,
    );
    await user.type(screen.getByPlaceholderText("Reason"), "H");

    expect(onChangeText).toHaveBeenLastCalledWith("H");
  });

  it("is multi-line and passes maxLength to the native input", async () => {
    await render(<TextArea value="" maxLength={500} placeholder="Reason" />);

    const input = screen.getByPlaceholderText("Reason");
    expect(input.props.multiline).toBe(true);
    expect(input.props.maxLength).toBe(500);
  });

  it("shows the counter of the current value", async () => {
    const { rerender } = await render(<TextArea value="" maxLength={500} />);
    expect(screen.getByText("0/500")).toBeOnTheScreen();

    await rerender(<TextArea value={"a".repeat(500)} maxLength={500} />);
    expect(screen.getByText("500/500")).toBeOnTheScreen();
  });

  it("shows the label when given and omits it otherwise", async () => {
    const { rerender } = await render(
      <TextArea value="" maxLength={10} label="Reason (optional)" />,
    );
    expect(screen.getByText("Reason (optional)")).toBeOnTheScreen();

    await rerender(<TextArea value="" maxLength={10} />);
    expect(screen.queryByText("Reason (optional)")).toBeNull();
  });

  it("forwards the ref", async () => {
    const ref = createRef<NativeTextInput>();

    await render(<TextArea value="" maxLength={10} ref={ref} />);

    expect(ref.current).not.toBeNull();
  });

  it("works as the input of a bottom sheet", async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();

    await render(
      <TextArea
        inBottomSheet
        value=""
        maxLength={500}
        placeholder="Reason"
        onChangeText={onChangeText}
      />,
    );
    await user.type(screen.getByPlaceholderText("Reason"), "H");

    expect(onChangeText).toHaveBeenLastCalledWith("H");
    expect(screen.getByPlaceholderText("Reason").props.multiline).toBe(true);
  });
});

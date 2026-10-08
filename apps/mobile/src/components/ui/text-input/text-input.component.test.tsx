import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { createRef } from "react";
import { Text, TextInput as NativeTextInput } from "react-native";

import { TextInput } from "./text-input.component";

jest.useFakeTimers();

const icon = <Text>icon</Text>;

describe("TextInput", () => {
  it("forwards typing to onChangeText", async () => {
    const user = userEvent.setup();
    const onChangeText = jest.fn();
    await render(
      <TextInput icon={icon} placeholder="Name" onChangeText={onChangeText} />,
    );

    await user.type(screen.getByPlaceholderText("Name"), "Ana");

    expect(onChangeText).toHaveBeenLastCalledWith("Ana");
  });

  it("shows the placeholder and the icon", async () => {
    await render(<TextInput icon={icon} placeholder="Name" />);

    expect(screen.getByPlaceholderText("Name")).toBeOnTheScreen();
    expect(screen.getByText("icon")).toBeOnTheScreen();
  });

  it("shows errorMessage only when status is error", async () => {
    const { rerender } = await render(
      <TextInput icon={icon} status="neutral" errorMessage="Bad value" />,
    );
    expect(screen.queryByText("Bad value")).toBeNull();

    await rerender(
      <TextInput icon={icon} status="error" errorMessage="Bad value" />,
    );
    expect(screen.getByText("Bad value")).toBeOnTheScreen();
  });

  it.each([
    [undefined, "border-input-line"],
    ["neutral", "border-input-line"],
    ["error", "border-bad"],
  ] as const)(
    "applies the border of status %s",
    async (status, borderClass) => {
      await render(
        <TextInput icon={icon} placeholder="Name" status={status} />,
      );

      const row = screen.getByPlaceholderText("Name").parent;

      expect(row?.props.className).toContain(borderClass);
    },
  );

  it("calls onBlur and onSubmitEditing", async () => {
    const user = userEvent.setup();
    const onBlur = jest.fn();
    const onSubmitEditing = jest.fn();
    await render(
      <TextInput
        icon={icon}
        placeholder="Name"
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
      />,
    );
    const input = screen.getByPlaceholderText("Name");

    await user.type(input, "Ana", { submitEditing: true });
    fireEvent(input, "blur");

    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalled();
  });

  it("forwards the ref so the input can be focused", async () => {
    const ref = createRef<NativeTextInput>();
    await render(<TextInput icon={icon} ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focus).toBe("function");
  });
});

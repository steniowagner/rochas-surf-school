import { render, screen, userEvent } from "@testing-library/react-native";

import { DenySheet } from "./deny-sheet.component";
import { DenySheetProps } from "./deny-sheet.types";

jest.useFakeTimers();

// The global sheet mock renders no backdrop; this one shows the content and a backdrop that closes it.
jest.mock("@/components/ui/bottom-modal", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, View } = require("react-native");

  return {
    BottomModal: ({ onClose, children }: any) => (
      <View>
        <Pressable accessibilityLabel="backdrop" onPress={onClose} />
        {children}
      </View>
    ),
  };
});

const baseProps: DenySheetProps = {
  visible: true,
  title: "Deny Ana Souza?",
  hint: "The reason is optional.",
  label: "Reason (optional)",
  placeholder: "E.g.: No spots left.",
  backLabel: "Back",
  confirmLabel: "Deny registration",
  maxLength: 500,
  loading: false,
  onConfirm: jest.fn(),
  onClose: jest.fn(),
};

function props(overrides: Partial<DenySheetProps> = {}): DenySheetProps {
  return {
    ...baseProps,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("DenySheet", () => {
  it("shows the title, the hint, the field with its counter and the button", async () => {
    await render(<DenySheet {...props()} />);

    expect(screen.getByText("Deny Ana Souza?")).toBeOnTheScreen();
    expect(screen.getByText("The reason is optional.")).toBeOnTheScreen();
    expect(screen.queryByText("Reason (optional)")).toBeNull();
    expect(screen.getByLabelText("Reason (optional)")).toBeOnTheScreen();
    expect(
      screen.getByPlaceholderText("E.g.: No spots left."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(screen.getByText("0/500")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Deny registration" }),
    ).toBeOnTheScreen();
  });

  it("confirms with the typed reason", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<DenySheet {...sheet} />);

    await user.type(screen.getByLabelText("Reason (optional)"), "Unknown");
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    expect(sheet.onConfirm).toHaveBeenCalledWith("Unknown");
  });

  it("confirms with an empty reason when nothing was typed", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<DenySheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    expect(sheet.onConfirm).toHaveBeenCalledWith("");
  });

  it("clears the reason when it closes", async () => {
    const user = userEvent.setup();
    const sheet = props();
    const { rerender } = await render(<DenySheet {...sheet} />);
    await user.type(screen.getByLabelText("Reason (optional)"), "Unknown");
    expect(screen.getByText("7/500")).toBeOnTheScreen();

    await rerender(<DenySheet {...sheet} visible={false} />);
    await rerender(<DenySheet {...sheet} visible />);

    expect(screen.getByText("0/500")).toBeOnTheScreen();
  });

  it("clears the reason and calls onClose when the sheet is closed", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<DenySheet {...sheet} />);
    await user.type(screen.getByLabelText("Reason (optional)"), "Unknown");

    await user.press(screen.getByLabelText("backdrop"));

    expect(sheet.onClose).toHaveBeenCalled();
    expect(screen.getByText("0/500")).toBeOnTheScreen();
  });

  it("closes and clears the reason when Back is pressed, without confirming", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<DenySheet {...sheet} />);
    await user.type(screen.getByLabelText("Reason (optional)"), "Unknown");

    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("0/500")).toBeOnTheScreen();
  });

  it("ignores presses on the button while loading", async () => {
    const user = userEvent.setup();
    const sheet = props({ loading: true });
    await render(<DenySheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("leaves the reason field out when asked, and still confirms", async () => {
    const user = userEvent.setup();
    const sheet = props({ hideReason: true });
    await render(<DenySheet {...sheet} />);

    expect(screen.queryByLabelText("Reason (optional)")).toBeNull();
    expect(screen.queryByText("0/500")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    expect(sheet.onConfirm).toHaveBeenCalledWith("");
  });
});

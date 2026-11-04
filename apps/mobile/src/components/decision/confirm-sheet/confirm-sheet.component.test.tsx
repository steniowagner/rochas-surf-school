import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { ConfirmSheet } from "./confirm-sheet.component";
import { ConfirmSheetProps } from "./confirm-sheet.types";

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

const getSpinners = () =>
  screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

function props(overrides: Partial<ConfirmSheetProps> = {}): ConfirmSheetProps {
  return {
    visible: true,
    title: "Approve entry?",
    description: "Ana Souza joins the school.",
    confirmLabel: "Approve",
    confirmIcon: <Text>icon</Text>,
    cancelLabel: "Cancel",
    loading: false,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("ConfirmSheet", () => {
  it("shows the title, the description, the confirm button with its icon and cancel", async () => {
    await render(<ConfirmSheet {...props()} />);

    expect(screen.getByText("Approve entry?")).toBeOnTheScreen();
    expect(screen.getByText("Ana Souza joins the school.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Approve" })).toBeOnTheScreen();
    expect(screen.getByText("icon")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
  });

  it("calls onConfirm when the confirm button is pressed", async () => {
    const user = userEvent.setup();
    const sheet = props({ confirmVariant: "success" });
    await render(<ConfirmSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Approve" }));

    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(sheet.onClose).not.toHaveBeenCalled();
  });

  it("calls onClose and not onConfirm on cancel", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ConfirmSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Cancel" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onClose and not onConfirm when the backdrop closes it (cancel)", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ConfirmSheet {...sheet} />);

    await user.press(screen.getByLabelText("backdrop"));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("shows the spinner and ignores presses on confirm while loading", async () => {
    const user = userEvent.setup();
    const sheet = props({ loading: true });
    await render(<ConfirmSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Approve" }));

    expect(getSpinners()).toHaveLength(1);
    expect(screen.queryByText("icon")).toBeNull();
    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("keeps the description it was open with while it closes, and shows the new one when it opens again", async () => {
    const view = await render(<ConfirmSheet {...props()} />);

    await view.rerender(
      <ConfirmSheet
        {...props({ visible: false, description: " joins the school." })}
      />,
    );
    expect(screen.getByText("Ana Souza joins the school.")).toBeOnTheScreen();

    await view.rerender(
      <ConfirmSheet
        {...props({ description: "Bruno Lima joins the school." })}
      />,
    );
    expect(screen.getByText("Bruno Lima joins the school.")).toBeOnTheScreen();
  });
});

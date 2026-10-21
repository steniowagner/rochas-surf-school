import { render, screen, userEvent } from "@testing-library/react-native";

import { CancelClassSheet } from "./cancel-class-sheet.component";
import type { CancelClassSheetProps } from "./cancel-class-sheet.types";

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

function props(overrides: Partial<CancelClassSheetProps> = {}): CancelClassSheetProps {
  return {
    visible: true,
    loading: false,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

const CONFIRM = { name: "Cancel and notify" };

describe("CancelClassSheet", () => {
  it("shows the title, the description, the field with its counter and both buttons", async () => {
    await render(<CancelClassSheet {...props()} />);

    expect(screen.getByText("Cancel this class?")).toBeOnTheScreen();
    expect(
      screen.getByText("We'll notify the class's instructors. It stays on the schedule, marked as cancelled."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Message (optional)")).toBeOnTheScreen();
    expect(screen.getByText("0/300")).toBeOnTheScreen();
    expect(screen.getByRole("button", CONFIRM)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Keep class" })).toBeOnTheScreen();
  });

  it("confirms with the trimmed message", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<CancelClassSheet {...sheet} />);

    await user.type(screen.getByLabelText("Message (optional)"), "  Big waves.  ");
    await user.press(screen.getByRole("button", CONFIRM));

    expect(sheet.onConfirm).toHaveBeenCalledWith("Big waves.");
  });

  it.each([[""], ["   "]])("confirms without a message when it is %j", async (typed) => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<CancelClassSheet {...sheet} />);

    if (typed) await user.type(screen.getByLabelText("Message (optional)"), typed);
    await user.press(screen.getByRole("button", CONFIRM));

    expect(sheet.onConfirm).toHaveBeenCalledWith(undefined);
  });

  it("stops the message at 300 characters", async () => {
    const user = userEvent.setup();
    await render(<CancelClassSheet {...props()} />);

    await user.type(screen.getByLabelText("Message (optional)"), "m".repeat(320));

    expect(screen.getByText("300/300")).toBeOnTheScreen();
  });

  it("keeps the class without a request: closes and clears the message", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<CancelClassSheet {...sheet} />);
    await user.type(screen.getByLabelText("Message (optional)"), "Big waves.");

    await user.press(screen.getByRole("button", { name: "Keep class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("0/300")).toBeOnTheScreen();
  });

  it("clears the message and calls onClose when the sheet is dismissed", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<CancelClassSheet {...sheet} />);
    await user.type(screen.getByLabelText("Message (optional)"), "Big waves.");

    await user.press(screen.getByLabelText("backdrop"));

    expect(sheet.onClose).toHaveBeenCalled();
    expect(screen.getByText("0/300")).toBeOnTheScreen();
  });

  it("clears the message when it closes from the outside", async () => {
    const user = userEvent.setup();
    const sheet = props();
    const { rerender } = await render(<CancelClassSheet {...sheet} />);
    await user.type(screen.getByLabelText("Message (optional)"), "Big waves.");
    expect(screen.getByText("10/300")).toBeOnTheScreen();

    await rerender(<CancelClassSheet {...sheet} visible={false} />);
    await rerender(<CancelClassSheet {...sheet} visible />);

    expect(screen.getByText("0/300")).toBeOnTheScreen();
  });

  it("ignores presses on the confirm button while loading", async () => {
    const user = userEvent.setup();
    const sheet = props({ loading: true });
    await render(<CancelClassSheet {...sheet} />);

    await user.press(screen.getByRole("button", CONFIRM));

    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("warns the admin that the trial guests get no notice", async () => {
    await render(<CancelClassSheet {...props({ guestCount: 2 })} />);

    expect(
      screen.getByText("2 trial students have no account and won't get the notice — talk to them on WhatsApp."),
    ).toBeOnTheScreen();
  });

  it("shows no trial warning without guests", async () => {
    await render(<CancelClassSheet {...props()} />);

    expect(screen.queryByText(/trial student/)).toBeNull();
  });

  it.each([
    [
      { studentCount: 2, pendingCount: 1, instructorCount: 1 },
      "We'll notify 2 enrolled students, 1 person with a pending request and 1 instructor. It stays on the schedule, marked as cancelled.",
    ],
    [
      { studentCount: 1, pendingCount: 3, instructorCount: 2 },
      "We'll notify 1 enrolled student, 3 people with a pending request and 2 instructors. It stays on the schedule, marked as cancelled.",
    ],
    [
      { studentCount: 0, pendingCount: 0, instructorCount: 2 },
      "We'll notify 2 instructors. It stays on the schedule, marked as cancelled.",
    ],
    [
      { studentCount: 4, pendingCount: 0, instructorCount: 0 },
      "We'll notify 4 enrolled students. It stays on the schedule, marked as cancelled.",
    ],
  ])("names who will be told: %j", async (counts, description) => {
    await render(<CancelClassSheet {...props(counts)} />);

    expect(screen.getByText(description)).toBeOnTheScreen();
  });
});

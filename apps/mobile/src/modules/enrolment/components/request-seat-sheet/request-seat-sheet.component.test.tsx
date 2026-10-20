import { render, screen, userEvent } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";

import { RequestSeatSheet } from "./request-seat-sheet.component";
import type { RequestSeatSheetProps } from "./request-seat-sheet.types";

jest.useFakeTimers();

// Shows whether the rules sheet is open: the global sheet mock draws its content even when it is closed.
jest.mock("@/modules/cancellation-rules/components/cancellation-rules-sheet", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require("react-native");

  return {
    CancellationRulesSheet: ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
      <Pressable accessibilityLabel="close-rules" onPress={onClose}>
        <Text>{visible ? "rules-open" : "rules-closed"}</Text>
      </Pressable>
    ),
  };
});

// Shows what the request sheet is told: the global sheet mock keeps every sheet mounted and never dismisses.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { useRef } = require("react");
  const { Pressable, Text, View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({
      visible,
      onClose,
      children,
    }: {
      visible: boolean;
      onClose: () => void;
      children: React.ReactNode;
    }) => {
      // Like the sheet library, it keeps calling the `onClose` it was first given.
      const firstOnClose = useRef(onClose).current;

      return (
        <View>
          <Text>{visible ? "request-shown" : "request-hidden"}</Text>
          <Pressable accessibilityLabel="dismiss-request" onPress={firstOnClose} />
          {children}
        </View>
      );
    },
  };
});

beforeEach(setupSignedInUser);

function props(overrides: Partial<RequestSeatSheetProps> = {}): RequestSeatSheetProps {
  return {
    visible: true,
    loading: false,
    waitingList: false,
    summary: "Surf Beginner · Tomorrow · 08:00",
    discipline: "surf",
    deadline: "Mon, Oct 19 · 8:00 PM",
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

const renderSheet = async (overrides: Partial<RequestSeatSheetProps> = {}) => {
  const sheet = props(overrides);
  const Wrapper = createWrapper(createQueryClient());
  const view = await render(
    <Wrapper>
      <RequestSeatSheet {...sheet} />
    </Wrapper>,
  );

  return { sheet, view, user: userEvent.setup() };
};

const SUBMIT = { name: "Send request" };
const RULE = "I read and accept the cancellation rule";

describe("RequestSeatSheet", () => {
  it("shows the class line, the deadline and the rule to accept, with Send request disabled until it is ticked", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "Cancele até 1 hora antes.", skate: null }));
    const { user } = await renderSheet();

    expect(screen.getByText("Request a seat")).toBeOnTheScreen();
    expect(
      screen.getByText("Surf Beginner · Tomorrow · 08:00. Your request stays pending until the school confirms."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Cancellation · Surf")).toBeOnTheScreen();
    expect(screen.getByText("Cancel until Mon, Oct 19 · 8:00 PM")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Not now" })).toBeOnTheScreen();
    expect(screen.getByRole("button", SUBMIT)).toBeDisabled();

    await user.press(screen.getByRole("checkbox", { name: RULE }));

    expect(screen.getByRole("button", SUBMIT)).toBeEnabled();
  });

  it("sends once ticked and closes with Not now", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "Regra.", skate: null }));
    const { sheet, user } = await renderSheet();

    await user.press(screen.getByRole("checkbox", { name: RULE }));
    await user.press(screen.getByRole("button", SUBMIT));
    await user.press(screen.getByRole("button", { name: "Not now" }));

    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(sheet.onClose).toHaveBeenCalledTimes(1);
  });

  it("says the deadline is not set yet while it can't be worked out", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "Regra.", skate: null }));
    await renderSheet({ deadline: null });

    expect(screen.getByText("Deadline not set yet")).toBeOnTheScreen();
  });

  it("opens the cancellation rules with Read", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "O aluno pode cancelar até 12 horas antes.", skate: null }));
    const { user } = await renderSheet();

    expect(screen.getByText("rules-closed")).toBeOnTheScreen();

    await user.press(screen.getByRole("link", { name: "Read" }));
    await user.press(screen.getByLabelText("dismiss-request"));

    expect(screen.getByText("rules-open")).toBeOnTheScreen();

    await user.press(screen.getByLabelText("close-rules"));

    expect(screen.getByText("rules-closed")).toBeOnTheScreen();
  });

  it("steps aside for the rules without closing, and comes back when they close", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "O aluno pode cancelar até 12 horas antes.", skate: null }));
    const { sheet, user } = await renderSheet();
    await user.press(screen.getByRole("checkbox"));

    await user.press(screen.getByRole("link", { name: "Read" }));

    // The rules wait for the request sheet to be gone.
    expect(screen.getByText("request-hidden")).toBeOnTheScreen();
    expect(screen.getByText("rules-closed")).toBeOnTheScreen();

    // The request sheet's own dismissal, reaching onClose on its way out, is not the student closing it.
    await user.press(screen.getByLabelText("dismiss-request"));
    expect(sheet.onClose).not.toHaveBeenCalled();
    expect(screen.getByText("rules-open")).toBeOnTheScreen();

    await user.press(screen.getByLabelText("dismiss-request"));
    expect(sheet.onClose).not.toHaveBeenCalled();

    await user.press(screen.getByLabelText("close-rules"));

    expect(screen.getByText("request-shown")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox")).toBeChecked();

    await user.press(screen.getByLabelText("dismiss-request"));
    expect(sheet.onClose).toHaveBeenCalledTimes(1);
  });

  it("reads the full class as the waiting list, in the title, the line and the button", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "Regra.", skate: null }));
    await renderSheet({ waitingList: true });

    expect(screen.getAllByText("Join the waiting list")).toHaveLength(2);
    expect(screen.queryByText("Request a seat")).toBeNull();
    expect(
      screen.getByText(
        "Surf Beginner · Tomorrow · 08:00. The class is full: your request goes on the waiting list. If a seat opens, it goes to the school for approval.",
      ),
    ).toBeOnTheScreen();
  });

  it("has no checkbox and an enabled button when the discipline has no rule", async () => {
    fetchMock.mockResolvedValue(ok({ surf: null, skate: null }));
    const { sheet, user } = await renderSheet();

    expect(await screen.findByText("The school hasn't written this rule yet.")).toBeOnTheScreen();
    expect(screen.getByText("Cancellation · Surf")).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("link", { name: "Read" })).toBeNull();
    expect(screen.getByRole("button", SUBMIT)).toBeEnabled();

    await user.press(screen.getByRole("button", SUBMIT));
    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps requiring the rule while the rules can't be read", async () => {
    fetchMock.mockResolvedValue(failure());
    await renderSheet();

    expect(screen.getByRole("checkbox", { name: RULE })).toBeOnTheScreen();
    expect(screen.getByRole("button", SUBMIT)).toBeDisabled();
  });

  it("does not read the rules while closed", async () => {
    await renderSheet({ visible: false });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens unticked after it was closed", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "Regra.", skate: null }));
    const sheet = props();
    const Wrapper = createWrapper(createQueryClient());
    const user = userEvent.setup();
    const view = await render(
      <Wrapper>
        <RequestSeatSheet {...sheet} />
      </Wrapper>,
    );

    await user.press(screen.getByRole("checkbox", { name: RULE }));
    await view.rerender(
      <Wrapper>
        <RequestSeatSheet {...sheet} visible={false} />
      </Wrapper>,
    );
    await view.rerender(
      <Wrapper>
        <RequestSeatSheet {...sheet} />
      </Wrapper>,
    );

    expect(screen.getByRole("checkbox", { name: RULE }).props.accessibilityState.checked).toBe(false);
  });

  it("ignores presses on Send request while sending", async () => {
    fetchMock.mockResolvedValue(ok({ surf: null, skate: null }));
    const { sheet, user } = await renderSheet({ loading: true });

    await user.press(screen.getAllByRole("button")[0]!);

    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });
});

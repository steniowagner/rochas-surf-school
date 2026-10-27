import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";

import {
  TOAST_EXIT_DURATION,
  TOAST_VISIBLE_DURATION,
} from "@/components/ui/toast/toast.hook";

import { AlertMessageProvider } from "./alert-message.provider";
import { useAlertMessage } from "./use-alert-message";

// Exposes the tone, which NativeWind compiles away from the rendered tree.
jest.mock("@/components/ui/toast", () => {
  const { Text } = require("react-native");
  const { Toast } = jest.requireActual("@/components/ui/toast");

  return {
    Toast: (props: { tone: string }) => (
      <>
        <Text>{`tone:${props.tone}`}</Text>
        <Toast {...props} />
      </>
    ),
  };
});

jest.useFakeTimers();

function Trigger({
  message,
  tone,
}: {
  message: string;
  tone?: "success" | "error";
}) {
  const { show } = useAlertMessage();

  return (
    <TouchableOpacity
      onPress={() => show(message, tone ? { tone } : undefined)}
    >
      <Text>{`show ${message}`}</Text>
    </TouchableOpacity>
  );
}

const renderProvider = () =>
  render(
    <AlertMessageProvider>
      <Trigger message="first" />
      <Trigger message="second" />
      <Trigger message="good" tone="success" />
    </AlertMessageProvider>,
  );

describe("AlertMessageProvider", () => {
  it("shows nothing until show is called", async () => {
    await renderProvider();

    expect(
      screen.queryByRole("alert", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("shows the message and hides it after a while", async () => {
    const user = userEvent.setup();
    await renderProvider();

    await user.press(screen.getByText("show first"));
    expect(
      screen.getByText("first", { includeHiddenElements: true }),
    ).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(TOAST_VISIBLE_DURATION + TOAST_EXIT_DURATION);
    });
    expect(
      screen.queryByRole("alert", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("replaces the message and restarts the timer when shown again", async () => {
    const user = userEvent.setup();
    await renderProvider();

    await user.press(screen.getByText("show first"));
    await act(async () => {
      jest.advanceTimersByTime(TOAST_VISIBLE_DURATION - 100);
    });
    await user.press(screen.getByText("show second"));
    await act(async () => {
      jest.advanceTimersByTime(TOAST_EXIT_DURATION + 200);
    });

    expect(
      screen.getByText("second", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText("first", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("shows the error tone by default, the success tone on request, and swaps between them", async () => {
    const user = userEvent.setup();
    await renderProvider();
    const tone = () =>
      screen.queryByText("tone:success") ? "success" : "error";

    await user.press(screen.getByText("show first"));
    expect(tone()).toBe("error");

    await user.press(screen.getByText("show good"));
    expect(tone()).toBe("success");

    await user.press(screen.getByText("show second"));
    expect(tone()).toBe("error");
  });

  it("does nothing when used without the provider", async () => {
    const user = userEvent.setup();
    await render(<Trigger message="first" />);

    await user.press(screen.getByText("show first"));

    expect(
      screen.queryByRole("alert", { includeHiddenElements: true }),
    ).toBeNull();
  });
});

import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";

import {
  TOAST_EXIT_DURATION,
  TOAST_VISIBLE_DURATION,
} from "@/components/ui/toast/toast.hook";

import { AlertMessageProvider } from "./alert-message.provider";
import { useAlertMessage } from "./use-alert-message";

jest.useFakeTimers();

function Trigger({ message }: { message: string }) {
  const { show } = useAlertMessage();

  return (
    <TouchableOpacity onPress={() => show(message)}>
      <Text>{`show ${message}`}</Text>
    </TouchableOpacity>
  );
}

const renderProvider = () =>
  render(
    <AlertMessageProvider>
      <Trigger message="first" />
      <Trigger message="second" />
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

  it("does nothing when used without the provider", async () => {
    const user = userEvent.setup();
    await render(<Trigger message="first" />);

    await user.press(screen.getByText("show first"));

    expect(
      screen.queryByRole("alert", { includeHiddenElements: true }),
    ).toBeNull();
  });
});

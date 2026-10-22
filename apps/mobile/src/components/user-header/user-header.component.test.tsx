import { act, screen } from "@testing-library/react-native";

import { NOW_TICK_MS } from "@/modules/classes/hooks/use-now.hook";
import {
  account,
  renderWithProviders,
  seedSession,
} from "@/modules/profile/profile.test-utils";

import { UserHeader } from "./user-header.component";

const at = (hours: number, minutes = 0) =>
  new Date(2026, 9, 22, hours, minutes);

beforeEach(() => {
  seedSession(account({ name: "Ana Maria Souza" }));
});

afterEach(() => jest.useRealTimers());

describe("UserHeader", () => {
  it("shows the initials, the first name and the bell with the unread count", async () => {
    jest.useFakeTimers({ now: at(9) });
    await renderWithProviders(<UserHeader />);

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("Ana")).toBeOnTheScreen();
    expect(screen.queryByText("Ana Maria Souza")).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeOnTheScreen();
  });

  it.each([
    [at(9), "Good morning,"],
    [at(14), "Good afternoon,"],
    [at(21), "Good evening,"],
  ])("greets by the time of day at %p", async (now, greeting) => {
    jest.useFakeTimers({ now });
    await renderWithProviders(<UserHeader />);

    expect(screen.getByText(greeting)).toBeOnTheScreen();
  });

  it("changes the greeting when the time of day changes", async () => {
    jest.useFakeTimers({ now: at(11, 59) });
    await renderWithProviders(<UserHeader />);

    expect(screen.getByText("Good morning,")).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(NOW_TICK_MS);
    });

    expect(screen.getByText("Good afternoon,")).toBeOnTheScreen();
  });
});

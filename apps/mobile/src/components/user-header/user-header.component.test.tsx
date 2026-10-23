import { act, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import { NOW_TICK_MS } from "@/modules/classes/hooks/use-now.hook";
import {
  account,
  renderWithProviders,
  seedSession,
} from "@/modules/profile/profile.test-utils";
import { clearSession } from "@/services/session/session.store";

import { UserHeader } from "./user-header.component";

// The callback the header gave `useFocusEffect`, run by a test when the home screen is focused again.
let mockFocusEffect: () => void = () => undefined;

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) => {
    mockFocusEffect = effect;
  },
}));

const fetchMock = jest.fn();

/** Answers the unread count with each value in turn (the last one repeats); `null` fails. */
const answerCounts = (...counts: (number | null)[]) => {
  let call = 0;
  fetchMock.mockImplementation(async () => {
    const count = counts[Math.min(call, counts.length - 1)];
    call += 1;

    return count === null
      ? { ok: false, status: 500, json: async () => ({ errors: [] }) }
      : { ok: true, status: 200, json: async () => ({ count }) };
  });
};

const at = (hours: number, minutes = 0) =>
  new Date(2026, 9, 22, hours, minutes);

const bell = (name: string | RegExp) => screen.findByRole("button", { name });

beforeEach(() => {
  seedSession(account({ name: "Ana Maria Souza" }));
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  answerCounts(0);
  jest.mocked(router.push).mockReset();
});

afterEach(() => jest.useRealTimers());

describe("UserHeader", () => {
  it("shows the initials, the first name and the bell with the real unread count", async () => {
    answerCounts(3);
    await renderWithProviders(<UserHeader />);

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("Ana")).toBeOnTheScreen();
    expect(screen.queryByText("Ana Maria Souza")).not.toBeOnTheScreen();
    expect(await bell("Notifications, 3 unread")).toBeOnTheScreen();
    expect(screen.getByText("3")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/notifications/unread-count", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("shows no badge with nothing unread", async () => {
    await renderWithProviders(<UserHeader />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await bell("Notifications")).toBeOnTheScreen();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows 9+ above nine", async () => {
    answerCounts(12);
    await renderWithProviders(<UserHeader />);

    expect(await bell("Notifications, 12 unread")).toBeOnTheScreen();
    expect(screen.getByText("9+")).toBeOnTheScreen();
  });

  it("shows no badge when the count fails", async () => {
    answerCounts(null);
    await renderWithProviders(<UserHeader />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await bell("Notifications")).toBeOnTheScreen();
  });

  it("reloads the count when the home screen is focused again", async () => {
    answerCounts(3, 1);
    await renderWithProviders(<UserHeader />);
    expect(await bell("Notifications, 3 unread")).toBeOnTheScreen();

    await act(async () => mockFocusEffect());

    expect(await bell("Notifications, 1 unread")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["student", routes.student.notifications],
    ["instructor", routes.instructor.notifications],
    ["admin", routes.admin.notifications],
  ])("opens the %s's notifications from the bell", async (role, route) => {
    seedSession(account({ name: "Ana Maria Souza", role }));
    const user = userEvent.setup();
    await renderWithProviders(<UserHeader />);

    await user.press(await bell(/Notifications/));

    expect(router.push).toHaveBeenCalledWith(route);
  });

  it("opens nothing once the session is gone (signing out)", async () => {
    clearSession();
    const user = userEvent.setup();
    await renderWithProviders(<UserHeader />);

    await user.press(await bell(/Notifications/));

    expect(router.push).not.toHaveBeenCalled();
  });

  it("opens nothing for a role without notifications", async () => {
    seedSession(account({ name: "Ana Maria Souza", role: "guest" }));
    const user = userEvent.setup();
    await renderWithProviders(<UserHeader />);

    await user.press(await bell(/Notifications/));

    expect(router.push).not.toHaveBeenCalled();
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

import { Platform } from "react-native";
import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import * as api from "@/services/api";

import {
  buildPage,
  buildPerson,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../people.test-utils";

import { PeopleScreen } from "./people.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, children }: any) => (visible ? <View>{children}</View> : null),
  };
});

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

/** Answers the unfiltered count and any list request, per the handlers given. */
const serve = (list: (path: string) => unknown, total = 3) => {
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("http://api.test", "");

    return path === "/people?perPage=1" ? ok(buildPage(1, 1, total)) : list(path);
  });
};

const renderScreen = (showBackButton = false) =>
  render(<PeopleScreen showBackButton={showBackButton} />, {
    wrapper: createWrapper(createQueryClient()),
  });

const listPaths = () => requestedPaths().filter((path) => path !== "/people?perPage=1");

const actualApiGet = jest.requireActual("@/services/api").apiGet;

/** Fails the requests of the list (not the count) with the error. */
const failListWith = (error: Error) =>
  (api.apiGet as jest.Mock).mockImplementation((path: string, options: unknown) =>
    path === "/people?perPage=1" ? actualApiGet(path, options) : Promise.reject(error),
  );

afterEach(() => {
  jest.useRealTimers();
  (api.apiGet as jest.Mock).mockImplementation(actualApiGet);
});

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

describe("PeopleScreen", () => {
  it("shows the unfiltered count and one row per person", async () => {
    serve(
      () =>
        ok({
          items: [
            buildPerson(1, { name: "Ana Silva" }),
            buildPerson(2, { name: "João Pinto", role: "instructor" }),
            buildPerson(3, { name: "Zé Admin", role: "admin" }),
          ],
          page: 1,
          perPage: 20,
          total: 3,
        }),
      3,
    );

    await renderScreen();

    expect(await screen.findByText("Ana Silva")).toBeOnTheScreen();
    expect(screen.getByText("3 on the platform")).toBeOnTheScreen();
    expect(screen.getByText("People")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Search people")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Open filters" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Remove filter/ })).not.toBeOnTheScreen();
    expect(screen.getAllByText("since Jul 2026")).toHaveLength(3);
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Admin")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeOnTheScreen();
  });

  it("shows the back button when asked", async () => {
    serve(() => ok(buildPage(1, 1, 1)), 1);

    await renderScreen(true);

    expect(await screen.findByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it("shows no count while it loads or after it fails, and the list still works", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/people?perPage=1") ? failure() : ok(buildPage(1, 2, 2)),
    );

    await renderScreen();

    expect(await screen.findByText("Person 0")).toBeOnTheScreen();
    expect(screen.queryByText(/on the platform/)).not.toBeOnTheScreen();
  });

  it("loads the next page at the end, shows the footer spinner and stops at the last page", async () => {
    let releasePage2: (value: unknown) => void = () => {};
    serve((path) =>
      path.includes("page=2")
        ? new Promise((resolve) => {
            releasePage2 = resolve;
          })
        : ok(buildPage(1, 20, 25)),
    25);
    await renderScreen();
    await screen.findByText("Person 0");

    fireEvent(screen.getByTestId("people-list"), "endReached");

    expect(await screen.findByTestId("people-loading-more")).toBeOnTheScreen();
    expect(listPaths()).toEqual(["/people?page=1&perPage=20", "/people?page=2&perPage=20"]);
    await act(async () => releasePage2(ok(buildPage(2, 5, 25))));
    await waitFor(() => expect(screen.queryByTestId("people-loading-more")).not.toBeOnTheScreen());

    fireEvent(screen.getByTestId("people-list"), "endReached");

    expect(listPaths()).toHaveLength(2);
  });

  it("toasts a failed next page, keeps the rows and retries at the next end", async () => {
    let attempts = 0;
    serve((path) => {
      if (!path.includes("page=2")) return ok(buildPage(1, 20, 25));
      attempts += 1;
      return attempts === 1 ? failure() : ok(buildPage(2, 5, 25));
    }, 25);
    await renderScreen();
    await screen.findByText("Person 0");

    fireEvent(screen.getByTestId("people-list"), "endReached");
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));

    expect(screen.getByText("Person 0")).toBeOnTheScreen();
    fireEvent(screen.getByTestId("people-list"), "endReached");
    await waitFor(() => expect(attempts).toBe(2));
  });

  describe("search, filter and sort", () => {
    beforeEach(() => {
      serve((path) => ok({ ...buildPage(1, 1, 1), items: [buildPerson(1, { name: path })] }), 1);
    });

    it("searches after the debounce and filters by role from the filter sheet, keeping the search", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderScreen();
      await act(async () => {});

      await user.type(screen.getByPlaceholderText("Search people"), "jo");
      expect(listPaths()).toEqual(["/people?page=1&perPage=20"]);
      await act(async () => jest.advanceTimersByTime(300));
      await waitFor(() => expect(listPaths()).toContain("/people?page=1&perPage=20&search=jo"));

      await user.press(screen.getByRole("button", { name: "Open filters" }));
      await user.press(screen.getByRole("tab", { name: "Instructors" }));
      await waitFor(() =>
        expect(listPaths()).toContain("/people?page=1&perPage=20&role=instructor&search=jo"),
      );
      expect(screen.getByRole("button", { name: "Remove filter Instructors" })).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Remove filter Instructors" }));
      await waitFor(() => expect(listPaths().at(-1)).toBe("/people?page=1&perPage=20&search=jo"));
      expect(screen.queryByRole("button", { name: /Remove filter/ })).not.toBeOnTheScreen();
      jest.useRealTimers();
    });

    it("sends one request for fast typing and none for blank text", async () => {
      jest.useFakeTimers();
      await renderScreen();
      await act(async () => {});
      const input = screen.getByPlaceholderText("Search people");

      const type = (text: string) =>
        act(async () => {
          fireEvent.changeText(input, text);
        });
      const wait = (ms: number) => act(async () => jest.advanceTimersByTime(ms));

      await type("j");
      await wait(100);
      await type("jo");
      await wait(100);
      await type("joa");
      await wait(300);
      await waitFor(() => expect(listPaths()).toContain("/people?page=1&perPage=20&search=joa"));
      expect(listPaths().filter((path) => path.includes("search"))).toHaveLength(1);

      await type("   ");
      await wait(300);
      await waitFor(() => expect(listPaths().at(-1)).toBe("/people?page=1&perPage=20"));
      jest.useRealTimers();
    });

    it("sorts by name from the filter sheet, keeps it across role changes and removes it with its chip", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("/people?page=1&perPage=20");

      await user.press(screen.getByRole("button", { name: "Open filters" }));
      expect(screen.getByRole("tab", { name: "Ingress date", selected: true })).toBeOnTheScreen();
      await user.press(screen.getByRole("tab", { name: "Name" }));
      await screen.findByText("/people?page=1&perPage=20&sort=name");
      expect(screen.getByRole("button", { name: "Remove filter Name" })).toBeOnTheScreen();

      await user.press(screen.getByRole("tab", { name: "Admins" }));
      await screen.findByText("/people?page=1&perPage=20&role=admin&sort=name");

      await user.press(screen.getByRole("button", { name: "Remove filter Name" }));
      await screen.findByText("/people?page=1&perPage=20&role=admin");
      expect(screen.getByRole("tab", { name: "Ingress date", selected: true })).toBeOnTheScreen();
    });

    it("closes the filter sheet", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("/people?page=1&perPage=20");

      await user.press(screen.getByRole("button", { name: "Open filters" }));
      expect(screen.getByText("Filters")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Close" }));

      expect(screen.queryByText("Filters")).not.toBeOnTheScreen();
    });
  });

  it("shows the empty state", async () => {
    serve(() => ok({ items: [], page: 1, perPage: 20, total: 0 }), 0);

    await renderScreen();

    expect(await screen.findByText("No one found")).toBeOnTheScreen();
  });

  it("shows a spinner, then the error with retry", async () => {
    let answer: (value: unknown) => void = () => {};
    let attempts = 0;
    serve(() => {
      attempts += 1;
      return attempts === 1
        ? new Promise((resolve) => {
            answer = resolve;
          })
        : ok(buildPage(1, 1, 1));
    }, 1);
    const user = userEvent.setup();
    await renderScreen();

    expect(screen.getByTestId("people-loading")).toBeOnTheScreen();
    await act(async () => answer(failure()));
    expect(await screen.findByText("Couldn't load people.")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Person 0")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load people.")).not.toBeOnTheScreen();
  });

  it("shows neither the error nor the empty state when the session expired", async () => {
    failListWith(new api.SessionExpiredError());
    await renderScreen();

    await waitFor(() => expect(screen.queryByTestId("people-loading")).not.toBeOnTheScreen());

    expect(screen.queryByText("Couldn't load people.")).not.toBeOnTheScreen();
    expect(screen.queryByText("No one found")).not.toBeOnTheScreen();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows no toast when a next page fails with an expired session", async () => {
    serve(() => ok(buildPage(1, 20, 25)), 25);
    await renderScreen();
    await screen.findByText("Person 0");
    failListWith(new api.SessionExpiredError());

    fireEvent(screen.getByTestId("people-list"), "endReached");

    await waitFor(() => expect(screen.queryByTestId("people-loading-more")).not.toBeOnTheScreen());
    expect(mockShow).not.toHaveBeenCalled();
    expect(screen.getByText("Person 0")).toBeOnTheScreen();
  });

  it("adds the status bar room on Android for a tab root", async () => {
    const original = Platform.OS;
    Platform.OS = "android";
    serve(() => ok(buildPage(1, 1, 1)), 1);

    await renderScreen();

    expect(await screen.findByText("Person 0")).toBeOnTheScreen();
    Platform.OS = original;
  });

  it("reloads on pull to refresh, the count included", async () => {
    serve(() => ok(buildPage(1, 2, 2)), 2);
    await renderScreen();
    await screen.findByText("Person 0");
    const before = fetchMock.mock.calls.length;

    await act(async () => {
      screen.getByTestId("people-list").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(before + 1));
    expect(requestedPaths().filter((path) => path === "/people?perPage=1")).toHaveLength(2);
  });

  it("opens the person sheet and closes it", async () => {
    serve(
      () =>
        ok({
          items: [buildPerson(1, { name: "Ana Silva", whatsappNumber: "+5585999998888" })],
          page: 1,
          perPage: 20,
          total: 1,
        }),
      1,
    );
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByRole("button", { name: "Ana Silva" }));
    expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Chat on WhatsApp")).not.toBeOnTheScreen();
  });
});

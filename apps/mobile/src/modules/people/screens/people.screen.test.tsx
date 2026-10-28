import { Platform } from "react-native";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";

import { SessionProvider } from "@/providers/session";
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
  setupSignedInAdmin,
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
    BottomModal: ({ visible, children }: any) =>
      visible ? <View>{children}</View> : null,
  };
});

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return {
    ...actual,
    apiGet: jest.fn(actual.apiGet),
    apiPost: jest.fn(actual.apiPost),
  };
});

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the screen's header title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) =>
      options.unstable_headerLeftItems?.({})[0].element ??
      options.headerTitle(),
  },
}));

/** Answers the unfiltered count and any list request, per the handlers given. */
const serve = (list: (path: string) => unknown, total = 3) => {
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("http://api.test", "");

    return path === "/people?perPage=1"
      ? ok(buildPage(1, 1, total))
      : list(path);
  });
};

const renderScreen = () =>
  render(
    <SessionProvider>
      <PeopleScreen />
    </SessionProvider>,
    { wrapper: createWrapper(createQueryClient()) },
  );

const listPaths = () =>
  requestedPaths().filter((path) => path !== "/people?perPage=1");

const actualApiGet = jest.requireActual("@/services/api").apiGet;

/** Fails the requests of the list (not the count) with the error. */
const failListWith = (error: Error) =>
  (api.apiGet as jest.Mock).mockImplementation(
    (path: string, options: unknown) =>
      path === "/people?perPage=1"
        ? actualApiGet(path, options)
        : Promise.reject(error),
  );

const actualApiPost = jest.requireActual("@/services/api").apiPost;

afterEach(() => {
  jest.useRealTimers();
  (api.apiGet as jest.Mock).mockImplementation(actualApiGet);
  (api.apiPost as jest.Mock).mockImplementation(actualApiPost);
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
    expect(screen.getByRole("header", { name: "People" })).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Search people")).toBeOnTheScreen();
    for (const name of ["Students", "Instructors", "Admins"]) {
      expect(
        screen.getByRole("button", { name, selected: false }),
      ).toBeOnTheScreen();
    }
    expect(screen.getAllByText("since Jul 2026")).toHaveLength(3);
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Admin")).toBeOnTheScreen();
  });

  it("groups the people by first letter, keeping the order the backend answers, without a sort parameter", async () => {
    serve(
      () =>
        ok({
          items: [
            buildPerson(1, { name: "Álvaro" }),
            buildPerson(2, { name: "ana" }),
            buildPerson(3, { name: "Bruno" }),
          ],
          page: 1,
          perPage: 20,
          total: 3,
        }),
      3,
    );

    await renderScreen();

    await screen.findByText("Álvaro");
    expect(
      screen
        .getAllByRole("header")
        .map((header) => header.props.children)
        .filter((text) => text.length === 1),
    ).toEqual(["A", "B"]);
    const names = screen
      .getAllByRole("button")
      .map((button) => button.props.accessibilityLabel);
    expect(
      names.filter((name) => ["Álvaro", "ana", "Bruno"].includes(name)),
    ).toEqual(["Álvaro", "ana", "Bruno"]);
    expect(listPaths().every((path) => !path.includes("sort"))).toBe(true);
  });

  it("shows no count while it loads or after it fails, and the list still works", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/people?perPage=1")
        ? failure()
        : ok(buildPage(1, 2, 2)),
    );

    await renderScreen();

    expect(await screen.findByText("Person 0")).toBeOnTheScreen();
    expect(screen.queryByText(/^\d+ on the platform$/)).not.toBeOnTheScreen();
  });

  it("loads the next page at the end, shows the footer spinner and stops at the last page", async () => {
    let releasePage2: (value: unknown) => void = () => {};
    serve(
      (path) =>
        path.includes("page=2")
          ? new Promise((resolve) => {
              releasePage2 = resolve;
            })
          : ok(buildPage(1, 20, 25)),
      25,
    );
    await renderScreen();
    await screen.findByText("Person 0");

    fireEvent(screen.getByTestId("people-list"), "endReached");

    expect(await screen.findByTestId("people-loading-more")).toBeOnTheScreen();
    expect(listPaths()).toEqual([
      "/people?page=1&perPage=20",
      "/people?page=2&perPage=20",
    ]);
    await act(async () => releasePage2(ok(buildPage(2, 5, 25))));
    await waitFor(() =>
      expect(screen.queryByTestId("people-loading-more")).not.toBeOnTheScreen(),
    );

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
    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
      ),
    );

    expect(screen.getByText("Person 0")).toBeOnTheScreen();
    fireEvent(screen.getByTestId("people-list"), "endReached");
    await waitFor(() => expect(attempts).toBe(2));
  });

  describe("search, filter and sort", () => {
    beforeEach(() => {
      serve(
        (path) =>
          ok({
            ...buildPage(1, 1, 1),
            items: [buildPerson(1, { name: path })],
          }),
        1,
      );
    });

    it("searches after the debounce and toggles roles on and off, keeping the search", async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderScreen();
      await act(async () => {});

      await user.type(screen.getByPlaceholderText("Search people"), "jo");
      expect(listPaths()).toEqual(["/people?page=1&perPage=20"]);
      await act(async () => jest.advanceTimersByTime(300));
      await waitFor(() =>
        expect(listPaths()).toContain("/people?page=1&perPage=20&search=jo"),
      );

      await user.press(screen.getByRole("button", { name: "Instructors" }));
      await waitFor(() =>
        expect(listPaths()).toContain(
          "/people?page=1&perPage=20&role=instructor&search=jo",
        ),
      );
      expect(
        screen.getByRole("button", { name: "Instructors", selected: true }),
      ).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Students" }));
      await waitFor(() =>
        expect(listPaths().at(-1)).toBe(
          "/people?page=1&perPage=20&role=student,instructor&search=jo",
        ),
      );

      await user.press(screen.getByRole("button", { name: "Instructors" }));
      await waitFor(() =>
        expect(listPaths().at(-1)).toBe(
          "/people?page=1&perPage=20&role=student&search=jo",
        ),
      );
      await user.press(screen.getByRole("button", { name: "Students" }));
      await waitFor(() =>
        expect(listPaths().at(-1)).toBe("/people?page=1&perPage=20&search=jo"),
      );
      expect(
        screen.getByRole("button", { name: "Students", selected: false }),
      ).toBeOnTheScreen();
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
      const wait = (ms: number) =>
        act(async () => jest.advanceTimersByTime(ms));

      await type("j");
      await wait(100);
      await type("jo");
      await wait(100);
      await type("joa");
      await wait(300);
      await waitFor(() =>
        expect(listPaths()).toContain("/people?page=1&perPage=20&search=joa"),
      );
      expect(
        listPaths().filter((path) => path.includes("search")),
      ).toHaveLength(1);

      await type("   ");
      await wait(300);
      await waitFor(() =>
        expect(listPaths().at(-1)).toBe("/people?page=1&perPage=20"),
      );
      jest.useRealTimers();
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
    expect(
      await screen.findByText("Couldn't load the people"),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Person 0")).toBeOnTheScreen();
    expect(
      screen.queryByText("Couldn't load the people"),
    ).not.toBeOnTheScreen();
  });

  it("shows neither the error nor the empty state when the session expired", async () => {
    failListWith(new api.SessionExpiredError());
    await renderScreen();

    await waitFor(() =>
      expect(screen.queryByTestId("people-loading")).not.toBeOnTheScreen(),
    );

    expect(
      screen.queryByText("Couldn't load the people"),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("No one found")).not.toBeOnTheScreen();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows no toast when a next page fails with an expired session", async () => {
    serve(() => ok(buildPage(1, 20, 25)), 25);
    await renderScreen();
    await screen.findByText("Person 0");
    failListWith(new api.SessionExpiredError());

    fireEvent(screen.getByTestId("people-list"), "endReached");

    await waitFor(() =>
      expect(screen.queryByTestId("people-loading-more")).not.toBeOnTheScreen(),
    );
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

    await waitFor(() =>
      expect(fetchMock.mock.calls.length).toBeGreaterThan(before + 1),
    );
    expect(
      requestedPaths().filter((path) => path === "/people?perPage=1"),
    ).toHaveLength(2);
  });

  it("opens the person sheet and closes it", async () => {
    serve(
      () =>
        ok({
          items: [
            buildPerson(1, {
              name: "Ana Silva",
              whatsappNumber: "+5585999998888",
            }),
          ],
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

  describe("role actions", () => {
    const everyone = () =>
      ok({
        items: [
          buildPerson(1, { name: "Ana Silva" }),
          buildPerson(2, { name: "Bia Admin", role: "admin" }),
          buildPerson(3, { name: "João Pinto", role: "instructor" }),
          buildPerson(4, { id: "u-1", name: "Rita Me", role: "admin" }),
        ],
        page: 1,
        perPage: 20,
        total: 4,
      });

    const open = async (name: string) => {
      const user = userEvent.setup();
      await user.press(await screen.findByRole("button", { name }));
      return user;
    };

    it("shows an approved admin the actions of each role, and none on their own sheet", async () => {
      setupSignedInAdmin();
      serve(everyone, 4);
      await renderScreen();

      let user = await open("Ana Silva");
      expect(
        screen.getByRole("button", { name: "Make instructor" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Make admin" }),
      ).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Close" }));

      user = await open("João Pinto");
      expect(
        screen.getByRole("button", { name: "Make admin" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Make student" }),
      ).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Close" }));

      user = await open("Bia Admin");
      expect(
        screen.getByRole("button", { name: "Remove admin" }),
      ).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Close" }));

      await open("Rita Me");
      expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
      for (const action of [
        "Make instructor",
        "Make admin",
        "Make student",
        "Remove admin",
      ]) {
        expect(
          screen.queryByRole("button", { name: action }),
        ).not.toBeOnTheScreen();
      }
    });

    it("shows an approved admin the instructor row on an admin's sheet, their own included, and not on others", async () => {
      setupSignedInAdmin();
      serve(everyone, 4);
      await renderScreen();
      const row = () => screen.queryByRole("checkbox", { name: "Also an instructor" });

      let user = await open("Bia Admin");
      expect(row()).toBeOnTheScreen();
      expect(row()).not.toBeChecked();
      await user.press(screen.getByRole("button", { name: "Close" }));

      user = await open("Rita Me");
      expect(row()).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Remove admin" })).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Close" }));

      user = await open("Ana Silva");
      expect(row()).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Close" }));

      await open("João Pinto");
      expect(row()).not.toBeOnTheScreen();
    });

    it("shows a non-admin viewer no instructor row", async () => {
      serve(everyone, 4);
      await renderScreen();

      await open("Bia Admin");

      expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    });

    it("shows a student or instructor viewer no action", async () => {
      serve(everyone, 4);
      await renderScreen();

      await open("João Pinto");

      expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Make admin" }),
      ).not.toBeOnTheScreen();
    });

    it("confirms a promotion: the sheet closes and the row shows the new chip", async () => {
      setupSignedInAdmin();
      let promoted = false;
      fetchMock.mockImplementation(
        async (url: string, init?: { method?: string }) => {
          const path = String(url).replace("http://api.test", "");
          if (init?.method === "PUT") {
            promoted = true;
            return ok({ id: "p-1", role: "instructor" });
          }
          return path === "/people?perPage=1"
            ? ok(buildPage(1, 1, 1))
            : ok({
                items: [
                  buildPerson(1, {
                    name: "Ana Silva",
                    role: promoted ? "instructor" : "student",
                  }),
                ],
                page: 1,
                perPage: 20,
                total: 1,
              });
        },
      );
      await renderScreen();
      const user = await open("Ana Silva");

      await user.press(screen.getByRole("button", { name: "Make instructor" }));
      expect(screen.getByText("Make Ana an instructor?")).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Make instructor" }));

      await waitFor(() =>
        expect(screen.getByText("Instructor")).toBeOnTheScreen(),
      );
      expect(
        screen.queryByText("Make Ana an instructor?"),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText("Chat on WhatsApp")).not.toBeOnTheScreen();
      expect(requestedPaths()).toContain("/people/p-1/role");
    });
  });
});

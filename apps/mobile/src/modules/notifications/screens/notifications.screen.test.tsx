import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import { isOnboardingCompleted, resolveFlow } from "@/navigation/resolve-flow";
import { getSession } from "@/services/session/session.store";

import {
  buildNotification,
  buildPage,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  noContent,
  ok,
  requests,
  setupSignedInUser,
} from "../notifications.test-utils";
import type { NotificationItem } from "../notifications.types";

import { NotificationsScreen } from "./notifications.screen";

const mockShow = jest.fn();
let mockRole = "student";
let mockSignedIn = true;

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("@/providers/session", () => ({
  useSession: () => ({
    user: mockSignedIn && {
      id: "u-1",
      role: mockRole,
      status: "approved",
      whatsappNumber: "+5585999998888",
      rulesAccepted: true,
      rulesAcceptedBefore: true,
    },
  }),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  // Renders the header's title and right button so the tests can see and press them.
  Stack: {
    Screen: ({ options }: any) => (
      <>
        {options.headerTitle()}
        {options.headerRight?.()}
      </>
    ),
  },
}));

const LIST = /^\/notifications\?/;

type Handlers = {
  list?: (path: string) => unknown;
  count?: number | (() => unknown);
  read?: () => unknown;
  readAll?: () => unknown;
  me?: () => unknown;
};

/** Answers each endpoint with its handler: the list, the unread count, one mark, the mark-all and the account. */
const serve = ({ list, count = 0, read = noContent, readAll = noContent, me = failure }: Handlers) => {
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("http://api.test", "");

    if (path === "/auth/me") {
      return me();
    }

    if (path === "/notifications/unread-count") {
      return typeof count === "function" ? count() : ok({ count });
    }

    if (path === "/notifications/read-all") {
      return readAll();
    }

    if (path.endsWith("/read")) {
      return read();
    }

    return list ? list(path) : ok(buildPage(1, 0, 0));
  });
};

const page = (items: NotificationItem[], total = items.length, pageNumber = 1) =>
  ok({ items, page: pageNumber, perPage: 20, total });

const renderScreen = () =>
  render(<NotificationsScreen />, { wrapper: createWrapper(createQueryClient()) });

const listPaths = () => requests().filter((request) => LIST.test(request.path)).map((r) => r.path);
const posts = () => requests().filter((request) => request.method === "POST").map((r) => r.path);
const markAllButton = () => screen.queryByRole("button", { name: "Mark all as read" });
const dots = () => screen.queryAllByTestId("notification-row-unread-dot");

beforeEach(() => {
  setupSignedInUser();
  mockRole = "student";
  mockSignedIn = true;
  mockShow.mockReset();
  jest.mocked(router.push).mockReset();
  jest.mocked(router.replace).mockReset();
});

describe("NotificationsScreen", () => {
  it("shows the title, then each notification's text, time and unread dot", async () => {
    serve({
      count: 1,
      list: () =>
        page([
          buildNotification(1, { title: "Request approved", body: "Your seat is confirmed." }),
          buildNotification(2, { type: "class.deleted", title: "Class deleted", classId: null, read: true }),
        ]),
    });

    await renderScreen();

    expect(screen.getByRole("header", { name: "NOTIFICATIONS" })).toBeOnTheScreen();
    expect(await screen.findByText("Request approved")).toBeOnTheScreen();
    expect(screen.getByText("Your seat is confirmed.")).toBeOnTheScreen();
    expect(screen.getByText("Class deleted")).toBeOnTheScreen();
    expect(dots()).toHaveLength(1);
    expect(listPaths()).toEqual(["/notifications?page=1&perPage=20&locale=en"]);
  });

  it("shows skeleton rows while the first page loads, without the mark-all button", async () => {
    serve({ count: 3, list: () => new Promise(() => {}) });

    await renderScreen();

    expect(screen.getByLabelText("Loading notifications")).toBeOnTheScreen();
    await waitFor(() => expect(requests().some((r) => r.path.endsWith("unread-count"))).toBe(true));
    expect(markAllButton()).toBeNull();
  });

  it("shows the empty state, without the mark-all button", async () => {
    serve({ count: 0 });

    await renderScreen();

    expect(await screen.findByText("No notifications yet")).toBeOnTheScreen();
    expect(
      screen.getByText("When something changes in your classes or your account, you'll see it here."),
    ).toBeOnTheScreen();
    expect(markAllButton()).toBeNull();
  });

  it("shows the error state without the mark-all button, and its retry loads the list again", async () => {
    const user = userEvent.setup();
    let fail = true;
    serve({
      count: 3,
      list: () => (fail ? failure() : page([buildNotification(1, { title: "Back again" })])),
    });

    await renderScreen();

    expect(await screen.findByText("Couldn't load your notifications")).toBeOnTheScreen();
    expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
    expect(markAllButton()).toBeNull();

    fail = false;
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Back again")).toBeOnTheScreen();
    expect(listPaths()).toHaveLength(2);
  });

  it("shows no error state when the session expired", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ errors: ["auth.token.invalid"] }),
    }));

    await renderScreen();

    await waitFor(() => expect(screen.queryByLabelText("Loading notifications")).toBeNull());
    expect(screen.queryByText("Couldn't load your notifications")).toBeNull();
    expect(screen.queryByText("No notifications yet")).toBeNull();
  });

  it("loads the next 5 at the end of the list, then stops", async () => {
    serve({
      list: (path) =>
        path.includes("page=2") ? page(buildPage(2, 5, 25).items, 25, 2) : page(buildPage(1, 20, 25).items, 25),
    });
    await renderScreen();
    await screen.findByText("Title 0");

    fireEvent(screen.getByTestId("notifications-list"), "endReached");

    await waitFor(() =>
      expect(screen.getByTestId("notifications-list").props.data).toHaveLength(25),
    );
    fireEvent(screen.getByTestId("notifications-list"), "endReached");
    expect(listPaths()).toEqual([
      "/notifications?page=1&perPage=20&locale=en",
      "/notifications?page=2&perPage=20&locale=en",
    ]);
  });

  it("shows the spinner while the next page loads", async () => {
    let release: (value: unknown) => void = () => {};
    serve({
      list: (path) =>
        path.includes("page=2")
          ? new Promise((resolve) => (release = resolve))
          : page(buildPage(1, 20, 25).items, 25),
    });
    await renderScreen();
    await screen.findByText("Title 0");

    fireEvent(screen.getByTestId("notifications-list"), "endReached");

    expect(await screen.findByTestId("notifications-loading-more")).toBeOnTheScreen();
    await act(async () => release(page(buildPage(2, 5, 25).items, 25, 2)));
    await waitFor(() => expect(screen.queryByTestId("notifications-loading-more")).toBeNull());
  });

  it("reloads from page 1 when pulled to refresh", async () => {
    serve({
      count: 1,
      list: (path) =>
        path.includes("page=2") ? page(buildPage(2, 5, 25).items, 25, 2) : page(buildPage(1, 20, 25).items, 25),
    });
    await renderScreen();
    await screen.findByText("Title 0");
    fireEvent(screen.getByTestId("notifications-list"), "endReached");
    await waitFor(() => expect(listPaths()).toHaveLength(2));
    await waitFor(() =>
      expect(screen.getByTestId("notifications-list").props.data).toHaveLength(25),
    );

    await act(async () => {
      await screen.getByTestId("notifications-list").props.refreshControl.props.onRefresh();
    });

    expect(listPaths()).toEqual([
      "/notifications?page=1&perPage=20&locale=en",
      "/notifications?page=2&perPage=20&locale=en",
      "/notifications?page=1&perPage=20&locale=en",
    ]);
    expect(screen.getByTestId("notifications-list").props.data).toHaveLength(20);
  });

  describe("tapping a row", () => {
    it("marks an unread row read at once and opens the student's class", async () => {
      const user = userEvent.setup();
      let answerRead: (value: unknown) => void = () => {};
      serve({
        count: 1,
        list: () => page([buildNotification(1, { classId: "c-1", title: "Request approved" })]),
        read: () => new Promise((resolve) => (answerRead = resolve)),
      });
      await renderScreen();
      await screen.findByText("Request approved");

      await user.press(screen.getByRole("button", { name: /Request approved/ }));

      expect(dots()).toHaveLength(0);
      expect(posts()).toEqual(["/notifications/n-1/read"]);
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"));
      await act(async () => answerRead(noContent()));
    });

    it("opens Join the school for an admin's registration.pending", async () => {
      mockRole = "admin";
      const user = userEvent.setup();
      serve({
        count: 1,
        list: () =>
          page([buildNotification(1, { type: "registration.pending", classId: null, title: "New registration" })]),
      });
      await renderScreen();
      await screen.findByText("New registration");

      await user.press(screen.getByRole("button", { name: /New registration/ }));

      expect(router.push).toHaveBeenCalledWith(routes.admin.registrations);
    });

    it.each([
      ["registration.approved", "c-1"],
      ["broadcast.sent", "c-1"],
      ["class.edited", null],
    ])("only marks a %s row with no destination read (class %s)", async (type, classId) => {
      const user = userEvent.setup();
      serve({ count: 1, list: () => page([buildNotification(1, { type, classId, title: "Row" })]) });
      await renderScreen();
      await screen.findByText("Row");

      await user.press(screen.getByRole("button", { name: /Row/ }));

      await waitFor(() => expect(posts()).toEqual(["/notifications/n-1/read"]));
      expect(router.push).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
      expect(screen.getByText("Row")).toBeOnTheScreen();
    });

    describe("a role.changed row", () => {
      const instructor = {
        id: "u-1",
        role: "instructor",
        status: "approved",
        whatsappNumber: "+5585999998888",
        rulesAccepted: true,
        rulesAcceptedBefore: true,
      };
      const roleChanged = () =>
        page([buildNotification(1, { type: "role.changed", classId: null, title: "Your role changed" })]);
      const accountReloads = () => requests().filter((request) => request.path === "/auth/me");
      const storedFlow = () => {
        const user = getSession()!.user;

        return resolveFlow({ user, onboardingCompleted: isOnboardingCompleted(user) });
      };
      const pressRow = async () => {
        const user = userEvent.setup();
        await renderScreen();
        await screen.findByText("Your role changed");

        await user.press(screen.getByRole("button", { name: /Your role changed/ }));
      };

      it("reloads the account, then opens the home of the new role's flow", async () => {
        serve({ count: 1, list: roleChanged, me: () => ok(instructor) });

        await pressRow();

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith(routes.home));
        expect(accountReloads()).toHaveLength(1);
        expect(getSession()?.user.role).toBe("instructor");
        expect(storedFlow()).toBe("instructor");
        // The account is stored before `index` resolves the flow.
        const reload = fetchMock.mock.calls.findIndex(([url]) => String(url).endsWith("/auth/me"));
        expect(fetchMock.mock.invocationCallOrder[reload]).toBeLessThan(
          jest.mocked(router.replace).mock.invocationCallOrder[0],
        );
        expect(router.push).not.toHaveBeenCalled();
      });

      it("still opens the home of the cached account's flow when the reload fails", async () => {
        serve({ count: 1, list: roleChanged, me: failure });

        await pressRow();

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith(routes.home));
        expect(accountReloads()).toHaveLength(1);
        expect(storedFlow()).toBe("student");
      });

      it("opens nothing when the session expired during the reload", async () => {
        serve({
          count: 1,
          list: roleChanged,
          me: () => ({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) }),
        });

        await pressRow();

        await waitFor(() => expect(accountReloads().length).toBeGreaterThan(0));
        await waitFor(() => expect(posts()).toContain("/notifications/n-1/read"));
        expect(router.replace).not.toHaveBeenCalled();
        expect(router.push).not.toHaveBeenCalled();
      });

      it("sends no reload and opens nothing for a session already gone (signing out)", async () => {
        mockSignedIn = false;
        serve({ count: 1, list: roleChanged, me: () => ok(instructor) });

        await pressRow();

        await waitFor(() => expect(posts()).toEqual(["/notifications/n-1/read"]));
        expect(accountReloads()).toHaveLength(0);
        expect(router.replace).not.toHaveBeenCalled();
      });
    });

    it("opens nothing for a session already gone (signing out)", async () => {
      mockSignedIn = false;
      const user = userEvent.setup();
      serve({ list: () => page([buildNotification(1, { classId: "c-1", title: "Seen", read: true })]) });
      await renderScreen();
      await screen.findByText("Seen");

      await user.press(screen.getByRole("button", { name: /Seen/ }));

      expect(router.push).not.toHaveBeenCalled();
    });

    it("sends no request for a read row and still opens it", async () => {
      const user = userEvent.setup();
      serve({ list: () => page([buildNotification(1, { classId: "c-1", title: "Seen", read: true })]) });
      await renderScreen();
      await screen.findByText("Seen");

      await user.press(screen.getByRole("button", { name: /Seen/ }));

      expect(posts()).toEqual([]);
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"));
    });

    it("shows nothing when the mark fails, and navigates anyway", async () => {
      const user = userEvent.setup();
      serve({
        count: 1,
        list: () => page([buildNotification(1, { classId: "c-1", title: "Request approved" })]),
        read: failure,
      });
      await renderScreen();
      await screen.findByText("Request approved");

      await user.press(screen.getByRole("button", { name: /Request approved/ }));

      await waitFor(() => expect(posts()).toEqual(["/notifications/n-1/read"]));
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"));
      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe("mark all as read", () => {
    const threeUnread = () => page([1, 2, 3].map((index) => buildNotification(index)));

    it("clears every dot, sends read-all and hides the button", async () => {
      const user = userEvent.setup();
      let count = 3;
      serve({
        count: () => ok({ count }),
        list: threeUnread,
        readAll: () => {
          count = 0;
          return noContent();
        },
      });
      await renderScreen();
      await waitFor(() => expect(markAllButton()).toBeOnTheScreen());
      expect(dots()).toHaveLength(3);

      await user.press(markAllButton()!);

      expect(dots()).toHaveLength(0);
      expect(markAllButton()).toBeNull();
      await waitFor(() => expect(posts()).toEqual(["/notifications/read-all"]));
      expect(mockShow).not.toHaveBeenCalled();
    });

    it("isn't shown with nothing unread", async () => {
      serve({ count: 0, list: () => page([buildNotification(1, { read: true, title: "Seen" })]) });

      await renderScreen();

      expect(await screen.findByText("Seen")).toBeOnTheScreen();
      expect(markAllButton()).toBeNull();
    });

    it("brings the dots and the button back with a toast when it fails", async () => {
      const user = userEvent.setup();
      serve({ count: 3, list: threeUnread, readAll: failure });
      await renderScreen();
      await waitFor(() => expect(markAllButton()).toBeOnTheScreen());

      await user.press(markAllButton()!);

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("Couldn't mark the notifications as read. Try again."),
      );
      expect(dots()).toHaveLength(3);
      expect(markAllButton()).toBeOnTheScreen();
    });

    it("shows no toast when the session expired", async () => {
      const user = userEvent.setup();
      serve({
        count: 3,
        list: threeUnread,
        readAll: () => ({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) }),
      });
      await renderScreen();
      await waitFor(() => expect(markAllButton()).toBeOnTheScreen());

      await user.press(markAllButton()!);

      await waitFor(() => expect(posts()).toContain("/notifications/read-all"));
      await waitFor(() => expect(dots()).toHaveLength(3));
      expect(mockShow).not.toHaveBeenCalled();
    });
  });
});

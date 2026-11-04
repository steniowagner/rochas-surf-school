import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { ReactNode } from "react";

import { routes } from "@/constants/routes";
import { Colors } from "@/constants/theme";
import { buildClassItem } from "@/modules/classes/classes.test-utils";
import { isOnboardingCompleted, resolveFlow } from "@/navigation/resolve-flow";
import { getSession } from "@/services/session/session.store";

import {
  buildNotification,
  buildPage,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  glyph,
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
let mockParams: { notificationId?: string } = {};

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
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
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

// A sheet that is really gone when it isn't visible, to see whether it is open.
jest.mock("@/components/ui/bottom-modal", () => ({
  BottomModal: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? children : null,
}));

const LIST = /^\/notifications\?/;
const ONE = /^\/notifications\/[^/?]+\?/;

type Handlers = {
  list?: (path: string) => unknown;
  count?: number | (() => unknown);
  read?: () => unknown;
  readAll?: () => unknown;
  me?: () => unknown;
  one?: () => unknown;
  classDetail?: () => unknown;
};

/** Answers each endpoint with its handler: the list, the unread count, one mark, the mark-all and the account. */
const serve = ({
  list,
  count = 0,
  read = noContent,
  readAll = noContent,
  me = failure,
  one = failure,
  classDetail = failure,
}: Handlers) => {
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

    if (ONE.test(path)) {
      return one();
    }

    if (path.startsWith("/classes/")) {
      return classDetail();
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
const gets = () => requests().filter((request) => ONE.test(request.path)).map((r) => r.path);

beforeEach(() => {
  setupSignedInUser();
  mockRole = "student";
  mockSignedIn = true;
  mockParams = {};
  mockShow.mockReset();
  jest.mocked(router.push).mockReset();
  jest.mocked(router.replace).mockReset();
  jest.mocked(router.setParams).mockReset();
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
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"), { dangerouslySingular: true });
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

      expect(router.push).toHaveBeenCalledWith(routes.admin.registrations, { dangerouslySingular: true });
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

    describe("a class.message row", () => {
      const classMessage = () =>
        page([
          buildNotification(1, {
            type: "class.message",
            classId: "c-1",
            title: "Ponto de encontro",
            body: "Surf, Thu 10/15 at 08:00: Barraca azul.",
          }),
        ]);

      it("shows the admin's title and the class line with the message, with the chat bubble on the info tone", async () => {
        serve({ count: 1, list: classMessage });
        await renderScreen();

        expect(await screen.findByText("Ponto de encontro")).toBeOnTheScreen();
        expect(screen.getByText("Surf, Thu 10/15 at 08:00: Barraca azul.")).toBeOnTheScreen();
        expect(screen.getByTestId("notification-row-icon")).toHaveProp(
          "className",
          expect.stringContaining("bg-info-tint"),
        );
        expect(screen.getByText(glyph("chatbubble-outline"))).toHaveStyle({ color: Colors.light.lagoon });
      });
    });

    describe("an admin's message", () => {
      const SENDER = {
        id: "s-1",
        name: "Ana Souza",
        photoUrl: null,
        role: "admin",
        whatsappNumber: null,
      } as const;
      const adminMessage = { title: "Ponto de encontro", text: "Barraca azul.", sender: SENDER };
      const CLASS = buildClassItem("c-1", "2026-10-21T12:00:00.000Z", "2026-10-21T13:00:00.000Z");
      const notice = (index = 1) =>
        buildNotification(index, {
          type: "broadcast",
          classId: null,
          title: "Ponto de encontro",
          body: "Barraca azul.",
          adminMessage,
        });
      const classMessage = () =>
        buildNotification(1, {
          type: "class.message",
          classId: "c-1",
          title: "Ponto de encontro",
          body: "Surf, Thu 10/15 at 08:00: Barraca azul.",
          adminMessage,
        });
      const sheet = () => screen.queryByText("Message from the school");
      const press = (name: string | RegExp) =>
        userEvent.setup().press(screen.getByRole("button", { name }));

      describe("from its row", () => {
        it("opens a notice's sheet at once, with no navigation and no extra request, marked read", async () => {
          serve({ count: 1, list: () => page([notice()]) });
          await renderScreen();
          await screen.findByText("Barraca azul.");

          await press(/Ponto de encontro/);

          expect(sheet()).toBeOnTheScreen();
          expect(dots()).toHaveLength(0);
          await waitFor(() => expect(posts()).toEqual(["/notifications/n-1/read"]));
          expect(gets()).toEqual([]);
          expect(router.push).not.toHaveBeenCalled();
          expect(router.replace).not.toHaveBeenCalled();
        });

        it("sends nothing for a read row and still opens it", async () => {
          serve({ list: () => page([{ ...notice(), read: true }]) });
          await renderScreen();
          await screen.findByText("Barraca azul.");

          await press(/Ponto de encontro/);

          expect(sheet()).toBeOnTheScreen();
          expect(posts()).toEqual([]);
        });

        it("closes with its button, leaving no route param to clear", async () => {
          serve({ list: () => page([notice()]) });
          await renderScreen();
          await screen.findByText("Barraca azul.");

          await press(/Ponto de encontro/);
          await press("OK, got it");

          expect(sheet()).toBeNull();
          expect(router.setParams).not.toHaveBeenCalled();
        });

        it.each([
          ["student", routes.student.classDetail("c-1")],
          ["instructor", routes.instructor.classDetail("c-1")],
          ["admin", routes.admin.classDetail("c-1")],
        ] as const)("closes the sheet and opens the class for a %s", async (role, target) => {
          mockRole = role;
          serve({ list: () => page([classMessage()]), classDetail: () => ok(CLASS) });
          await renderScreen();
          await screen.findByText("Ponto de encontro");

          await press(/Ponto de encontro/);
          await userEvent.setup().press(await screen.findByText("Praia do Futuro"));

          expect(sheet()).toBeNull();
          expect(router.push).toHaveBeenCalledWith(target, { dangerouslySingular: true });
        });

        it("opens no class for a session already gone (signing out)", async () => {
          mockSignedIn = false;
          serve({ list: () => page([classMessage()]), classDetail: () => ok(CLASS) });
          await renderScreen();
          await screen.findByText("Ponto de encontro");

          await press(/Ponto de encontro/);
          await userEvent.setup().press(await screen.findByText("Praia do Futuro"));

          expect(router.push).not.toHaveBeenCalled();
        });

        it("keeps the sheet readable when the class is gone", async () => {
          serve({ list: () => page([classMessage()]), classDetail: () => failure(404) });
          await renderScreen();
          await screen.findByText("Ponto de encontro");

          await press(/Ponto de encontro/);

          await waitFor(() => expect(screen.queryByTestId("message-sheet-class-loading")).toBeNull());
          expect(sheet()).toBeOnTheScreen();
          expect(screen.getByText("Barraca azul.")).toBeOnTheScreen();
        });
      });

      describe("from a tapped push", () => {
        it("opens the message of a loaded row, with no extra request", async () => {
          mockParams = { notificationId: "n-1" };
          serve({ list: () => page([notice()]) });
          await renderScreen();

          await waitFor(() => expect(sheet()).toBeOnTheScreen());
          expect(gets()).toEqual([]);
        });

        it("fetches one beyond the loaded pages, once the list answered", async () => {
          mockParams = { notificationId: "n-9" };
          serve({ list: () => page([notice()]), one: () => ok(notice(9)) });
          await renderScreen();

          await waitFor(() => expect(sheet()).toBeOnTheScreen());
          expect(gets()).toEqual(["/notifications/n-9?locale=en"]);
        });

        it("fetches it when the list failed", async () => {
          mockParams = { notificationId: "n-9" };
          serve({ list: () => failure(), one: () => ok(notice(9)) });
          await renderScreen();

          await waitFor(() => expect(sheet()).toBeOnTheScreen());
        });

        it("shows a toast and no sheet when the fetch fails", async () => {
          mockParams = { notificationId: "n-9" };
          serve({ list: () => page([notice()]) });
          await renderScreen();

          await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith("Couldn't open the message. Try again."),
          );
          expect(mockShow).toHaveBeenCalledTimes(1);
          expect(sheet()).toBeNull();
          expect(router.setParams).toHaveBeenCalledWith({ notificationId: undefined });
        });

        it("shows no toast when the session expired", async () => {
          mockParams = { notificationId: "n-9" };
          fetchMock.mockImplementation(async () => ({
            ok: false,
            status: 401,
            json: async () => ({ errors: ["auth.token.invalid"] }),
          }));
          await renderScreen();

          await waitFor(() => expect(router.setParams).toHaveBeenCalled());
          expect(mockShow).not.toHaveBeenCalled();
        });

        it("clears the route when it closes, and doesn't open again by itself", async () => {
          mockParams = { notificationId: "n-1" };
          serve({ list: () => page([notice()]) });
          const { rerender } = await renderScreen();
          await waitFor(() => expect(sheet()).toBeOnTheScreen());

          await press("OK, got it");

          expect(router.setParams).toHaveBeenCalledWith({ notificationId: undefined });
          expect(sheet()).toBeNull();

          await rerender(<NotificationsScreen />);

          expect(sheet()).toBeNull();
        });

        it("shows a new message on the open screen", async () => {
          mockParams = { notificationId: "n-1" };
          const other = {
            ...notice(2),
            adminMessage: { ...adminMessage, title: "Outra mensagem", text: "Outro texto." },
          };
          serve({ list: () => page([notice(), other]) });
          const { rerender } = await renderScreen();
          await waitFor(() => expect(sheet()).toBeOnTheScreen());

          mockParams = { notificationId: "n-2" };
          await rerender(<NotificationsScreen />);

          await waitFor(() => expect(screen.getByText("Outro texto.")).toBeOnTheScreen());
        });

        it("shows its row as read and lowers the count at once, with the screen already open", async () => {
          mockParams = { notificationId: "n-1" };
          serve({
            list: () => page([notice()]),
            count: () => ok({ count: posts().length > 0 ? 0 : 1 }),
          });
          await renderScreen();

          await waitFor(() => expect(sheet()).toBeOnTheScreen());
          await waitFor(() => expect(dots()).toHaveLength(0));
          await waitFor(() => expect(markAllButton()).toBeNull());
          expect(posts()).toEqual(["/notifications/n-1/read"]);
        });

        it("marks one beyond the loaded pages", async () => {
          mockParams = { notificationId: "n-9" };
          serve({ list: () => page([notice()]), one: () => ok(notice(9)) });
          await renderScreen();

          await waitFor(() => expect(posts()).toEqual(["/notifications/n-9/read"]));
          expect(dots()).toHaveLength(1);
        });

        describe("one the loaded pages don't hold", () => {
          const rowIds = () =>
            screen.getByTestId("notifications-list").props.data.map((row: NotificationItem) => row.id);

          it("brings a newer one into the list, read, and keeps it after closing the sheet", async () => {
            mockParams = { notificationId: "n-9" };
            const older = { ...notice(), read: true };
            const newer = { ...notice(9), read: true };
            serve({
              list: () => page(listPaths().length > 1 ? [newer, older] : [older]),
              one: () => ok(newer),
            });
            await renderScreen();

            await waitFor(() => expect(rowIds()).toEqual(["n-9", "n-1"]));
            expect(sheet()).toBeOnTheScreen();
            expect(dots()).toHaveLength(0);
            expect(posts()).toEqual([]);

            await press("OK, got it");

            expect(sheet()).toBeNull();
            expect(rowIds()).toEqual(["n-9", "n-1"]);
          });

          it("reloads the list after its mark, which would cancel a reload in flight", async () => {
            mockParams = { notificationId: "n-9" };
            let answerRead: (value: unknown) => void = () => {};
            let marked = false;
            const older = { ...notice(), read: true };
            serve({
              list: () => page(marked ? [{ ...notice(9), read: true }, older] : [older]),
              one: () => ok(notice(9)),
              read: () => new Promise((resolve) => (answerRead = resolve)),
            });
            await renderScreen();

            await waitFor(() => expect(posts()).toEqual(["/notifications/n-9/read"]));
            expect(listPaths()).toHaveLength(1);

            marked = true;
            await act(async () => answerRead(noContent()));

            await waitFor(() => expect(rowIds()).toEqual(["n-9", "n-1"]));
            expect(dots()).toHaveLength(0);
          });

          it("reloads the count too, which other pushes may have changed", async () => {
            mockParams = { notificationId: "n-9" };
            const older = { ...notice(), read: true };
            const newer = { ...notice(9), read: true };
            serve({
              list: () => page(listPaths().length > 1 ? [newer, notice(8), older] : [older]),
              count: () => ok({ count: listPaths().length > 1 ? 1 : 0 }),
              one: () => ok(newer),
            });
            await renderScreen();

            await waitFor(() => expect(markAllButton()).toBeOnTheScreen());
          });

          it("reloads once for one older than the loaded pages, which stays out of the list", async () => {
            mockParams = { notificationId: "n-9" };
            serve({
              list: () => page([{ ...notice(), read: true }]),
              one: () => ok({ ...notice(9), read: true }),
            });
            await renderScreen();

            await waitFor(() => expect(listPaths()).toHaveLength(2));
            await act(async () => {});

            expect(listPaths()).toHaveLength(2);
            expect(gets()).toHaveLength(1);
            expect(rowIds()).toEqual(["n-1"]);
            expect(sheet()).toBeOnTheScreen();
          });

          it("doesn't reload the list for one it holds", async () => {
            mockParams = { notificationId: "n-1" };
            serve({ list: () => page([{ ...notice(), read: true }]) });
            await renderScreen();

            await waitFor(() => expect(sheet()).toBeOnTheScreen());
            await act(async () => {});

            expect(listPaths()).toHaveLength(1);
          });
        });

        it("sends nothing for a message already read", async () => {
          mockParams = { notificationId: "n-1" };
          serve({ list: () => page([{ ...notice(), read: true }]) });
          await renderScreen();

          await waitFor(() => expect(sheet()).toBeOnTheScreen());
          expect(posts()).toEqual([]);
        });

        it("doesn't mark a notification that has no message", async () => {
          mockParams = { notificationId: "n-1" };
          serve({ list: () => page([buildNotification(1)]) });
          await renderScreen();

          await waitFor(() => expect(dots()).toHaveLength(1));
          expect(sheet()).toBeNull();
          expect(posts()).toEqual([]);
        });
      });
    });

    it("keeps opening the class of a class.cancelled row", async () => {
      serve({
        list: () => page([buildNotification(1, { type: "class.cancelled", classId: "c-1", title: "Row" })]),
      });
      await renderScreen();
      await screen.findByText("Row");

      await userEvent.setup().press(screen.getByRole("button", { name: /Row/ }));

      expect(screen.queryByText("Message from the school")).toBeNull();
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"), { dangerouslySingular: true });
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

      it.each(["account.removed", "account.restored"])(
        "a %s row reloads the account too, then opens the resolved flow's home",
        async (type) => {
          serve({
            count: 1,
            list: () => page([buildNotification(1, { type, classId: null, title: "Your role changed" })]),
            me: () => ok(instructor),
          });

          await pressRow();

          await waitFor(() => expect(router.replace).toHaveBeenCalledWith(routes.home));
          expect(accountReloads()).toHaveLength(1);
          expect(router.push).not.toHaveBeenCalled();
        },
      );

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
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"), { dangerouslySingular: true });
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
      expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-1"), { dangerouslySingular: true });
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

import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";

import { SessionProvider } from "@/providers/session";
import * as api from "@/services/api";

import {
  buildPage,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInAdmin,
  setupSignedInUser,
} from "../people.test-utils";

import { RemovedAccountsScreen } from "./removed-accounts.screen";

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

/** What `GET /people/removed` answers; nobody is removed unless a test says so. */
let removedItems: unknown[] = [];

const BIA = {
  id: "r-1",
  name: "Bia Souza",
  role: "student",
  whatsappNumber: null,
  removedAt: "2026-10-02T15:00:00.000Z",
};

const serve = (items: unknown[]) => {
  removedItems = items;
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("http://api.test", "");

    return path === "/people/removed"
      ? ok({ items: removedItems })
      : ok(buildPage(1, 1, 1));
  });
};

const renderScreen = () =>
  render(
    <SessionProvider>
      <RemovedAccountsScreen />
    </SessionProvider>,
    { wrapper: createWrapper(createQueryClient()) },
  );

const actualApiGet = jest.requireActual("@/services/api").apiGet;

const actualApiPost = jest.requireActual("@/services/api").apiPost;

afterEach(() => {
  jest.useRealTimers();
  (api.apiGet as jest.Mock).mockImplementation(actualApiGet);
  (api.apiPost as jest.Mock).mockImplementation(actualApiPost);
});

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
  removedItems = [];
});
describe("RemovedAccountsScreen", () => {
  it("lists the removed accounts with their dates, the count and Restore", async () => {
    setupSignedInAdmin();
    serve([BIA]);
    await renderScreen();

    expect(await screen.findByText("Bia Souza")).toBeOnTheScreen();
    expect(screen.getByText("1 can be restored")).toBeOnTheScreen();
    expect(screen.getByText("Student")).toBeOnTheScreen();
    expect(screen.getByText("Removed Oct 2")).toBeOnTheScreen();
    expect(screen.getByText("Permanently deleted on Nov 1")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Restore Bia Souza" }),
    ).toBeOnTheScreen();
  });

  it("shows a removal in Fortaleza time", async () => {
    setupSignedInAdmin();
    serve([{ ...BIA, removedAt: "2026-10-03T02:00:00.000Z" }]);
    await renderScreen();

    expect(await screen.findByText("Removed Oct 2")).toBeOnTheScreen();
    expect(screen.getByText("Permanently deleted on Nov 1")).toBeOnTheScreen();
  });

  it("opens the details sheet from the name and closes it", async () => {
    setupSignedInAdmin();
    serve([{ ...BIA, whatsappNumber: "+5585999998888" }]);
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByRole("button", { name: "Bia Souza" }));

    expect(await screen.findByText("Chat on WhatsApp")).toBeOnTheScreen();
    expect(screen.getByText("+55 85 99999 8888")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Remove account" }),
    ).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Close" }));

    await waitFor(() =>
      expect(screen.queryByText("Chat on WhatsApp")).not.toBeOnTheScreen(),
    );
  });

  it("shows the loading state while the removed accounts load, with the title in the header", async () => {
    setupSignedInAdmin();
    fetchMock.mockImplementation(() => new Promise(() => {}));
    await renderScreen();

    expect(screen.getByTestId("removed-accounts-loading")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "REMOVED ACCOUNTS" }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("removed-accounts-list")).not.toBeOnTheScreen();
  });

  it("shows the empty state with no removed account", async () => {
    setupSignedInAdmin();
    serve([]);
    await renderScreen();

    expect(await screen.findByText("No removed accounts")).toBeOnTheScreen();
  });

  it("shows the error state and retries", async () => {
    setupSignedInAdmin();
    fetchMock.mockImplementation(async () => failure());
    const user = userEvent.setup();
    await renderScreen();

    expect(
      await screen.findByText("Couldn't load the removed accounts"),
    ).toBeOnTheScreen();
    serve([BIA]);
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Bia Souza")).toBeOnTheScreen();
  });

  it("reloads them with a pull to refresh", async () => {
    setupSignedInAdmin();
    serve([BIA]);
    await renderScreen();
    await screen.findByText("Bia Souza");
    const before = requestedPaths().filter(
      (path) => path === "/people/removed",
    ).length;

    await act(async () => {
      await screen
        .getByTestId("removed-accounts-list")
        .props.refreshControl.props.onRefresh();
    });

    expect(
      requestedPaths().filter((path) => path === "/people/removed").length,
    ).toBe(before + 1);
  });

  describe("restore", () => {
    const rows = [
      {
        id: "r-1",
        name: "Bia Souza",
        role: "student",
        removedAt: "2026-10-02T15:00:00.000Z",
      },
      {
        id: "r-2",
        name: "Caio Lima",
        role: "instructor",
        removedAt: "2026-10-01T15:00:00.000Z",
      },
    ];

    /** Serves the removed accounts that haven't been restored yet; a POST restores the account of its path. */
    const serveWithRestore = (restore: (id: string) => unknown) => {
      let restored: string[] = [];
      fetchMock.mockImplementation(
        async (url: string, init?: { method?: string }) => {
          const path = String(url).replace("http://api.test", "");

          if (init?.method === "POST") {
            const id = path.split("/")[2]!;
            const answer = await restore(id);
            if ((answer as { ok: boolean }).ok) restored = [...restored, id];
            return answer;
          }
          if (path === "/people/removed") {
            return ok({
              items: rows.filter((row) => !restored.includes(row.id)),
            });
          }

          return path === "/people?perPage=1"
            ? ok(buildPage(1, 1, 1))
            : ok(buildPage(1, 1, 1));
        },
      );
    };

    it("restores at once: one request, the row leaves, no toast", async () => {
      setupSignedInAdmin();
      serveWithRestore(() => ok({ id: "r-1", status: "approved" }));
      const user = userEvent.setup();
      await renderScreen();

      await user.press(
        await screen.findByRole("button", { name: "Restore Bia Souza" }),
      );

      await waitFor(() =>
        expect(screen.queryByText("Bia Souza")).not.toBeOnTheScreen(),
      );
      expect(screen.getByText("Caio Lima")).toBeOnTheScreen();
      expect(
        requestedPaths().filter((path) => path === "/people/r-1/restore"),
      ).toHaveLength(1);
      expect(mockShow).not.toHaveBeenCalled();
    });

    it("shows the spinner in the pressed button and disables the other buttons until it is done", async () => {
      setupSignedInAdmin();
      let answer!: (value: unknown) => void;
      serveWithRestore((id) =>
        id === "r-1"
          ? new Promise((resolve) => (answer = resolve))
          : ok({ id, status: "approved" }),
      );
      const user = userEvent.setup();
      await renderScreen();
      const first = await screen.findByRole("button", {
        name: "Restore Bia Souza",
      });
      const second = screen.getByRole("button", { name: "Restore Caio Lima" });

      await user.press(first);
      await user.press(first);

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Restore Caio Lima" }),
        ).toBeDisabled(),
      );
      // The label gives way to the spinner in the pressed button; the other button keeps its label.
      expect(within(first).queryByText("Restore")).not.toBeOnTheScreen();
      expect(within(second).getByText("Restore")).toBeOnTheScreen();
      await user.press(second);
      answer(ok({ id: "r-1", status: "approved" }));

      await waitFor(() =>
        expect(screen.queryByText("Bia Souza")).not.toBeOnTheScreen(),
      );
      expect(
        screen.getByRole("button", { name: "Restore Caio Lima" }),
      ).toBeEnabled();
      expect(
        requestedPaths().filter((path) => path === "/people/r-1/restore"),
      ).toHaveLength(1);
      expect(
        requestedPaths().filter((path) => path === "/people/r-2/restore"),
      ).toHaveLength(0);
    });

    it.each([
      ["user.status.notRemoved", "This account is no longer removed."],
      ["removal.window.ended", "The time to restore this account has ended."],
    ])(
      "toasts a 409 %s and reloads the removed accounts",
      async (key, message) => {
        setupSignedInAdmin();
        serveWithRestore(() => ({
          ok: false,
          status: 409,
          json: async () => ({ errors: [key] }),
        }));
        const user = userEvent.setup();
        await renderScreen();
        await screen.findByText("Bia Souza");
        const before = requestedPaths().filter(
          (path) => path === "/people/removed",
        ).length;

        await user.press(
          screen.getByRole("button", { name: "Restore Bia Souza" }),
        );

        expect(mockShow).toHaveBeenCalledWith(message);
        await waitFor(() =>
          expect(
            requestedPaths().filter((path) => path === "/people/removed")
              .length,
          ).toBe(before + 1),
        );
      },
    );

    it("toasts the generic error on a network failure and keeps the row", async () => {
      setupSignedInAdmin();
      serveWithRestore(() => {
        throw new api.NetworkError();
      });
      const user = userEvent.setup();
      await renderScreen();

      await user.press(
        await screen.findByRole("button", { name: "Restore Bia Souza" }),
      );

      expect(mockShow).toHaveBeenCalledWith(
        "No connection. Check your internet and try again.",
      );
      expect(screen.getByText("Bia Souza")).toBeOnTheScreen();
    });

    it("shows no toast when the session expired", async () => {
      setupSignedInAdmin();
      serveWithRestore(() => ok({}));
      (api.apiPost as jest.Mock).mockRejectedValue(
        new api.SessionExpiredError(),
      );
      const user = userEvent.setup();
      await renderScreen();

      await user.press(
        await screen.findByRole("button", { name: "Restore Bia Souza" }),
      );

      expect(mockShow).not.toHaveBeenCalled();
      expect(screen.getByText("Bia Souza")).toBeOnTheScreen();
    });
  });
});

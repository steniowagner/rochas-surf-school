import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";

import i18n from "@/i18n";
import { hydrateSession } from "@/services/session/session.store";

import { RegistrationsScreen } from "./registrations.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible, with a backdrop.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Pressable, View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, onClose, children }: any) =>
      visible ? (
        <View>
          <Pressable accessibilityLabel="backdrop" onPress={onClose} />
          {children}
        </View>
      ) : null,
  };
});

const NOW = new Date("2026-10-12T12:00:00.000Z");

const ANA = {
  id: "ana-id",
  name: "Ana Souza",
  email: "ana@example.com",
  createdAt: "2026-10-12T10:00:00.000Z",
};
const BRUNO = {
  id: "bruno-id",
  name: "Bruno Lima",
  email: "bruno@example.com",
  createdAt: "2026-10-02T09:00:00.000Z",
};

type Registration = typeof ANA;

const fetchMock = jest.fn();

/** A fake backend: the list, and the decisions that take people off it. */
function serve(
  initial: Registration[],
  overrides: Record<string, () => unknown> = {},
) {
  const state = { items: [...initial] };
  const respond = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const path = url.replace("http://api.test", "");
    const override = overrides[`${init.method} ${path}`];
    if (override) {
      return override();
    }

    if (init.method === "GET" && path === "/registrations") {
      return respond(200, { items: state.items });
    }

    const [, id, action] = path.match(
      /^\/registrations\/([^/]+)\/(approve|deny)$/,
    )!;
    state.items = state.items.filter((item) => item.id !== id);

    return respond(200, {
      id,
      status: action === "approve" ? "approved" : "denied",
    });
  });

  return state;
}

const answer = (status: number, body: unknown) => () => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const posts = () =>
  fetchMock.mock.calls.filter(([, init]) => init.method === "POST");

async function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  const ui = (
    <QueryClientProvider client={queryClient}>
      <RegistrationsScreen />
    </QueryClientProvider>
  );
  const view = await render(ui);

  return { ...view, queryClient };
}

const cardOf = (name: string) =>
  screen.getByText(name).parent!.parent!.parent!.parent!;

beforeEach(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "nextTick",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
    ],
  });
  hydrateSession({
    user: { id: "admin-1", role: "admin", status: "approved" } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
    },
  });
  fetchMock.mockReset();
  mockShow.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

afterEach(() => {
  jest.useRealTimers();
});

describe("RegistrationsScreen list", () => {
  it("shows the title, the description and one card per registration, oldest first", async () => {
    serve([BRUNO, ANA]);
    await renderScreen();

    await screen.findByText("Bruno Lima");

    expect(
      screen.getByRole("header", { name: "Join the school" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("People waiting for the school's approval."),
    ).toBeOnTheScreen();
    const names = screen
      .getAllByText(/^(Ana Souza|Bruno Lima)$/)
      .map((node) => node.props.children);
    expect(names).toEqual(["Bruno Lima", "Ana Souza"]);

    const bruno = within(cardOf("Bruno Lima"));
    expect(bruno.getByText("BL")).toBeOnTheScreen();
    expect(bruno.getByText("bruno@example.com")).toBeOnTheScreen();
    expect(bruno.getByText("Asked 2 Oct")).toBeOnTheScreen();
    expect(bruno.getByRole("button", { name: "Deny" })).toBeOnTheScreen();
    expect(bruno.getByRole("button", { name: "Approve" })).toBeOnTheScreen();

    const ana = within(cardOf("Ana Souza"));
    expect(ana.getByText("AS")).toBeOnTheScreen();
    expect(ana.getByText("Asked 2 hours ago")).toBeOnTheScreen();
  });

  it("shows 'Asked just now' for a registration under a minute old", async () => {
    serve([{ ...ANA, createdAt: "2026-10-12T11:59:40.000Z" }]);
    await renderScreen();

    expect(await screen.findByText("Asked just now")).toBeOnTheScreen();
  });

  it("leaves out the 'Asked' line when the date is unreadable", async () => {
    serve([{ ...ANA, createdAt: "not a date" }]);
    await renderScreen();

    await screen.findByText("ana@example.com");

    expect(screen.queryByText(/^Asked/)).toBeNull();
  });

  it("shows one initial for a one-word name", async () => {
    serve([{ ...ANA, name: "Madonna" }]);
    await renderScreen();

    await screen.findByText("Madonna");

    expect(screen.getByText("M")).toBeOnTheScreen();
  });

  it("shows a loading indicator and no cards while loading", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderScreen();

    expect(screen.getByTestId("registrations-loading")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  it("says no one is waiting when the list is empty", async () => {
    serve([]);
    await renderScreen();

    expect(
      await screen.findByText("No one is waiting to join."),
    ).toBeOnTheScreen();
  });

  it("shows the error and loads again on 'Try again'", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(answer(500, { errors: [] })());
    await renderScreen();

    expect(
      await screen.findByText("Couldn't load the registrations."),
    ).toBeOnTheScreen();

    serve([ANA]);
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load the registrations.")).toBeNull();
  });

  it("refetches when the list is pulled down", async () => {
    const state = serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    state.items = [ANA, BRUNO];
    await act(async () => {
      await screen
        .getByTestId("registrations-list")
        .props.refreshControl.props.onRefresh();
    });

    expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
  });
});

describe("RegistrationsScreen approve", () => {
  it("sends the approval, disables that card meanwhile, then moves the person to 'Decided just now'", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const state = serve([BRUNO, ANA]);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (init.method === "POST") {
        await gate;
      }

      return original(url, init);
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(
      within(cardOf("Ana Souza")).getByRole("button", { name: "Approve" }),
    );

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe("http://api.test/registrations/ana-id/approve");
    // The card is sending: its buttons ignore taps, the other card stays usable.
    const ana = within(cardOf("Ana Souza"));
    expect(ana.queryByText("Approve")).toBeNull();
    expect(
      ana.getByRole("button", { name: "Deny" }).props.accessibilityState
        .disabled,
    ).toBe(true);
    await user.press(ana.getByRole("button", { name: "Deny" }));
    expect(screen.queryByText("Deny Ana Souza?")).toBeNull();
    expect(
      within(cardOf("Bruno Lima")).getByRole("button", { name: "Approve" })
        .props.accessibilityState.disabled,
    ).toBe(false);

    await act(async () => {
      release();
    });

    await waitFor(() =>
      expect(screen.getByText("Decided just now")).toBeOnTheScreen(),
    );
    expect(state.items).toEqual([BRUNO]);
    expect(posts()).toHaveLength(1);
    expect(screen.getByText("Approved")).toBeOnTheScreen();
    expect(within(cardOf("Bruno Lima")).queryByText("Ana Souza")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeNull();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the no-connection toast and keeps the card usable when offline", async () => {
    const user = userEvent.setup();
    serve([ANA], {
      "POST /registrations/ana-id/approve": () => {
        throw new TypeError("Network request failed");
      },
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.noConnection"),
      ),
    );
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Approve" }).props.accessibilityState
        .disabled,
    ).toBe(false);
    expect(screen.queryByText("Decided just now")).toBeNull();
  });

  it("shows the generic toast and keeps the card on any other error", async () => {
    const user = userEvent.setup();
    serve([ANA], {
      "POST /registrations/ana-id/approve": answer(500, {
        errors: ["INTERNAL_SERVER_ERROR"],
      }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.generic"),
      ),
    );
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.queryByText("Decided just now")).toBeNull();
  });
});

describe("RegistrationsScreen deny", () => {
  it("keeps another card's sheet and reason open when a decision finishes", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    serve([BRUNO, ANA]);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (init.method === "POST") {
        await gate;
      }

      return original(url, init);
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(
      within(cardOf("Ana Souza")).getByRole("button", { name: "Approve" }),
    );
    await user.press(
      within(cardOf("Bruno Lima")).getByRole("button", { name: "Deny" }),
    );
    await user.type(screen.getByLabelText("Reason (optional)"), "abc");
    await act(async () => {
      release();
    });

    await screen.findByText("Approved");
    expect(screen.getByText("Deny Bruno Lima?")).toBeOnTheScreen();
    expect(screen.getByText("3/500")).toBeOnTheScreen();
  });

  it("opens the sheet, sends the typed reason and moves the person to 'Decided just now'", async () => {
    const user = userEvent.setup();
    const state = serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));

    expect(screen.getByText("Deny Ana Souza?")).toBeOnTheScreen();
    expect(
      screen.getByText("The reason is optional and is shown to the person."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Reason (optional)")).toBeOnTheScreen();
    expect(screen.getByText("0/500")).toBeOnTheScreen();

    await user.type(
      screen.getByLabelText("Reason (optional)"),
      "Não conhecemos você.",
    );
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    await waitFor(() =>
      expect(screen.queryByText("Deny Ana Souza?")).toBeNull(),
    );
    expect(posts()[0][0]).toBe("http://api.test/registrations/ana-id/deny");
    expect(JSON.parse(posts()[0][1].body)).toEqual({
      reason: "Não conhecemos você.",
    });
    expect(state.items).toEqual([]);
    expect(await screen.findByText("Denied")).toBeOnTheScreen();
    expect(screen.getByText("Decided just now")).toBeOnTheScreen();
    expect(screen.getByText("No one is waiting to join.")).toBeOnTheScreen();
  });

  it("denies with no reason when the field is empty", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0][1].body)).toEqual({});
    expect(await screen.findByText("Denied")).toBeOnTheScreen();
  });

  it("sends nothing when the sheet is closed, and opens empty the next time", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "x");
    await user.press(screen.getByLabelText("backdrop"));

    expect(screen.queryByText("Deny Ana Souza?")).toBeNull();
    expect(posts()).toHaveLength(0);
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Deny" }));
    expect(screen.getByText("0/500")).toBeOnTheScreen();
  });

  it("keeps the sheet and the reason open when the request fails", async () => {
    const user = userEvent.setup();
    serve([ANA], {
      "POST /registrations/ana-id/deny": answer(500, { errors: [] }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "abc");
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.generic"),
      ),
    );
    expect(screen.getByText("Deny Ana Souza?")).toBeOnTheScreen();
    expect(screen.getByText("3/500")).toBeOnTheScreen();
    expect(screen.queryByText("Decided just now")).toBeNull();
  });

  it("shows the no-connection toast and keeps the sheet when offline", async () => {
    const user = userEvent.setup();
    serve([ANA], {
      "POST /registrations/ana-id/deny": () => {
        throw new TypeError("Network request failed");
      },
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.noConnection"),
      ),
    );
    expect(screen.getByText("Deny Ana Souza?")).toBeOnTheScreen();
  });
});

describe("RegistrationsScreen already decided", () => {
  it("toasts, refetches the list and adds nothing to 'Decided just now' on approve", async () => {
    const user = userEvent.setup();
    const state = serve([ANA, BRUNO], {
      "POST /registrations/ana-id/approve": answer(409, {
        errors: ["registration.status.notPending"],
      }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");
    state.items = [BRUNO];

    await user.press(
      within(cardOf("Ana Souza")).getByRole("button", { name: "Approve" }),
    );

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "This registration was already decided.",
      ),
    );
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText("Bruno Lima")).toBeOnTheScreen();
    expect(screen.queryByText("Decided just now")).toBeNull();
  });

  it("closes the sheet on a denial that was already decided", async () => {
    const user = userEvent.setup();
    const state = serve([ANA], {
      "POST /registrations/ana-id/deny": answer(409, {
        errors: ["registration.status.notPending"],
      }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");
    state.items = [];

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny registration" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "This registration was already decided.",
      ),
    );
    expect(screen.queryByText("Deny Ana Souza?")).toBeNull();
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.queryByText("Decided just now")).toBeNull();
  });
});

describe("RegistrationsScreen decided just now", () => {
  it("is hidden at first, lists the newest decision first and keeps its entries on refresh", async () => {
    const user = userEvent.setup();
    serve([BRUNO, ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");
    expect(screen.queryByText("Decided just now")).toBeNull();

    await user.press(
      within(cardOf("Ana Souza")).getByRole("button", { name: "Approve" }),
    );
    await screen.findByText("Approved");
    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny registration" }));
    await screen.findByText("Denied");

    expect(screen.getByText("Decided just now")).toBeOnTheScreen();
    const decided = screen
      .getAllByText(/^(Ana Souza|Bruno Lima)$/)
      .map((node) => node.props.children);
    expect(decided).toEqual(["Bruno Lima", "Ana Souza"]);
    expect(screen.getByText("No one is waiting to join.")).toBeOnTheScreen();

    await act(async () => {
      await screen
        .getByTestId("registrations-list")
        .props.refreshControl.props.onRefresh();
    });

    expect(screen.getByText("Decided just now")).toBeOnTheScreen();
    expect(screen.getByText("Approved")).toBeOnTheScreen();
    expect(screen.getByText("Denied")).toBeOnTheScreen();
  });

  it("is empty again when the screen is opened anew", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    const first = await renderScreen();
    await screen.findByText("Ana Souza");
    await user.press(screen.getByRole("button", { name: "Approve" }));
    await screen.findByText("Approved");
    await first.unmount();

    serve([BRUNO]);
    await renderScreen();
    await screen.findByText("Bruno Lima");

    expect(screen.queryByText("Decided just now")).toBeNull();
  });
});

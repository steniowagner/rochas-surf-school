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

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the screen's header title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) =>
      options.unstable_headerLeftItems?.({})[0].element ??
      options.headerTitle(),
  },
}));

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
  photoUrl: null as string | null,
  email: "ana@example.com",
  createdAt: "2026-10-12T10:00:00.000Z",
};
const BRUNO = {
  id: "bruno-id",
  name: "Bruno Lima",
  photoUrl: null,
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

// The card is the closest ancestor of the name that holds its three buttons (the row, Deny and Approve).
const cardOf = (name: string) => {
  let node = screen.getByText(name);

  while (node.parent && within(node).queryAllByRole("button").length < 3) {
    node = node.parent;
  }

  return node;
};

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
  it("shows the registration's photo", async () => {
    serve([{ ...ANA, photoUrl: "https://img.test/ana.jpg" }]);
    await renderScreen();

    expect(await screen.findByTestId("person-avatar-photo")).toBeOnTheScreen();
  });

  it("shows the count, the title, the description and one card per registration, oldest first", async () => {
    serve([BRUNO, ANA]);
    await renderScreen();

    await screen.findByText("Bruno Lima");

    expect(screen.getByText("2 waiting for approval")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Join the school" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "New accounts can only book classes once approved. The person gets a push notification.",
      ),
    ).toBeOnTheScreen();
    const names = screen
      .getAllByText(/^(Ana Souza|Bruno Lima)$/)
      .map((node) => node.props.children);
    expect(names).toEqual(["Bruno Lima", "Ana Souza"]);

    const bruno = within(cardOf("Bruno Lima"));
    expect(bruno.getByText("BL")).toBeOnTheScreen();
    expect(bruno.getByText("bruno@example.com")).toBeOnTheScreen();
    expect(bruno.getByRole("button", { name: "Deny" })).toBeOnTheScreen();
    expect(bruno.getByRole("button", { name: "Approve" })).toBeOnTheScreen();
    expect(screen.queryByText(/^Asked/)).toBeNull();

    expect(within(cardOf("Ana Souza")).getByText("AS")).toBeOnTheScreen();
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
    expect(
      screen.getByLabelText("Loading the registrations"),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByText(/^\d+ waiting for approval$/)).toBeNull();
  });

  it("says no one is waiting when the list is empty", async () => {
    serve([]);
    await renderScreen();

    expect(await screen.findByText("No one is waiting")).toBeOnTheScreen();
    expect(screen.queryByText(/^\d+ waiting for approval$/)).toBeNull();
  });

  it("shows the error and loads again on 'Try again'", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(answer(500, { errors: [] })());
    await renderScreen();

    expect(
      await screen.findByText("Couldn't load the registrations"),
    ).toBeOnTheScreen();

    serve([ANA]);
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load the registrations")).toBeNull();
  });

  it("hides the count on a load error", async () => {
    fetchMock.mockResolvedValue(answer(500, { errors: [] })());
    await renderScreen();

    await screen.findByText("Couldn't load the registrations");

    expect(screen.queryByText(/^\d+ waiting for approval$/)).toBeNull();
  });

  it("insets its list below the header, whatever the header is", async () => {
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    expect(
      screen.getByTestId("registrations-list").props
        .contentInsetAdjustmentBehavior,
    ).toBe("automatic");
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
  it("sends the approval, disables that card meanwhile, then removes the card and lowers the count", async () => {
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
    expect(screen.queryByText("Deny entry?")).toBeNull();
    expect(
      within(cardOf("Bruno Lima")).getByRole("button", { name: "Approve" })
        .props.accessibilityState.disabled,
    ).toBe(false);

    await act(async () => {
      release();
    });

    await waitFor(() =>
      expect(screen.getByText("1 waiting for approval")).toBeOnTheScreen(),
    );
    expect(state.items).toEqual([BRUNO]);
    expect(posts()).toHaveLength(1);
    expect(screen.queryByText("Ana Souza")).toBeNull();
    expect(screen.queryByText("Approved")).toBeNull();
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

    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText(/^Bruno Lima won't join/)).toBeOnTheScreen();
    expect(screen.getByText("3/500")).toBeOnTheScreen();
  });

  it("opens the sheet, sends the typed reason and removes the card", async () => {
    const user = userEvent.setup();
    const state = serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));

    expect(screen.getByText("Deny entry?")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Ana Souza won't join the school. You can explain why (optional) — the person gets this message.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByPlaceholderText(
        "E.g.: We have no spots for new students right now.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Reason (optional)")).toBeNull();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(screen.getByText("0/500")).toBeOnTheScreen();

    await user.type(
      screen.getByLabelText("Reason (optional)"),
      "Não conhecemos você.",
    );
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() => expect(screen.queryByText("Deny entry?")).toBeNull());
    expect(posts()[0][0]).toBe("http://api.test/registrations/ana-id/deny");
    expect(JSON.parse(posts()[0][1].body)).toEqual({
      reason: "Não conhecemos você.",
    });
    expect(state.items).toEqual([]);
    expect(await screen.findByText("No one is waiting")).toBeOnTheScreen();
    expect(screen.queryByText("Denied")).toBeNull();
  });

  it("denies with no reason when the field is empty", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0][1].body)).toEqual({});
    expect(await screen.findByText("No one is waiting")).toBeOnTheScreen();
  });

  it("sends nothing when the sheet is closed, and opens empty the next time", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "x");
    await user.press(screen.getByLabelText("backdrop"));

    expect(screen.queryByText("Deny entry?")).toBeNull();
    expect(posts()).toHaveLength(0);
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Deny" }));
    expect(screen.getByText("0/500")).toBeOnTheScreen();
  });

  it("closes the sheet with 'Back', sending nothing", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "x");
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(screen.queryByText("Deny entry?")).toBeNull();
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
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.generic"),
      ),
    );
    expect(screen.getByText("Deny entry?")).toBeOnTheScreen();
    expect(screen.getByText("3/500")).toBeOnTheScreen();
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
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.noConnection"),
      ),
    );
    expect(screen.getByText("Deny entry?")).toBeOnTheScreen();
  });
});

describe("RegistrationsScreen already decided", () => {
  it("toasts, refetches the list and removes the card on approve", async () => {
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
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "This registration was already decided.",
      ),
    );
    expect(screen.queryByText("Deny entry?")).toBeNull();
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
  });
});

describe("RegistrationsScreen detail sheet", () => {
  it("opens with the name, the Student chip and the email, no WhatsApp, and closes with Close", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Ana Souza" }));

    expect(screen.getByText("Student")).toBeOnTheScreen();
    // Once on the card, once in the sheet.
    expect(screen.getAllByText("ana@example.com")).toHaveLength(2);
    expect(screen.getByText("Email")).toBeOnTheScreen();
    expect(screen.queryByText("Chat on WhatsApp")).toBeNull();
    expect(screen.queryByText("Number not shared.")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Student")).toBeNull();
  });

  it("is not opened by the Deny and Approve buttons", async () => {
    const user = userEvent.setup();
    serve([ANA]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    expect(screen.queryByText("Student")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Back" }));
    await user.press(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(screen.queryByText("Student")).toBeNull();
  });
});

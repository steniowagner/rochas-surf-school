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

import { ReactivationsScreen } from "./reactivations.screen";

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

const CARLA = {
  id: "carla-id",
  name: "Carla Dias",
  email: "carla@example.com",
  role: "student",
  deletedAt: "2026-10-12T15:00:00.000Z",
  requestedAt: "2026-10-20T10:00:00.000Z",
  classesTaken: 8,
};
const DAVI = {
  id: "davi-id",
  name: "Davi Reis",
  email: "davi@example.com",
  role: "instructor",
  deletedAt: "2026-10-02T09:00:00.000Z",
  requestedAt: "2026-10-05T09:00:00.000Z",
  classesTaken: 1,
};

type ReactivationRequest = typeof CARLA;

const fetchMock = jest.fn();

/** A fake backend: the list, and the decisions that take requests off it. */
function serve(
  initial: ReactivationRequest[],
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

    if (init.method === "GET" && path === "/reactivation-requests") {
      return respond(200, { items: state.items });
    }

    const [, id, action] = path.match(
      /^\/reactivation-requests\/([^/]+)\/(approve|deny)$/,
    )!;
    state.items = state.items.filter((item) => item.id !== id);

    return respond(200, {
      id,
      decision: action === "approve" ? "approved" : "denied",
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
      <ReactivationsScreen />
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

describe("ReactivationsScreen list", () => {
  it("shows the count, the title, the description and one card per request, oldest first", async () => {
    serve([DAVI, CARLA]);
    await renderScreen();

    await screen.findByText("Davi Reis");

    expect(screen.getByText("2 waiting for an answer")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Reactivate accounts" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Deleted accounts that asked to come back. Reactivating restores the account, its history and its role, but not cancelled seats. The person gets a push notification.",
      ),
    ).toBeOnTheScreen();
    const names = screen
      .getAllByText(/^(Carla Dias|Davi Reis)$/)
      .map((node) => node.props.children);
    expect(names).toEqual(["Davi Reis", "Carla Dias"]);

    const carla = within(cardOf("Carla Dias"));
    expect(carla.getByText("CD")).toBeOnTheScreen();
    expect(carla.getByText("carla@example.com")).toBeOnTheScreen();
    expect(
      carla.getByText("Deleted Oct 12, 2026 · 8 classes"),
    ).toBeOnTheScreen();
    expect(carla.getByRole("button", { name: "Deny" })).toBeOnTheScreen();
    expect(carla.getByRole("button", { name: "Reactivate" })).toBeOnTheScreen();
    expect(
      within(cardOf("Davi Reis")).getByText("Deleted Oct 2, 2026 · 1 class"),
    ).toBeOnTheScreen();
  });

  it("writes the deletion date in the app language", async () => {
    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });
    serve([CARLA]);
    await renderScreen();

    expect(
      await screen.findByText("Excluída em 12 de out. de 2026 · 8 aulas"),
    ).toBeOnTheScreen();

    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
  });

  it("shows a loading indicator and no cards while loading", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderScreen();

    expect(screen.getByTestId("registrations-loading")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reactivate" })).toBeNull();
    expect(screen.queryByText(/^\d+ waiting for an answer$/)).toBeNull();
  });

  it("says there is no request when the list is empty", async () => {
    serve([]);
    await renderScreen();

    expect(await screen.findByText("No requests")).toBeOnTheScreen();
    expect(screen.queryByText(/^\d+ waiting for an answer$/)).toBeNull();
  });

  it("shows the error and loads again on 'Try again'", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(answer(500, { errors: [] })());
    await renderScreen();

    expect(
      await screen.findByText("Couldn't load the requests"),
    ).toBeOnTheScreen();

    serve([CARLA]);
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Carla Dias")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load the requests")).toBeNull();
  });

  it("refetches when the list is pulled down", async () => {
    const state = serve([CARLA]);
    await renderScreen();
    await screen.findByText("Carla Dias");

    state.items = [CARLA, DAVI];
    await act(async () => {
      await screen
        .getByTestId("reactivations-list")
        .props.refreshControl.props.onRefresh();
    });

    expect(await screen.findByText("Davi Reis")).toBeOnTheScreen();
  });
});

describe("ReactivationsScreen approve", () => {
  it("sends the approval, disables that card meanwhile, then removes the card and lowers the count", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const state = serve([DAVI, CARLA]);
    const original = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (init.method === "POST") {
        await gate;
      }

      return original(url, init);
    });
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(
      within(cardOf("Carla Dias")).getByRole("button", { name: "Reactivate" }),
    );
    // A second press in the same card is ignored while it sends.
    await user.press(
      within(cardOf("Carla Dias")).getByRole("button", { name: "Deny" }),
    );

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0][0]).toBe(
      "http://api.test/reactivation-requests/carla-id/approve",
    );
    expect(screen.queryByText("Deny reactivation?")).toBeNull();
    expect(
      within(cardOf("Davi Reis")).getByRole("button", { name: "Reactivate" })
        .props.accessibilityState.disabled,
    ).toBe(false);

    await act(async () => {
      release();
    });

    await waitFor(() =>
      expect(screen.getByText("1 waiting for an answer")).toBeOnTheScreen(),
    );
    expect(state.items).toEqual([DAVI]);
    expect(posts()).toHaveLength(1);
    expect(screen.queryByText("Carla Dias")).toBeNull();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the no-connection toast and keeps the card usable when offline", async () => {
    const user = userEvent.setup();
    serve([CARLA], {
      "POST /reactivation-requests/carla-id/approve": () => {
        throw new TypeError("Network request failed");
      },
    });
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Reactivate" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.noConnection"),
      ),
    );
    expect(screen.getByText("Carla Dias")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Reactivate" }).props
        .accessibilityState.disabled,
    ).toBe(false);
  });

  it("shows the generic toast and keeps the card on any other error", async () => {
    const user = userEvent.setup();
    serve([CARLA], {
      "POST /reactivation-requests/carla-id/approve": answer(500, {
        errors: ["INTERNAL_SERVER_ERROR"],
      }),
    });
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Reactivate" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.generic"),
      ),
    );
    expect(screen.getByText("Carla Dias")).toBeOnTheScreen();
  });
});

describe("ReactivationsScreen deny", () => {
  it("opens the sheet, sends the typed reason and removes the card", async () => {
    const user = userEvent.setup();
    const state = serve([CARLA]);
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Deny" }));

    expect(screen.getByText("Deny reactivation?")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Carla Dias's account will stay deleted. You can explain why (optional) — the person gets this message.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByPlaceholderText("Write a message to the person."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(screen.getByText("0/500")).toBeOnTheScreen();

    await user.type(
      screen.getByLabelText("Reason (optional)"),
      "Turmas cheias.",
    );
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() =>
      expect(screen.queryByText("Deny reactivation?")).toBeNull(),
    );
    expect(posts()[0][0]).toBe(
      "http://api.test/reactivation-requests/carla-id/deny",
    );
    expect(JSON.parse(posts()[0][1].body)).toEqual({
      reason: "Turmas cheias.",
    });
    expect(state.items).toEqual([]);
    expect(await screen.findByText("No requests")).toBeOnTheScreen();
  });

  it("denies with no reason when the field is empty", async () => {
    const user = userEvent.setup();
    serve([CARLA]);
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0][1].body)).toEqual({});
    expect(await screen.findByText("No requests")).toBeOnTheScreen();
  });

  it("sends nothing when the sheet is closed with 'Back' or the backdrop", async () => {
    const user = userEvent.setup();
    serve([CARLA]);
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "x");
    await user.press(screen.getByLabelText("backdrop"));
    expect(screen.queryByText("Deny reactivation?")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Deny" }));
    expect(screen.getByText("0/500")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(screen.queryByText("Deny reactivation?")).toBeNull();
    expect(posts()).toHaveLength(0);
    expect(screen.getByText("Carla Dias")).toBeOnTheScreen();
  });

  it("keeps the sheet and the reason open when the request fails", async () => {
    const user = userEvent.setup();
    serve([CARLA], {
      "POST /reactivation-requests/carla-id/deny": answer(500, { errors: [] }),
    });
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.type(screen.getByLabelText("Reason (optional)"), "abc");
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        i18n.t("createAccount.errors.generic"),
      ),
    );
    expect(screen.getByText("Deny reactivation?")).toBeOnTheScreen();
    expect(screen.getByText("3/500")).toBeOnTheScreen();
  });
});

describe("ReactivationsScreen already decided", () => {
  it("toasts, reloads the list and removes the card on approve", async () => {
    const user = userEvent.setup();
    const state = serve([CARLA, DAVI], {
      "POST /reactivation-requests/carla-id/approve": answer(409, {
        errors: ["reactivation.status.notRequested"],
      }),
    });
    await renderScreen();
    await screen.findByText("Carla Dias");
    state.items = [DAVI];

    await user.press(
      within(cardOf("Carla Dias")).getByRole("button", { name: "Reactivate" }),
    );

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "This request was already decided.",
      ),
    );
    await waitFor(() => expect(screen.queryByText("Carla Dias")).toBeNull());
    expect(screen.getByText("Davi Reis")).toBeOnTheScreen();
  });

  it("closes the sheet on a denial that was already decided", async () => {
    const user = userEvent.setup();
    const state = serve([CARLA], {
      "POST /reactivation-requests/carla-id/deny": answer(409, {
        errors: ["reactivation.status.notRequested"],
      }),
    });
    await renderScreen();
    await screen.findByText("Carla Dias");
    state.items = [];

    await user.press(screen.getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "This request was already decided.",
      ),
    );
    expect(screen.queryByText("Deny reactivation?")).toBeNull();
    await waitFor(() => expect(screen.queryByText("Carla Dias")).toBeNull());
  });
});

describe("ReactivationsScreen detail sheet", () => {
  it("opens with the name, the role chip and the email, no WhatsApp, and closes with Close", async () => {
    const user = userEvent.setup();
    serve([DAVI]);
    await renderScreen();
    await screen.findByText("Davi Reis");

    await user.press(screen.getByRole("button", { name: "Davi Reis" }));

    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    // Once on the card, once in the sheet.
    expect(screen.getAllByText("davi@example.com")).toHaveLength(2);
    expect(screen.queryByText("Chat on WhatsApp")).toBeNull();
    expect(screen.queryByText("Number not shared.")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Instructor")).toBeNull();
  });

  it("is not opened by the Deny and Reactivate buttons", async () => {
    const user = userEvent.setup();
    serve([CARLA]);
    await renderScreen();
    await screen.findByText("Carla Dias");

    await user.press(screen.getByRole("button", { name: "Deny" }));
    expect(screen.queryByText("Student")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Back" }));
    await user.press(screen.getByRole("button", { name: "Reactivate" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(screen.queryByText("Student")).toBeNull();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor, within, act } from "@testing-library/react-native";

import { hydrateSession } from "@/services/session/session.store";

import { ClassRequestsScreen } from "./class-requests.screen";

const mockShow = jest.fn();

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useRouter: () => ({ push: mockPush }),
  // Renders the screen's header title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => options.unstable_headerLeftItems?.({})[0].element ?? options.headerTitle(),
  },
}));

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible.
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

const fetchMock = jest.fn();

const ANA = {
  id: "r-ana",
  requestedAt: "2026-10-19T12:12:00.000Z",
  student: { id: "s-ana", name: "Ana Souza", photoUrl: null },
};
const BRUNO = {
  id: "r-bruno",
  requestedAt: "2026-10-19T13:40:00.000Z",
  student: { id: "s-bruno", name: "Bruno Lima", photoUrl: null },
};

const surfClass = (overrides: Record<string, unknown> = {}) => ({
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: "2026-10-21T11:00:00.000Z",
  endsAt: "2026-10-21T12:00:00.000Z",
  capacity: 8,
  seatsTaken: 3,
  location: { name: "Praia do Futuro" },
  requests: [ANA, BRUNO],
  ...overrides,
});

type PendingClass = ReturnType<typeof surfClass>;

const respond = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

/** A fake backend: the list, and the decisions that take requests off it. */
function serve(initial: PendingClass[], overrides: Record<string, () => unknown> = {}) {
  const state = { classes: initial.map((item) => ({ ...item, requests: [...item.requests] })) };
  const total = () => state.classes.reduce((sum, item) => sum + item.requests.length, 0);

  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const path = url.replace("http://api.test", "");
    const override = overrides[`${init.method} ${path}`];

    if (override) {
      return override();
    }

    if (init.method === "GET" && path === "/enrolments/pending") {
      return respond(200, { total: total(), classes: state.classes.filter((item) => item.requests.length > 0) });
    }

    const [, id, action] = path.match(/^\/enrolments\/([^/]+)\/(approve|deny)$/)!;
    for (const item of state.classes) {
      item.requests = item.requests.filter((request) => request.id !== id);
    }

    return respond(200, { id, classId: "c-1", status: action === "approve" ? "approved" : "denied" });
  });

  return state;
}

const posts = () => fetchMock.mock.calls.filter(([, init]) => init.method === "POST");

async function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });

  await render(
    <QueryClientProvider client={queryClient}>
      <ClassRequestsScreen />
    </QueryClientProvider>,
  );
}

// The card is the closest ancestor of the name that holds both of its buttons.
const cardOf = (name: string | RegExp) => {
  let node = screen.getByText(name);

  while (node.parent && within(node).queryAllByRole("button").length < 2) {
    node = node.parent;
  }

  return node;
};

beforeEach(() => {
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

describe("ClassRequestsScreen list", () => {
  it("shows the counts, the class header and one card per request in the order asked", async () => {
    serve([surfClass()]);
    await renderScreen();

    await screen.findByText("Ana Souza");

    expect(screen.getByRole("header", { name: "Class enrolments" })).toBeOnTheScreen();
    expect(screen.getByText("2 requests · 1 class")).toBeOnTheScreen();
    expect(screen.getByText("WED")).toBeOnTheScreen();
    expect(screen.getByText("21")).toBeOnTheScreen();
    expect(screen.getByText("OCT 2026")).toBeOnTheScreen();
    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("08:00 – 09:00")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByText("Max. 8 students")).toBeOnTheScreen();
    expect(screen.getByText("5 spots left")).toBeOnTheScreen();
    expect(screen.getByTestId("occupancy-fill").props.style.width).toBe("38%");
    expect(screen.getAllByText(/^(Ana Souza|Bruno Lima)$/).map((node) => node.props.children)).toEqual([
      "Ana Souza",
      "Bruno Lima",
    ]);
    expect(screen.getByText("Asked at 09:12 · 19 Oct")).toBeOnTheScreen();
    expect(screen.queryByText("Waiting list · in the order asked")).toBeNull();
    expect(within(cardOf("Ana Souza")).getByRole("button", { name: "Enrol" })).toBeOnTheScreen();
    expect(within(cardOf("Ana Souza")).getByRole("button", { name: "Deny" })).toBeOnTheScreen();
  });

  it("opens the student's details from the chevron of a request", async () => {
    const user = userEvent.setup();
    serve([surfClass()]);
    await renderScreen();

    await screen.findByText("Ana Souza");
    await user.press(screen.getByRole("button", { name: "Ana Souza" }));

    expect(await screen.findByText("Student")).toBeOnTheScreen();
  });

  it("opens the details of the class from its header", async () => {
    const user = userEvent.setup();
    serve([surfClass()]);
    await renderScreen();

    await screen.findByText("Ana Souza");
    await user.press(screen.getByRole("button", { name: /^Surf, 08:00/ }));

    expect(mockPush).toHaveBeenCalledWith({ pathname: "/admin/class/[id]", params: { id: surfClass().id } });
  });

  it("filters the classes by sport and says when the sport has no requests", async () => {
    const user = userEvent.setup();
    serve([surfClass()]);
    await renderScreen();

    await screen.findByText("Ana Souza");
    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await user.press(screen.getByRole("button", { name: "Skate" }));

    expect(screen.queryByText("Ana Souza")).toBeNull();
    expect(screen.getByText("No skate requests")).toBeOnTheScreen();
    expect(screen.getByText("0 requests · 0 classes")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await user.press(screen.getByRole("button", { name: "Surf" }));

    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
  });

  it("shows the waiting order and blocks Enrol on a full class, still allowing Deny", async () => {
    const user = userEvent.setup();
    serve([surfClass({ capacity: 3, seatsTaken: 3 })]);
    await renderScreen();

    await screen.findByText("#1 Ana Souza");

    expect(screen.getByText("Full")).toBeOnTheScreen();
    expect(screen.getByText("Waiting list · in the order asked")).toBeOnTheScreen();
    expect(screen.getByText("#2 Bruno Lima")).toBeOnTheScreen();
    expect(
      screen.getByText("Enrol stays blocked while the class is full. Raise the capacity or wait for a seat to open."),
    ).toBeOnTheScreen();
    const enrol = within(cardOf("#1 Ana Souza")).getByRole("button", { name: "Enrol" });
    expect(enrol.props.accessibilityState.disabled).toBe(true);
    await user.press(enrol);
    expect(posts()).toHaveLength(0);

    await user.press(within(cardOf("#1 Ana Souza")).getByRole("button", { name: "Deny" }));
    expect(screen.getByText("Deny enrolment?")).toBeOnTheScreen();
  });

  it("shows a loading indicator while loading", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderScreen();

    expect(screen.getByTestId("class-requests-loading")).toBeOnTheScreen();
    expect(screen.getByLabelText("Loading the requests")).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Class enrolments" })).toBeNull();
    expect(screen.queryByText(/requests ·/)).toBeNull();
  });

  it("says nothing is waiting when no request is pending", async () => {
    serve([]);
    await renderScreen();

    expect(await screen.findByText("Nothing waiting")).toBeOnTheScreen();
    expect(screen.getByText("Every enrolment has been decided.")).toBeOnTheScreen();
    expect(screen.queryByText(/requests ·/)).toBeNull();
  });

  it("shows the error and loads again on 'Try again'", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(respond(500, { errors: [] }));
    await renderScreen();

    expect(await screen.findByText("Couldn't load the requests")).toBeOnTheScreen();
    expect(screen.queryByText(/requests ·/)).toBeNull();

    serve([surfClass()]);
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Ana Souza")).toBeOnTheScreen();
  });

  it("refetches when the list is pulled down", async () => {
    const state = serve([surfClass({ requests: [ANA] })]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    state.classes[0]!.requests = [ANA, BRUNO];
    await act(async () => {
      await screen.getByTestId("class-requests-list").props.refreshControl.props.onRefresh();
    });

    expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
  });
});

describe("ClassRequestsScreen decisions", () => {
  it("enrols at once, shows the toast and takes the card off", async () => {
    const user = userEvent.setup();
    serve([surfClass()]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(within(cardOf("Ana Souza")).getByRole("button", { name: "Enrol" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Ana Souza enrolled · student notified", { tone: "success" }));
    expect(posts()[0]![0]).toBe("http://api.test/enrolments/r-ana/approve");
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText("1 request · 1 class")).toBeOnTheScreen();
  });

  it("denies through the sheet with the typed reason", async () => {
    const user = userEvent.setup();
    serve([surfClass()]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(within(cardOf("Ana Souza")).getByRole("button", { name: "Deny" }));
    expect(screen.getByText("Deny enrolment?")).toBeOnTheScreen();
    expect(screen.getByText(/^Ana Souza won't be enrolled in this class/)).toBeOnTheScreen();
    await user.type(screen.getByLabelText("Reason (optional)"), "Advanced level");
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Ana Souza denied · student notified", { tone: "success" }));
    expect(posts()[0]![0]).toBe("http://api.test/enrolments/r-ana/deny");
    expect(JSON.parse(posts()[0]![1].body)).toEqual({ reason: "Advanced level" });
    await waitFor(() => expect(screen.queryByText("Deny enrolment?")).toBeNull());
    expect(screen.queryByText("Ana Souza")).toBeNull();
  });

  it("denies without a reason", async () => {
    const user = userEvent.setup();
    serve([surfClass()]);
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(within(cardOf("Ana Souza")).getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0]![1].body)).toEqual({});
  });

  it.each([
    ["enrolment.notPending", 409, "This request was already decided."],
    ["class.started", 409, "The class already started."],
    ["enrolment.class.full", 409, "The class is now full."],
  ])("shows the %s toast and reloads the list", async (key, status, message) => {
    const user = userEvent.setup();
    const state = serve([surfClass()], {
      "POST /enrolments/r-ana/approve": () => respond(status, { errors: [key] }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");
    state.classes[0]!.requests = [BRUNO];

    await user.press(within(cardOf("Ana Souza")).getByRole("button", { name: "Enrol" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
    await waitFor(() => expect(screen.queryByText("Ana Souza")).toBeNull());
    expect(screen.getByText("Bruno Lima")).toBeOnTheScreen();
  });

  it("closes the sheet and reloads when a denial finds the request already decided", async () => {
    const user = userEvent.setup();
    const state = serve([surfClass()], {
      "POST /enrolments/r-ana/deny": () => respond(409, { errors: ["enrolment.notPending"] }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");
    state.classes[0]!.requests = [BRUNO];

    await user.press(within(cardOf("Ana Souza")).getByRole("button", { name: "Deny" }));
    await user.press(screen.getByRole("button", { name: "Deny and notify" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("This request was already decided."));
    await waitFor(() => expect(screen.queryByText("Deny enrolment?")).toBeNull());
    expect(screen.queryByText("Ana Souza")).toBeNull();
  });

  it("shows the generic toast and keeps the card on another error", async () => {
    const user = userEvent.setup();
    serve([surfClass()], {
      "POST /enrolments/r-ana/approve": () => respond(500, { errors: ["INTERNAL_SERVER_ERROR"] }),
    });
    await renderScreen();
    await screen.findByText("Ana Souza");

    await user.press(within(cardOf("Ana Souza")).getByRole("button", { name: "Enrol" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(
      within(cardOf("Ana Souza")).getByRole("button", { name: "Enrol" }).props.accessibilityState.disabled,
    ).toBe(false);
  });
});

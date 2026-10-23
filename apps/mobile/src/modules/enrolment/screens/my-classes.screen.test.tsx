import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import {
  buildClassItem,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";
import type { ClassItem } from "@/modules/classes/classes.types";
import i18n from "@/i18n";
import { SessionExpiredError } from "@/services/api";
import * as api from "@/services/api";

import type { EnrolmentStatus } from "../enrolment.types";

import { MyClassesScreen } from "./my-classes.screen";

// The callback the screen gave `useFocusEffect`, run by a test when the tab is focused; its cleanup when it is left.
let focusEffect: () => (() => void) | void = () => undefined;

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => (() => void) | void) => {
    focusEffect = effect;
  },
  // Renders the screen's header title and right button so the tests can see them.
  Stack: {
    Screen: ({ options }: any) => (
      <>
        {options.unstable_headerLeftItems?.({})[0].element ??
          options.headerTitle()}
        {options.headerRight?.()}
      </>
    ),
  },
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

// Thursday 2026-10-15, 09:30 in Fortaleza.
const NOW = new Date("2026-10-15T12:30:00.000Z");

const withStatus = (
  id: string,
  startsAt: string,
  endsAt: string,
  status: EnrolmentStatus,
  overrides: Partial<ClassItem> = {},
) =>
  buildClassItem(id, startsAt, endsAt, {
    myEnrolment: { id: `e-${id}`, status, requestedAt: "2026-10-10T12:00:00.000Z", reason: null },
    ...overrides,
  });

// Under way 09:00–10:00 today, then tomorrow 08:00 and 16:00, then a cancelled class on Saturday 08:00.
const UNDER_WAY = withStatus("c-1", "2026-10-15T12:00:00.000Z", "2026-10-15T13:00:00.000Z", "approved");
const PENDING = withStatus("c-2", "2026-10-16T11:00:00.000Z", "2026-10-16T12:00:00.000Z", "pending");
const WITHDRAWN = withStatus("c-3", "2026-10-16T19:00:00.000Z", "2026-10-16T20:00:00.000Z", "withdrawn");
const CANCELLED = withStatus("c-4", "2026-10-17T11:00:00.000Z", "2026-10-17T12:00:00.000Z", "classCancelled", {
  cancelledAt: "2026-10-14T12:00:00.000Z",
});
const ITEMS = [UNDER_WAY, PENDING, WITHDRAWN, CANCELLED];

const cardOf = (time: string) => screen.getByRole("button", { name: `Surf, ${time}` });

const renderScreen = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <MyClassesScreen />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
};

beforeEach(() => {
  setupSignedInUser();
  (router.push as jest.Mock).mockReset();
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      "nextTick",
      "setImmediate",
      "clearImmediate",
      "setInterval",
      "clearInterval",
      "setTimeout",
      "clearTimeout",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "performance",
      "hrtime",
    ],
  });
  fetchMock.mockResolvedValue(ok({ items: ITEMS }));
});

afterEach(async () => {
  jest.useRealTimers();
  await act(() => i18n.changeLanguage("en-US"));
});

describe("MyClassesScreen", () => {
  it("shows the title, the history button, the chips with All selected and the classes in order", async () => {
    await renderScreen();

    expect(screen.getByRole("header", { name: "MY CLASSES" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "History" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "All" })).toBeSelected();
    await screen.findByText("16:00 – 17:00");
    expect(
      screen
        .getAllByRole("button", { name: /^Surf, / })
        .map((card) => card.props.accessibilityLabel),
    ).toEqual([
      "Surf, 09:00 – 10:00",
      "Surf, 08:00 – 09:00",
      "Surf, 16:00 – 17:00",
      "Surf, 08:00 – 09:00",
    ]);
    expect(within(cardOf("16:00 – 17:00")).getByText("Withdrawn")).toBeOnTheScreen();
    expect(requestedPaths()).toEqual(["/classes/mine"]);
  });

  it("draws each card's own status chip, the clock's chips winning", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");

    expect(within(cardOf("09:00 – 10:00")).getByText("In progress")).toBeOnTheScreen();
    const [pending, cancelled] = screen.getAllByRole("button", { name: "Surf, 08:00 – 09:00" });
    expect(within(pending!).getByText("Pending")).toBeOnTheScreen();
    expect(within(cancelled!).getByText("Cancelled")).toBeOnTheScreen();
  });

  it("shows only the chosen group, each card with its own status, and the empty state for a group without classes", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByText("16:00 – 17:00");

    await user.press(screen.getByRole("button", { name: "Ended" }));

    expect(screen.getByRole("button", { name: "Ended" })).toBeSelected();
    expect(
      screen
        .getAllByRole("button", { name: /^Surf, / })
        .map((card) => card.props.accessibilityLabel),
    ).toEqual(["Surf, 16:00 – 17:00", "Surf, 08:00 – 09:00"]);
    expect(within(cardOf("16:00 – 17:00")).getByText("Withdrawn")).toBeOnTheScreen();
    expect(within(cardOf("08:00 – 09:00")).getByText("Cancelled")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Pending" }));

    expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(1);
    expect(within(cardOf("08:00 – 09:00")).getByText("Pending")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Confirmed" }));

    expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(1);
    expect(within(cardOf("09:00 – 10:00")).getByText("In progress")).toBeOnTheScreen();

    fetchMock.mockResolvedValue(ok({ items: [UNDER_WAY, PENDING] }));
    await act(async () => {
      focusEffect();
    });
    await waitFor(() => expect(requestedPaths()).toHaveLength(2));
    await user.press(screen.getByRole("button", { name: "Ended" }));

    expect(screen.queryAllByRole("button", { name: /^Surf, / })).toHaveLength(0);
    expect(screen.getByText("Nothing here")).toBeOnTheScreen();
    expect(screen.getByText("You have no requests with this status.")).toBeOnTheScreen();
  });

  it("puts the chips back on All when the tab is left", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    let cleanup: (() => void) | void;
    await act(async () => {
      cleanup = focusEffect();
    });
    await user.press(screen.getByRole("button", { name: "Ended" }));
    expect(screen.getByRole("button", { name: "Ended" })).toBeSelected();

    await act(async () => cleanup?.());

    expect(screen.getByRole("button", { name: "All" })).toBeSelected();
    expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(4);
  });

  it("reads the classes again when the tab is focused again", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    fetchMock.mockResolvedValue(ok({ items: [PENDING] }));

    await act(async () => {
      focusEffect();
    });

    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(1));
    expect(requestedPaths()).toEqual(["/classes/mine", "/classes/mine"]);
  });

  it("says when the student has asked for nothing yet", async () => {
    fetchMock.mockResolvedValue(ok({ items: [] }));
    await renderScreen();

    expect(await screen.findByText("Nothing here")).toBeOnTheScreen();
    expect(screen.getByText("You haven't asked for a seat in any class yet.")).toBeOnTheScreen();
  });

  it("opens a class's details and the history", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByText("16:00 – 17:00");

    await user.press(cardOf("16:00 – 17:00"));
    await user.press(screen.getByRole("button", { name: "History" }));

    expect(router.push).toHaveBeenNthCalledWith(1, routes.student.classDetail("c-3"));
    expect(router.push).toHaveBeenNthCalledWith(2, routes.student.myHistory);
  });

  it("shows a spinner while loading, then the error with a retry that loads again", async () => {
    let fail: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (fail = resolve)));
    const user = userEvent.setup();
    await renderScreen();

    expect(screen.getByTestId("my-classes-loading")).toBeOnTheScreen();

    await act(async () => fail(failure(500) as Response));

    expect(await screen.findByText("We couldn't load your classes.")).toBeOnTheScreen();
    expect(screen.queryByText("Nothing here")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
  });

  it("keeps the list when a refetch fails", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    fetchMock.mockResolvedValue(failure(500));

    await act(async () => {
      focusEffect();
    });

    await waitFor(() => expect(requestedPaths()).toHaveLength(2));
    expect(screen.getByText("16:00 – 17:00")).toBeOnTheScreen();
    expect(screen.queryByText("We couldn't load your classes.")).not.toBeOnTheScreen();
  });

  it("shows nothing after an expired session", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(new SessionExpiredError());
    await renderScreen();

    await waitFor(() => expect(screen.queryByTestId("my-classes-loading")).not.toBeOnTheScreen());
    expect(api.apiGet).toHaveBeenCalledWith("/classes/mine", { authenticated: true });
    expect(screen.queryByText("We couldn't load your classes.")).not.toBeOnTheScreen();
    expect(screen.queryByText("Nothing here")).not.toBeOnTheScreen();
  });

  it("reloads on pull-to-refresh", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    fetchMock.mockResolvedValue(ok({ items: [WITHDRAWN] }));

    await act(async () => {
      await screen.getByTestId("my-classes-list").props.refreshControl.props.onRefresh();
    });

    expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(1);
    expect(screen.getByTestId("my-classes-list").props.refreshControl.props.refreshing).toBe(false);
  });

  it("is translated into Portuguese", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    fetchMock.mockResolvedValue(ok({ items: [] }));
    await renderScreen();

    expect(screen.getByRole("header", { name: "MINHAS AULAS" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Todas" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Encerradas" })).toBeOnTheScreen();
    expect(await screen.findByText("Nada por aqui")).toBeOnTheScreen();
    expect(screen.getByText("Você ainda não pediu vaga em nenhuma aula.")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Encerradas" }));
    expect(screen.getByText("Você não tem pedidos com este status.")).toBeOnTheScreen();
  });

  it("is translated into Spanish", async () => {
    await act(() => i18n.changeLanguage("es-ES"));
    fetchMock.mockResolvedValue(ok({ items: [] }));
    await renderScreen();

    expect(screen.getByRole("header", { name: "MIS CLASES" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Historial" })).toBeOnTheScreen();
    expect(await screen.findByText("Nada por aquí")).toBeOnTheScreen();
  });
});

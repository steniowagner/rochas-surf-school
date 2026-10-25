import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import {
  buildClassItem,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";
import type { ClassItem } from "@/modules/classes/classes.types";
import * as api from "@/services/api";
import { SessionExpiredError } from "@/services/api";

import { MyClassHistoryScreen } from "./my-class-history.screen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // Renders the header title the screen sets, so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => options.headerTitle?.(),
  },
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

// Wednesday 14 October 2026, 10:00 in Fortaleza.
const NOW = new Date("2026-10-14T13:00:00.000Z");

const OCTOBER = "/classes/mine/history?from=2026-10-01&to=2026-10-31";
const SEPTEMBER = "/classes/mine/history?from=2026-09-01&to=2026-09-30";
const NOVEMBER = "/classes/mine/history?from=2026-11-01&to=2026-11-30";

/** A class taken at `hour` UTC (Fortaleza is 3 hours behind) on the day, with three students present. */
const taken = (id: string, day: string, hour = 11): ClassItem =>
  buildClassItem(
    id,
    `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`,
    `${day}T${String(hour + 1).padStart(2, "0")}:00:00.000Z`,
    {
      seatsTaken: 3,
      myEnrolment: { id: `e-${id}`, status: "approved", requestedAt: "2026-09-01T12:00:00.000Z", reason: null },
    },
  );

// Two classes on the 13th, one on the 6th and five on the 2nd, newest first as the API answers.
const OCTOBER_ITEMS = [
  taken("c-13b", "2026-10-13", 18),
  taken("c-13a", "2026-10-13", 11),
  taken("c-06", "2026-10-06"),
  ...["e", "d", "c", "b", "a"].map((suffix, index) => taken(`c-02${suffix}`, "2026-10-02", 20 - index)),
];

/** Answers each period from `periods`, and nothing for any other. */
const serve = (periods: Record<string, ClassItem[]> = { [OCTOBER]: OCTOBER_ITEMS }) =>
  fetchMock.mockImplementation(async (url: string) =>
    ok({ items: periods[String(url).replace("http://api.test", "")] ?? [] }),
  );

const rowKeys = () =>
  (screen.getByTestId("my-history-list").props.data as { key: string }[]).map((row) => row.key);

const day = (date: string) => screen.getByTestId(`calendar-day-${date}`);

const press = async (name: string) => {
  const user = userEvent.setup();

  await user.press(screen.getByRole("button", { name }));
};

const pressDay = async (date: string) => {
  const user = userEvent.setup();

  await user.press(day(date));
};

const renderScreen = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MyClassHistoryScreen />
    </QueryClientProvider>,
  );
};

/** Renders the screen and waits for October's classes. */
const renderLoaded = async () => {
  const view = await renderScreen();
  await screen.findByRole("header", { name: "TUE, 13 OCT" });

  return view;
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
  serve();
});

afterEach(async () => {
  jest.useRealTimers();
  await act(() => i18n.changeLanguage("en-US"));
});

describe("MyClassHistoryScreen", () => {
  it("opens on the current month with no day selected, the legend, and loads that month", async () => {
    await renderLoaded();

    expect(screen.getByText("PAST CLASSES")).toBeOnTheScreen();
    // In the pill and at the right of the list's title.
    expect(screen.getAllByText("OCTOBER 2026")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Show the week" })).toBeExpanded();
    expect(screen.getByText("Days you took a class")).toBeOnTheScreen();
    expect(
      screen.queryAllByTestId(/^calendar-day-\d{4}-\d{2}-\d{2}$/).filter((node) => node.props.accessibilityState?.selected),
    ).toHaveLength(0);
    expect(requestedPaths()).toEqual([OCTOBER]);
  });

  it("shows a single dot on each day with one or more classes taken", async () => {
    await renderLoaded();

    expect(screen.queryAllByTestId("calendar-day-2026-10-13-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId("calendar-day-2026-10-06-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId("calendar-day-2026-10-02-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(3);
    expect(screen.getByLabelText("Tuesday, October 13th, 2026, you took a class")).toBeOnTheScreen();
  });

  it("lists the classes under a label per day, newest first, below the title and the period", async () => {
    await renderLoaded();

    expect(screen.getByRole("header", { name: "All classes" })).toBeOnTheScreen();
    expect(screen.getAllByText("OCTOBER 2026")).toHaveLength(2);
    expect(rowKeys()).toEqual([
      "day-2026-10-13",
      "c-13b",
      "c-13a",
      "day-2026-10-06",
      "c-06",
      "day-2026-10-02",
      "c-02e",
      "c-02d",
      "c-02c",
      "c-02b",
      "c-02a",
    ]);
    expect(screen.getByRole("header", { name: "TUE, 6 OCT" })).toBeOnTheScreen();
    expect(screen.getAllByText("3 students present").length).toBeGreaterThan(0);
  });

  it("opens a class's details", async () => {
    const user = userEvent.setup();
    serve({ [OCTOBER]: [taken("c-06", "2026-10-06")] });
    await renderScreen();

    await user.press(await screen.findByRole("button", { name: "Surf, 08:00 – 09:00" }));

    expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-06"));
  });

  it("loads the month the arrows move to", async () => {
    serve({ [OCTOBER]: OCTOBER_ITEMS, [SEPTEMBER]: [taken("c-sep", "2026-09-20")] });
    await renderLoaded();

    await press("Show the previous month");

    expect(await screen.findByRole("header", { name: "SUN, 20 SEP" })).toBeOnTheScreen();
    expect(screen.getAllByText("SEPTEMBER 2026")).toHaveLength(2);
    expect(rowKeys()).toEqual(["day-2026-09-20", "c-sep"]);
    expect(requestedPaths()).toEqual([OCTOBER, SEPTEMBER]);
  });

  it("loads the week and back the month when the pill switches view", async () => {
    serve({ [OCTOBER]: OCTOBER_ITEMS, "/classes/mine/history?from=2026-10-12&to=2026-10-18": OCTOBER_ITEMS.slice(0, 2) });
    await renderLoaded();

    await press("Show the week");

    await waitFor(() => expect(rowKeys()).toEqual(["day-2026-10-13", "c-13b", "c-13a"]));
    expect(screen.getAllByText("12 – 18 OCT")).toHaveLength(2);

    await press("Show the next week");

    await waitFor(() =>
      expect(requestedPaths()).toContain("/classes/mine/history?from=2026-10-19&to=2026-10-25"),
    );

    // October is cached: it shows at once, while it is fetched again in the background.
    fetchMock.mockReturnValue(new Promise<Response>(() => undefined));
    await press("Show the month");

    expect(rowKeys()).toHaveLength(11);
    expect(screen.queryByLabelText("Loading the classes")).not.toBeOnTheScreen();
  });

  it("narrows the list to a picked day with its chip, and the chip or the day again shows the period", async () => {
    await renderLoaded();

    await pressDay("2026-10-13");

    expect(day("2026-10-13")).toBeSelected();
    expect(rowKeys()).toEqual(["day-2026-10-13", "c-13b", "c-13a"]);
    expect(screen.getByText("13 OCT")).toBeOnTheScreen();
    expect(screen.getAllByText("OCTOBER 2026")).toHaveLength(1);

    await press("Clear 13 OCT");

    expect(day("2026-10-13")).not.toBeSelected();
    expect(rowKeys()).toHaveLength(11);
    expect(screen.getAllByText("OCTOBER 2026")).toHaveLength(2);

    await pressDay("2026-10-06");
    await pressDay("2026-10-06");

    expect(day("2026-10-06")).not.toBeSelected();
    expect(rowKeys()).toHaveLength(11);
    expect(requestedPaths()).toEqual([OCTOBER]);
  });

  it("opens the month of a faded day with that day selected", async () => {
    serve({ [OCTOBER]: OCTOBER_ITEMS, [NOVEMBER]: [taken("c-nov", "2026-11-01")] });
    await renderLoaded();

    await pressDay("2026-11-01");

    expect(await screen.findByRole("header", { name: "SUN, 1 NOV" })).toBeOnTheScreen();
    expect(day("2026-11-01")).toBeSelected();
    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(screen.getByText("1 NOV")).toBeOnTheScreen();
  });

  it("clears the day when an arrow moves the period, and keeps it when the view switches", async () => {
    await renderLoaded();

    await pressDay("2026-10-06");
    await press("Show the week");

    expect(day("2026-10-06")).toBeSelected();
    expect(screen.getByText("6 OCT")).toBeOnTheScreen();
    expect(screen.getByText("5 – 11 OCT")).toBeOnTheScreen();

    await press("Show the next week");

    expect(day("2026-10-13")).not.toBeSelected();
    expect(screen.queryByText("6 OCT")).not.toBeOnTheScreen();
  });

  it("says when the picked day has no classes", async () => {
    await renderLoaded();

    await pressDay("2026-10-20");

    expect(screen.getByRole("header", { name: "No classes this day" })).toBeOnTheScreen();
    expect(screen.getByText("You didn't take any class this day.")).toBeOnTheScreen();
    expect(screen.getByText("Days you took a class")).toBeOnTheScreen();
  });

  it("says when the period has no classes, under the calendar and the legend", async () => {
    serve({});
    await renderScreen();

    expect(await screen.findByRole("header", { name: "No classes in this period" })).toBeOnTheScreen();
    expect(screen.getByText("You didn't take any class in this period.")).toBeOnTheScreen();
    expect(screen.getByTestId("my-history-calendar")).toBeOnTheScreen();
    expect(screen.getByText("Days you took a class")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeOnTheScreen();
  });

  it("shows the skeleton as one loading state while a period loads, never the previous period's classes", async () => {
    let answer: (value: Response) => void = () => undefined;
    await renderLoaded();
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));

    await press("Show the next month");

    expect(screen.getByLabelText("Loading the classes")).toBeOnTheScreen();
    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(3);
    expect(rowKeys()).toEqual([]);
    expect(screen.getByText("Days you took a class")).toBeOnTheScreen();

    await act(async () => answer(ok({ items: [] }) as Response));

    expect(await screen.findByRole("header", { name: "No classes in this period" })).toBeOnTheScreen();
    expect(screen.queryByLabelText("Loading the classes")).not.toBeOnTheScreen();
  });

  it("shows the error with no dots, and its retry reloads the period with the button's spinner", async () => {
    let answer: (value: Response) => void = () => undefined;
    fetchMock.mockResolvedValueOnce(failure(500));
    await renderScreen();

    expect(await screen.findByRole("header", { name: "Something went wrong" })).toBeOnTheScreen();
    expect(
      screen.getByText("We couldn't load your history. Check your connection and try again."),
    ).toBeOnTheScreen();
    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(0);
    expect(screen.getByText("Days you took a class")).toBeOnTheScreen();

    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));
    await press("Try again");

    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
    expect(screen.queryByLabelText("Loading the classes")).not.toBeOnTheScreen();

    await act(async () => answer(ok({ items: OCTOBER_ITEMS }) as Response));

    expect(await screen.findByRole("header", { name: "TUE, 13 OCT" })).toBeOnTheScreen();
    expect(requestedPaths()).toEqual([OCTOBER, OCTOBER]);
  });

  it("shows none of the states after an expired session", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(new SessionExpiredError());
    await renderScreen();

    await waitFor(() => expect(screen.queryByLabelText("Loading the classes")).not.toBeOnTheScreen());
    expect(screen.queryByRole("header", { name: "Something went wrong" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "No classes in this period" })).not.toBeOnTheScreen();
    expect(screen.getByTestId("my-history-calendar")).toBeOnTheScreen();
  });

  it("reloads the period on pull-to-refresh with its own spinner, and keeps the classes when it fails", async () => {
    await renderLoaded();
    const list = () => screen.getByTestId("my-history-list");
    let answer: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));
    let refreshing: Promise<void> = Promise.resolve();

    await act(async () => {
      refreshing = list().props.refreshControl.props.onRefresh();
    });

    expect(list().props.refreshControl.props.refreshing).toBe(true);

    await act(async () => {
      answer(ok({ items: [taken("c-06", "2026-10-06")] }) as Response);
      await refreshing;
    });

    expect(rowKeys()).toEqual(["day-2026-10-06", "c-06"]);
    expect(list().props.refreshControl.props.refreshing).toBe(false);

    fetchMock.mockResolvedValueOnce(failure(500));
    await act(async () => {
      await list().props.refreshControl.props.onRefresh();
    });

    expect(rowKeys()).toEqual(["day-2026-10-06", "c-06"]);
    expect(screen.queryByRole("header", { name: "Something went wrong" })).not.toBeOnTheScreen();
    expect(requestedPaths()).toEqual([OCTOBER, OCTOBER, OCTOBER]);
  });

  it("is translated into Portuguese and Spanish", async () => {
    serve({});
    await act(() => i18n.changeLanguage("pt-BR"));
    const view = await renderScreen();

    expect(await screen.findByRole("header", { name: "Sem aulas neste período" })).toBeOnTheScreen();
    expect(screen.getByText("Você não fez nenhuma aula neste período.")).toBeOnTheScreen();
    expect(screen.getAllByText("OUTUBRO 2026")).toHaveLength(2);
    expect(screen.getByText("Dias em que você fez aula")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Todas as aulas" })).toBeOnTheScreen();

    await pressDay("2026-10-14");

    expect(screen.getByRole("header", { name: "Sem aulas neste dia" })).toBeOnTheScreen();
    expect(screen.getByText("Você não fez nenhuma aula neste dia.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Limpar 14 OUT" })).toBeOnTheScreen();

    await view.unmount();
    await act(() => i18n.changeLanguage("es-ES"));
    await renderScreen();

    expect(await screen.findByRole("header", { name: "Sin clases en este período" })).toBeOnTheScreen();
    expect(screen.getByText("Días en que hiciste clase")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Todas las clases" })).toBeOnTheScreen();
  });

  it("labels the days and shows the error in Portuguese", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    const view = await renderScreen();

    expect(await screen.findByRole("header", { name: "TER, 13 OUT" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "SEX, 2 OUT" })).toBeOnTheScreen();

    await view.unmount();
    fetchMock.mockResolvedValueOnce(failure(500));
    await renderScreen();

    expect(await screen.findByRole("header", { name: "Algo deu errado" })).toBeOnTheScreen();
    expect(
      screen.getByText("Não conseguimos carregar seu histórico. Verifique sua conexão e tente novamente."),
    ).toBeOnTheScreen();
  });
});

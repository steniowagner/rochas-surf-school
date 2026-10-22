import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import * as api from "@/services/api";

import type { ClassItem } from "../classes.types";
import {
  fetchMock,
  glyph,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { ClassesWeekScreen } from "./classes-week.screen";

// The callback the screen gave `useFocusEffect`, run by a test when the screen is focused again.
let focusEffect: () => void = () => undefined;

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useFocusEffect: (effect: () => void) => {
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

// Wednesday 2026-10-14, 10:15 in Fortaleza.
const NOW = new Date("2026-10-14T13:15:00.000Z");
const THIS_MONDAY = "2026-10-12";

const makeClass = (
  id: string,
  startsAt: string,
  endsAt: string,
  overrides: Partial<ClassItem> = {},
): ClassItem => ({
  id,
  discipline: "surf",
  level: "beginner",
  startsAt,
  endsAt,
  capacity: 8,
  notes: null,
  cancelledAt: null,
  cancellationMessage: null,
  cancellationDeadline: "2026-10-13T20:00:00.000Z",
  location: {
    id: "l-1",
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 1000",
    latitude: -3.7442,
    longitude: -38.4617,
  },
  instructors: [{ id: "i-1", name: "Ana" }],
  seatsTaken: 0,
  students: [],
  guests: [],
  myEnrolment: null,
  ...overrides,
});

// Today's three classes (Fortaleza 08:00–09:00, 10:00–11:30, 16:00–17:00).
const FINISHED = makeClass("c-1", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z");
const STARTED = makeClass("c-2", "2026-10-14T13:00:00.000Z", "2026-10-14T14:30:00.000Z", {
  discipline: "skate",
});
const LATER = makeClass("c-3", "2026-10-14T19:00:00.000Z", "2026-10-14T20:00:00.000Z");

const serveWeeks = (weeks: Record<string, ClassItem[]> = { [THIS_MONDAY]: [FINISHED, STARTED, LATER] }) =>
  fetchMock.mockImplementation(async (url: string) => {
    const weekStart = new URL(String(url)).searchParams.get("date") as string;

    return ok({ weekStart, items: weeks[weekStart] ?? [] });
  });

const openClass = (id: string) => ({ pathname: "/student/class/[id]", params: { id } });

const renderScreen = async (props: Partial<Parameters<typeof ClassesWeekScreen>[0]> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <ClassesWeekScreen titleKey="tabs.classes" classRoute={openClass as never} {...props} />
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
  serveWeeks();
});

afterEach(() => jest.useRealTimers());

describe("ClassesWeekScreen", () => {
  it("opens on the week view with today selected", async () => {
    await renderScreen();

    expect(screen.getByText("CLASSES")).toBeOnTheScreen();
    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the month" })).toBeOnTheScreen();
    expect(screen.queryByText("This week")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("calendar-day-2026-11-01")).not.toBeOnTheScreen();
    expect(screen.getByTestId("calendar-day-2026-10-14")).toBeSelected();
    expect(await screen.findByText("08:00 – 09:00")).toBeOnTheScreen();
    expect(screen.getByText("10:00 – 11:30")).toBeOnTheScreen();
    expect(screen.getByText("16:00 – 17:00")).toBeOnTheScreen();
    expect(screen.queryByText("Wednesday · 14 Oct")).not.toBeOnTheScreen();
    expect(screen.queryByText("3 classes")).not.toBeOnTheScreen();
    expect(requestedPaths()).toEqual([`/classes?date=${THIS_MONDAY}`]);
  });

  it("uses the title it is given", async () => {
    await renderScreen({ titleKey: "tabs.agenda" });
    await screen.findByText("16:00 – 17:00");

    expect(screen.getByText("SCHEDULE")).toBeOnTheScreen();
  });

  it("shows each card's state from the phone's clock", async () => {
    await renderScreen();

    expect(await screen.findByText("In progress")).toBeOnTheScreen();
    expect(screen.getAllByText("Finished")).toHaveLength(1);
  });

  it("moves to the next and previous weeks keeping the weekday", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByText("16:00 – 17:00");

    await user.press(screen.getByRole("button", { name: "Show the next week" }));

    expect(await screen.findByText("19 – 25 OCT")).toBeOnTheScreen();
    expect(screen.getByTestId("calendar-day-2026-10-21")).toBeSelected();
    expect(requestedPaths()).toContain("/classes?date=2026-10-19");
    expect(screen.queryByText("Today")).not.toBeOnTheScreen();
    expect(screen.queryByText("Next week")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Show the previous week" }));
    await user.press(screen.getByRole("button", { name: "Show the previous week" }));

    expect(await screen.findByText("5 – 11 OCT")).toBeOnTheScreen();
    expect(screen.getByTestId("calendar-day-2026-10-07")).toBeSelected();
  });

  it("shows one dot per day with classes", async () => {
    const five = Array.from({ length: 5 }, (_, index) =>
      makeClass(`f-${index}`, "2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"),
    );
    serveWeeks({ [THIS_MONDAY]: [FINISHED, STARTED, ...five] });
    await renderScreen();
    await screen.findByText("08:00 – 09:00");

    expect(await screen.findAllByTestId("calendar-day-2026-10-14-dot")).toHaveLength(1);
    expect(screen.getAllByTestId("calendar-day-2026-10-15-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId("calendar-day-2026-10-16-dot")).toHaveLength(0);
    expect(screen.getByLabelText("Thursday, October 15th, 2026, with classes")).toBeOnTheScreen();
  });

  it("shows another day's cards", async () => {
    const user = userEvent.setup();
    serveWeeks({
      [THIS_MONDAY]: [
        FINISHED,
        makeClass("c-9", "2026-10-15T12:00:00.000Z", "2026-10-15T13:00:00.000Z"),
      ],
    });
    await renderScreen();
    await screen.findByText("08:00 – 09:00");

    await user.press(screen.getByTestId("calendar-day-2026-10-15"));

    expect(screen.getByText("09:00 – 10:00")).toBeOnTheScreen();
    expect(screen.queryByText("08:00 – 09:00")).not.toBeOnTheScreen();
  });

  it("opens the class details when a card is pressed", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByText("16:00 – 17:00"));

    expect(router.push).toHaveBeenCalledWith(openClass("c-3"));
  });

  it("updates a card's state as the clock passes its start", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-14T18:59:00.000Z") });
    await renderScreen();
    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
    expect(screen.getAllByText("Finished")).toHaveLength(2);
    expect(screen.queryAllByText("In progress")).toHaveLength(0);

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getAllByText("In progress")).toHaveLength(1);
    expect(screen.getAllByText("Finished")).toHaveLength(2);
  });

  it("shows the loading state", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await renderScreen();

    expect(screen.getByTestId("classes-week-loading")).toBeOnTheScreen();
  });

  it("shows the error and retries", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ errors: [] }) });
    await renderScreen();

    expect(await screen.findByText("Couldn't load the classes.")).toBeOnTheScreen();

    serveWeeks();
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load the classes.")).not.toBeOnTheScreen();
  });

  it("keeps the calendar when the week fails to load", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ errors: [] }) });
    await renderScreen();

    expect(await screen.findByText("Couldn't load the classes.")).toBeOnTheScreen();
    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
    expect(screen.getByText("WED")).toBeOnTheScreen();
    expect(screen.getByTestId("calendar-day-2026-10-14")).toBeSelected();

    await user.press(screen.getByTestId("calendar-day-2026-10-16"));

    expect(screen.getByTestId("calendar-day-2026-10-16")).toBeSelected();
    expect(screen.getByText("Couldn't load the classes.")).toBeOnTheScreen();
  });

  it("shows no error state when the session expired", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(new api.SessionExpiredError());
    const { queryClient } = await renderScreen();

    await waitFor(() =>
      expect(queryClient.getQueryState(["classes", "week", THIS_MONDAY])?.status).toBe("error"),
    );

    expect(screen.queryByText("Couldn't load the classes.")).not.toBeOnTheScreen();
  });

  it("shows an empty day, with the selected date and no button for a student", async () => {
    serveWeeks({ [THIS_MONDAY]: [] });
    await renderScreen();

    expect(await screen.findByRole("header", { name: "No classes this day" })).toBeOnTheScreen();
    expect(
      screen.getByText("There are no classes scheduled for Wednesday, October 14 yet."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Create class" })).not.toBeOnTheScreen();
  });

  it("shows the empty day in pt-BR", async () => {
    await i18n.changeLanguage("pt-BR");
    const user = userEvent.setup();
    serveWeeks({ [THIS_MONDAY]: [] });
    await renderScreen();
    await screen.findByRole("header", { name: "Sem aulas neste dia" });

    await user.press(screen.getByTestId("calendar-day-2026-10-17"));

    expect(
      screen.getByText("Ainda não há aulas marcadas para sábado, 17 de outubro."),
    ).toBeOnTheScreen();
  });

  it("selecting a day in the month keeps the month and shows that day's classes", async () => {
    const user = userEvent.setup();
    serveWeeks({
      [THIS_MONDAY]: [FINISHED],
      "2026-10-19": [makeClass("c-20", "2026-10-20T12:00:00.000Z", "2026-10-20T13:00:00.000Z")],
    });
    await renderScreen();
    await screen.findByText("08:00 – 09:00");
    await user.press(screen.getByRole("button", { name: "Show the month" }));

    await user.press(screen.getByTestId("calendar-day-2026-10-20"));

    expect(screen.getByTestId("calendar-day-2026-10-20")).toBeSelected();
    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the week" })).toBeOnTheScreen();
    expect(await screen.findByText("09:00 – 10:00")).toBeOnTheScreen();
    expect(screen.queryByText("08:00 – 09:00")).not.toBeOnTheScreen();
  });

  it("month view loads its weeks", async () => {
    const user = userEvent.setup();
    serveWeeks({
      [THIS_MONDAY]: [FINISHED],
      "2026-09-28": [makeClass("c-s", "2026-09-30T11:00:00.000Z", "2026-09-30T12:00:00.000Z")],
      "2026-10-26": [makeClass("c-n", "2026-11-01T11:00:00.000Z", "2026-11-01T12:00:00.000Z")],
    });
    await renderScreen();
    await screen.findByText("08:00 – 09:00");
    expect(requestedPaths()).toEqual([`/classes?date=${THIS_MONDAY}`]);

    await user.press(screen.getByRole("button", { name: "Show the month" }));

    await waitFor(() => expect(requestedPaths()).toHaveLength(5));
    expect(requestedPaths().slice(1).sort()).toEqual([
      "/classes?date=2026-09-28",
      "/classes?date=2026-10-05",
      "/classes?date=2026-10-19",
      "/classes?date=2026-10-26",
    ]);
    expect(await screen.findByTestId("calendar-day-2026-09-30-dot")).toBeOnTheScreen();
    expect(screen.getByTestId("calendar-day-2026-11-01-dot")).toBeOnTheScreen();
    expect(screen.getByTestId("calendar-day-2026-10-14-dot")).toBeOnTheScreen();
    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(3);
  });

  it("shows no message when another visible week fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => {
      const weekStart = new URL(String(url)).searchParams.get("date") as string;

      return weekStart === "2026-10-19"
        ? { ok: false, status: 500, json: async () => ({ errors: [] }) }
        : ok({ weekStart, items: weekStart === THIS_MONDAY ? [FINISHED] : [] });
    });
    await renderScreen();
    await screen.findByText("08:00 – 09:00");

    await user.press(screen.getByRole("button", { name: "Show the month" }));
    await waitFor(() => expect(requestedPaths()).toHaveLength(5));

    expect(screen.queryByText("Couldn't load the classes.")).not.toBeOnTheScreen();
    expect(screen.getByText("08:00 – 09:00")).toBeOnTheScreen();
    expect(screen.queryAllByTestId("calendar-day-2026-10-20-dot")).toHaveLength(0);
  });

  it("doesn't show the pull-to-refresh spinner when the month refetches cached weeks", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    await user.press(screen.getByRole("button", { name: "Show the month" }));
    await waitFor(() => expect(requestedPaths()).toHaveLength(5));
    await user.press(screen.getByRole("button", { name: "Show the week" }));
    await user.press(screen.getByRole("button", { name: "Show the next week" }));
    await user.press(screen.getByRole("button", { name: "Show the previous week" }));
    const before = fetchMock.mock.calls.length;
    fetchMock.mockReturnValue(new Promise(() => undefined));

    await user.press(screen.getByRole("button", { name: "Show the month" }));

    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(before));
    expect(screen.getByTestId("classes-week-list").props.refreshControl.props.refreshing).toBe(false);
  });

  it("shows the pull-to-refresh spinner only while the user's refresh runs", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    let release: () => void = () => {};
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(ok({ weekStart: THIS_MONDAY, items: [] }));
        }),
    );

    await act(async () => {
      screen.getByTestId("classes-week-list").props.refreshControl.props.onRefresh();
    });

    expect(screen.getByTestId("classes-week-list").props.refreshControl.props.refreshing).toBe(true);

    await act(async () => release());

    await waitFor(() =>
      expect(screen.getByTestId("classes-week-list").props.refreshControl.props.refreshing).toBe(false),
    );
  });

  it("refetches every visible week when pulled in the month view", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    await user.press(screen.getByRole("button", { name: "Show the month" }));
    await waitFor(() => expect(requestedPaths()).toHaveLength(5));
    const before = fetchMock.mock.calls.length;

    await act(async () => {
      screen.getByTestId("classes-week-list").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(before + 5));
  });

  it("refetches the week when pulled", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");
    const before = fetchMock.mock.calls.length;

    await act(async () => {
      screen.getByTestId("classes-week-list").props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(fetchMock.mock.calls.length).toBe(before + 1));
  });
});

describe("ClassesWeekScreen admin entry points", () => {
  it("offers them on today and later", async () => {
    const user = userEvent.setup();
    await renderScreen({ canCreate: true });

    await screen.findByText("16:00 – 17:00");
    expect(screen.getByRole("button", { name: "New class" })).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "New class" }));
    expect(router.push).toHaveBeenLastCalledWith(routes.admin.newClass({ date: "2026-10-14" }));

    await user.press(screen.getByTestId("calendar-day-2026-10-17"));
    await user.press(screen.getByRole("button", { name: "Create class" }));
    expect(router.push).toHaveBeenLastCalledWith(routes.admin.newClass({ date: "2026-10-17" }));
  });

  it("offers no entry point on a past day, and offers them again back on today", async () => {
    const user = userEvent.setup();
    await renderScreen({ canCreate: true });
    await screen.findByText("16:00 – 17:00");

    await user.press(screen.getByTestId("calendar-day-2026-10-13"));

    expect(screen.queryByRole("button", { name: "New class" })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Create class" })).not.toBeOnTheScreen();

    await user.press(screen.getByTestId("calendar-day-2026-10-14"));

    expect(screen.getByRole("button", { name: "New class" })).toBeOnTheScreen();
  });

  it("offers no entry point without canCreate", async () => {
    await renderScreen();
    await screen.findByText("16:00 – 17:00");

    expect(screen.queryByRole("button", { name: "New class" })).not.toBeOnTheScreen();
  });

  it("fetches an invalidated week when the screen is focused again, so a cancelled class shows at once", async () => {
    const { queryClient } = await renderScreen();
    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
    expect(screen.queryByText("Cancelled")).not.toBeOnTheScreen();

    // Another screen cancelled the class: its week is invalidated, but nothing here refetched it (refetchType none).
    serveWeeks({
      [THIS_MONDAY]: [
        FINISHED,
        STARTED,
        { ...LATER, cancelledAt: "2026-10-14T13:00:00.000Z", cancellationMessage: null },
      ],
    });
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ["classes"], refetchType: "none" });
    });
    await act(async () => focusEffect());

    expect(await screen.findByText("Cancelled")).toBeOnTheScreen();
  });

  it("does not fetch anything when focused with nothing invalidated", async () => {
    await renderScreen();
    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calls = fetchMock.mock.calls.length;

    await act(async () => focusEffect());

    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});

describe("ClassesWeekScreen no instructor", () => {
  const ALONE = makeClass("c-4", "2026-10-14T19:00:00.000Z", "2026-10-14T20:00:00.000Z", {
    instructors: [],
  });

  it("shows the no instructor chip to admins (showFlags)", async () => {
    serveWeeks({ [THIS_MONDAY]: [ALONE] });
    await renderScreen({ showFlags: true });

    expect(await screen.findAllByText("No instructor")).toHaveLength(1);
    expect(screen.getByText(glyph("person-remove-outline"))).toBeOnTheScreen();
  });

  it("shows nothing about it without showFlags", async () => {
    serveWeeks({ [THIS_MONDAY]: [ALONE] });
    await renderScreen();

    expect(await screen.findByText("No students yet")).toBeOnTheScreen();
    expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
    expect(screen.queryByText(glyph("person-remove-outline"))).not.toBeOnTheScreen();
  });
});

describe("ClassesWeekScreen enrolment chip", () => {
  const MINE = makeClass("c-5", "2026-10-14T19:00:00.000Z", "2026-10-14T20:00:00.000Z", {
    myEnrolment: { id: "e-1", status: "pending", requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
  });

  it("shows the viewer's enrolment chip on the cards with showEnrolment", async () => {
    serveWeeks({ [THIS_MONDAY]: [MINE] });
    await renderScreen({ showEnrolment: true });

    expect(await screen.findByText("Pending")).toBeOnTheScreen();
  });

  it("shows nothing about it without showEnrolment", async () => {
    serveWeeks({ [THIS_MONDAY]: [MINE] });
    await renderScreen();

    expect(await screen.findByText("No students yet")).toBeOnTheScreen();
    expect(screen.queryByText("Pending")).not.toBeOnTheScreen();
  });
});

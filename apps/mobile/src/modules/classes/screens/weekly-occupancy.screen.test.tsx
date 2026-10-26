import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { SessionExpiredError } from "@/services/api";
import * as api from "@/services/api";

import {
  buildClassItem,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";
import type { ClassItem } from "../classes.types";
import { WeeklyOccupancyScreen } from "./weekly-occupancy.screen";

// The options the screen gave its Stack header.
let headerOptions: any = {};
// The callback the screen gave `useFocusEffect`, run by a test when the screen is focused.
let focusEffect: () => (() => void) | void = () => undefined;
// The clock `useNow` answers.
let mockNow = new Date();

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => (() => void) | void) => {
    focusEffect = effect;
  },
  Stack: {
    Screen: ({ options }: any) => {
      headerOptions = options;

      return <>{options.headerTitle()}</>;
    },
  },
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

jest.mock("../hooks/use-now.hook", () => ({ useNow: () => mockNow }));

// Wednesday 21 Oct 2026, 10:00 in Fortaleza (UTC−3).
const NOW = new Date("2026-10-21T13:00:00.000Z");
const CANCELLED_AT = "2026-10-20T12:00:00.000Z";

// Monday 08:00 is 11:00Z, Friday and Saturday 16:00 are 19:00Z.
const A = buildClassItem(
  "A",
  "2026-10-19T11:00:00.000Z",
  "2026-10-19T12:00:00.000Z",
  { seatsTaken: 3, capacity: 10 },
);
const B = buildClassItem(
  "B",
  "2026-10-19T11:00:00.000Z",
  "2026-10-19T12:30:00.000Z",
  {
    discipline: "skate",
    seatsTaken: 4,
    capacity: 4,
  },
);
const C = buildClassItem(
  "C",
  "2026-10-21T11:00:00.000Z",
  "2026-10-21T13:00:00.000Z",
  { seatsTaken: 6, capacity: 10 },
);
const D = buildClassItem(
  "D",
  "2026-10-23T19:00:00.000Z",
  "2026-10-23T20:00:00.000Z",
  { seatsTaken: 9, capacity: 10 },
);
const E = buildClassItem(
  "E",
  "2026-10-24T19:00:00.000Z",
  "2026-10-24T20:00:00.000Z",
  {
    discipline: "skate",
    seatsTaken: 2,
    capacity: 10,
    cancelledAt: CANCELLED_AT,
  },
);
const WEEK = [A, B, C, D, E];

// What the API answers for each week; a week not listed has no classes.
let weeks: Record<string, ClassItem[]> = {};

const cell = (id: string) => screen.getByTestId(`occupancy-cell-${id}`);
const isSelected = (id: string) =>
  screen
    .getByTestId(`occupancy-cell-box-${id}`)
    .props.className.includes("border-grape");
// The selected class's card, by its time range (A 08:00 – 09:00, C 08:00 – 10:00).
const cardOf = (range: string) =>
  screen.queryByRole("button", { name: `Surf, ${range}` });

const renderScreen = async () => {
  fetchMock.mockImplementation(async (url: string) => {
    const weekStart = String(url).split("date=")[1];

    return ok({ weekStart, items: weeks[weekStart] ?? [] });
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <WeeklyOccupancyScreen />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
};

beforeEach(() => {
  setupSignedInUser();
  (router.push as jest.Mock).mockReset();
  fetchMock.mockReset();
  mockNow = NOW;
  weeks = { "2026-10-19": WEEK };
});

afterEach(async () => {
  await act(() => i18n.changeLanguage("en-US"));
});

// Opens the calendar and picks a day: its week becomes the selected one.
const pickDay = async (
  user: ReturnType<typeof userEvent.setup>,
  date: string,
) => {
  await user.press(screen.getByRole("button", { name: "Choose another week" }));
  await user.press(await screen.findByTestId(`calendar-day-${date}`));
};

describe("WeeklyOccupancyScreen", () => {
  describe("week", () => {
    it("opens on the current week with a centered title and the week bar", async () => {
      await renderScreen();

      expect(await screen.findByTestId("occupancy-cell-A")).toBeOnTheScreen();
      expect(requestedPaths()).toEqual(["/classes?date=2026-10-19"]);
      expect(
        screen.getByRole("header", { name: "WEEKLY OCCUPANCY" }),
      ).toBeOnTheScreen();
      expect(headerOptions.headerTitleAlign).toBe("center");
      expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
      expect(screen.getByText("This week")).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Choose another week" }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Show the next week" }),
      ).not.toBeOnTheScreen();
      expect(screen.getByTestId("occupancy-day-2026-10-19")).toBeOnTheScreen();
    });

    it("makes the scroll view the first view, under the header", async () => {
      await renderScreen();

      const scroll = screen.getByTestId("weekly-occupancy-scroll");
      expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic");
    });

    it("selects the week of the day picked in the calendar and asks for that week", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await pickDay(user, "2026-10-28");

      expect(screen.getByText("26 OCT – 1 NOV")).toBeOnTheScreen();
      expect(screen.getByText("Next week")).toBeOnTheScreen();
      await waitFor(() =>
        expect(requestedPaths()).toContain("/classes?date=2026-10-26"),
      );

      await pickDay(user, "2026-10-14");

      expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
      expect(screen.getByText("Last week")).toBeOnTheScreen();
      await waitFor(() =>
        expect(requestedPaths()).toContain("/classes?date=2026-10-12"),
      );
    });

    it("highlights the whole selected week in the calendar", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await user.press(
        screen.getByRole("button", { name: "Choose another week" }),
      );

      expect(
        (await screen.findByTestId("calendar-week-2026-10-19")).props.className,
      ).toContain("bg-grape-tint");
      expect(
        screen.getByTestId("calendar-week-2026-10-26").props.className,
      ).not.toContain("bg-grape-tint");
    });

    it("dots the days of the calendar that have classes", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await user.press(
        screen.getByRole("button", { name: "Choose another week" }),
      );

      const datesWithClasses = [
        ...new Set(WEEK.map((item) => item.startsAt.slice(0, 10))),
      ];
      expect(datesWithClasses.length).toBeGreaterThan(0);
      for (const date of datesWithClasses) {
        expect(
          await screen.findByTestId(`calendar-day-${date}-dot`),
        ).toBeOnTheScreen();
      }
      expect(
        screen.queryByTestId("calendar-day-2026-10-12-dot"),
      ).not.toBeOnTheScreen();
      // The week picker keeps the dot tucked into the bottom of the day's slot.
      expect(
        screen.getByTestId(`calendar-day-${datesWithClasses[0]}-dot`).parent!
          .props.className,
      ).toContain("-mt-1.5");
    });

    it("counts the weeks from this one in the label", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await user.press(
        screen.getByRole("button", { name: "Choose another week" }),
      );
      await user.press(
        await screen.findByRole("button", { name: "Show the next month" }),
      );
      await user.press(screen.getByTestId("calendar-day-2026-11-04"));
      expect(screen.getByText("In 2 weeks")).toBeOnTheScreen();

      await user.press(
        screen.getByRole("button", { name: "Choose another week" }),
      );
      await user.press(
        await screen.findByRole("button", { name: "Show the previous month" }),
      );
      await user.press(screen.getByTestId("calendar-day-2026-10-07"));
      expect(screen.getByText("2 weeks ago")).toBeOnTheScreen();
    });

    it("shows a week already loaded from the cache, with no loading state", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      await pickDay(user, "2026-10-26");
      await pickDay(user, "2026-10-19");

      expect(screen.getByTestId("occupancy-cell-A")).toBeOnTheScreen();
      expect(
        screen.queryByTestId("occupancy-map-skeleton"),
      ).not.toBeOnTheScreen();
    });

    it("writes the week in Portuguese", async () => {
      await act(() => i18n.changeLanguage("pt-BR"));
      await renderScreen();

      expect(
        screen.getByRole("header", { name: "OCUPAÇÃO SEMANAL" }),
      ).toBeOnTheScreen();
      expect(screen.getByText("19 – 25 OUT")).toBeOnTheScreen();
      expect(screen.getByText("Esta semana")).toBeOnTheScreen();
      expect(await screen.findByTestId("occupancy-cell-A")).toBeOnTheScreen();
    });
  });

  describe("select", () => {
    it("selects the least occupied class and shows its card", async () => {
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      expect(isSelected("A")).toBe(true);
      expect(isSelected("C")).toBe(false);
      expect(cardOf("08:00 – 09:00")).toBeOnTheScreen();
    });

    it("selects the tapped class and opens its details from the card", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await user.press(cell("C"));

      expect(isSelected("C")).toBe(true);
      expect(isSelected("A")).toBe(false);
      expect(cardOf("08:00 – 10:00")).toBeOnTheScreen();
      expect(cardOf("08:00 – 09:00")).not.toBeOnTheScreen();

      await user.press(cardOf("08:00 – 10:00")!);

      expect(router.push).toHaveBeenCalledWith(routes.admin.classDetail("C"));
    });

    it("selects a cancelled class and shows its cancelled card", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await user.press(cell("E"));

      expect(isSelected("E")).toBe(true);
      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
    });

    it("selects the first class when every class of the week is cancelled", async () => {
      weeks = {
        "2026-10-19": [
          { ...A, cancelledAt: CANCELLED_AT },
          { ...C, cancelledAt: CANCELLED_AT },
        ],
      };
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      expect(isSelected("A")).toBe(true);
      expect(isSelected("C")).toBe(false);
      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
    });

    it("selects the week's default again after moving to another week and back", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      await user.press(cell("C"));
      await pickDay(user, "2026-10-26");
      await pickDay(user, "2026-10-19");

      expect(isSelected("A")).toBe(true);
      expect(isSelected("C")).toBe(false);
    });

    it("keeps the selected class on a refetch that still has it, else falls back to the default", async () => {
      const user = userEvent.setup();
      const { queryClient } = await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      await user.press(cell("C"));

      await act(() => queryClient.invalidateQueries());
      expect(isSelected("C")).toBe(true);

      weeks = { "2026-10-19": [A, B, D, E] };
      await act(() => queryClient.invalidateQueries());

      await waitFor(() =>
        expect(screen.queryByTestId("occupancy-cell-C")).not.toBeOnTheScreen(),
      );
      expect(isSelected("A")).toBe(true);
      expect(
        screen
          .getAllByTestId(/^occupancy-cell-box-/)
          .filter((box) => box.props.className.includes("border-grape")),
      ).toHaveLength(1);
    });
  });

  describe("stats", () => {
    const read = (id: string) =>
      screen.getByTestId(`occupancy-stat-${id}`).props.accessibilityLabel;

    it("shows the week's figures between the week bar and the map", async () => {
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      expect(read("occupancy")).toBe("65%, Occupancy");
      expect(read("seats")).toBe("22 of 34 seats");
      expect(read("free")).toBe("12 free");
      expect(read("full")).toBe("1 full");
      expect(screen.getByText("22/34")).toBeOnTheScreen();
    });

    it("puts the stats card after the week bar and before the week map", async () => {
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      const order: string[] = [];
      const walk = (node: unknown) => {
        if (typeof node === "string") {
          order.push(node);
          return;
        }
        const { props, children } = node as {
          props: { testID?: string };
          children: unknown[] | null;
        };
        if (props.testID) {
          order.push(props.testID);
        }
        children?.forEach(walk);
      };
      [screen.toJSON()].flat().forEach(walk);
      const weekBar = order.indexOf("occupancy-week-label");
      const stats = order.indexOf("occupancy-stat-occupancy");
      const map = order.indexOf("occupancy-day-2026-10-19");

      expect(weekBar).toBeGreaterThan(-1);
      expect(stats).toBeGreaterThan(weekBar);
      expect(map).toBeGreaterThan(stats);
    });

    it("shows another week's figures after an arrow", async () => {
      const user = userEvent.setup();
      weeks["2026-10-26"] = [
        buildClassItem(
          "N",
          "2026-10-26T11:00:00.000Z",
          "2026-10-26T12:00:00.000Z",
          {
            seatsTaken: 5,
            capacity: 10,
          },
        ),
      ];
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await pickDay(user, "2026-10-26");

      expect(await screen.findByText("5/10")).toBeOnTheScreen();
      expect(read("occupancy")).toBe("50%, Occupancy");
      expect(read("full")).toBe("0 full");
    });

    it("has the card's skeleton while the week loads", async () => {
      fetchMock.mockReturnValueOnce(new Promise(() => undefined));
      await renderScreen();

      expect(screen.getByTestId("occupancy-stats-skeleton")).toBeOnTheScreen();
      expect(
        screen.queryByTestId("occupancy-stat-seats"),
      ).not.toBeOnTheScreen();
    });

    it("has no card on the error state", async () => {
      fetchMock.mockResolvedValueOnce(failure(500));
      await renderScreen();

      expect(
        await screen.findByText("Couldn't load the occupancy"),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId("occupancy-stat-seats"),
      ).not.toBeOnTheScreen();
    });

    it("has no card on the empty state", async () => {
      weeks = {};
      await renderScreen();

      expect(await screen.findByText("No classes this week")).toBeOnTheScreen();
      expect(
        screen.queryByTestId("occupancy-stat-seats"),
      ).not.toBeOnTheScreen();
    });
  });

  describe("state", () => {
    const pending = () => {
      let settle: (value: unknown) => void = () => undefined;
      const promise = new Promise((resolve) => (settle = resolve));

      return { promise, settle };
    };

    const renderWith = async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      });
      const view = await render(
        <QueryClientProvider client={queryClient}>
          <WeeklyOccupancyScreen />
        </QueryClientProvider>,
      );

      return { ...view, queryClient };
    };

    it("shows the week bar and the skeleton as one loading state while the week loads", async () => {
      const load = pending();
      fetchMock.mockReturnValueOnce(load.promise);
      await renderWith();

      expect(screen.getByLabelText("Loading the occupancy")).toBeOnTheScreen();
      expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();

      await act(async () =>
        load.settle(ok({ weekStart: "2026-10-19", items: WEEK })),
      );

      expect(await screen.findByTestId("occupancy-cell-A")).toBeOnTheScreen();
      expect(
        screen.queryByLabelText("Loading the occupancy"),
      ).not.toBeOnTheScreen();
    });

    it("shows the error with a retry that loads again, and the arrows still move the week", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(failure(500));
      await renderWith();

      expect(
        await screen.findByRole("header", {
          name: "Couldn't load the occupancy",
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("Check your connection and try again."),
      ).toBeOnTheScreen();
      expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
      fetchMock.mockResolvedValue(ok({ weekStart: "2026-10-19", items: WEEK }));

      await user.press(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByTestId("occupancy-cell-A")).toBeOnTheScreen();
      expect(
        screen.queryByRole("header", { name: "Couldn't load the occupancy" }),
      ).not.toBeOnTheScreen();
    });

    it("keeps the error with the button's spinner while Try again loads, not the skeleton", async () => {
      const user = userEvent.setup();
      const retry = pending();
      fetchMock.mockResolvedValueOnce(failure(500));
      await renderWith();
      await screen.findByRole("header", {
        name: "Couldn't load the occupancy",
      });
      fetchMock.mockReturnValueOnce(retry.promise);

      await user.press(screen.getByRole("button", { name: "Try again" }));

      expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
      expect(
        screen.queryByLabelText("Loading the occupancy"),
      ).not.toBeOnTheScreen();

      await act(async () =>
        retry.settle(ok({ weekStart: "2026-10-19", items: WEEK })),
      );

      expect(await screen.findByTestId("occupancy-cell-A")).toBeOnTheScreen();
    });

    it("lets the admin leave a week that fails", async () => {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(failure(500));
      await renderWith();
      await screen.findByRole("header", {
        name: "Couldn't load the occupancy",
      });
      // Tuesday 13 Oct, 08:00.
      const previous = buildClassItem(
        "G",
        "2026-10-13T11:00:00.000Z",
        "2026-10-13T12:00:00.000Z",
      );
      weeks = { "2026-10-12": [previous] };
      fetchMock.mockImplementation(async (url: string) =>
        ok({
          weekStart: "x",
          items: weeks[String(url).split("date=")[1]] ?? [],
        }),
      );

      await pickDay(user, "2026-10-12");

      expect(await screen.findByTestId("occupancy-cell-G")).toBeOnTheScreen();
      expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
    });

    it("shows the empty state, with no map, legend or card, for a week without classes", async () => {
      weeks = {};
      await renderScreen();

      expect(await screen.findByText("No classes this week")).toBeOnTheScreen();
      expect(
        screen.getByText("Classes created for this week show up here."),
      ).toBeOnTheScreen();
      expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
      expect(screen.queryByTestId("occupancy-legend")).not.toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: /^Surf, / }),
      ).not.toBeOnTheScreen();
    });

    it("shows the map, not the empty state, when every class of the week is cancelled", async () => {
      weeks = { "2026-10-19": [{ ...A, cancelledAt: CANCELLED_AT }] };
      await renderScreen();

      expect(await screen.findByTestId("occupancy-cell-A")).toBeOnTheScreen();
      expect(screen.queryByText("No classes this week")).not.toBeOnTheScreen();
    });

    it("keeps the map when a refetch fails", async () => {
      const { queryClient } = await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      fetchMock.mockResolvedValue(failure(500));

      await act(() => queryClient.invalidateQueries());

      expect(screen.getByTestId("occupancy-cell-A")).toBeOnTheScreen();
      expect(
        screen.queryByRole("header", { name: "Couldn't load the occupancy" }),
      ).not.toBeOnTheScreen();
    });

    it("shows nothing after an expired session", async () => {
      (api.apiGet as jest.Mock).mockRejectedValueOnce(
        new SessionExpiredError(),
      );
      await renderScreen();

      await waitFor(() =>
        expect(
          screen.queryByLabelText("Loading the occupancy"),
        ).not.toBeOnTheScreen(),
      );
      expect(api.apiGet).toHaveBeenCalledWith("/classes?date=2026-10-19", {
        authenticated: true,
      });
      expect(
        screen.queryByRole("header", { name: "Couldn't load the occupancy" }),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText("No classes this week")).not.toBeOnTheScreen();
      expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
    });

    it("reads the week again once when the screen is focused again", async () => {
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      weeks = { "2026-10-19": [D] };

      await act(async () => {
        focusEffect();
      });

      await waitFor(() =>
        expect(screen.queryByTestId("occupancy-cell-A")).not.toBeOnTheScreen(),
      );
      expect(screen.getByTestId("occupancy-cell-D")).toBeOnTheScreen();
      expect(requestedPaths()).toEqual([
        "/classes?date=2026-10-19",
        "/classes?date=2026-10-19",
      ]);
    });

    it("does not restart a load already running when the screen is focused", async () => {
      const load = pending();
      fetchMock.mockReturnValueOnce(load.promise);
      await renderWith();

      await act(async () => {
        focusEffect();
      });

      expect(requestedPaths()).toEqual(["/classes?date=2026-10-19"]);
      await act(async () =>
        load.settle(ok({ weekStart: "2026-10-19", items: WEEK })),
      );
    });

    it("reloads on pull-to-refresh and shows the spinner only for the pull", async () => {
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      const control = () =>
        screen.getByTestId("weekly-occupancy-scroll").props.refreshControl
          .props;
      const reload = pending();
      fetchMock.mockReturnValueOnce(reload.promise);

      let pull: Promise<void> = Promise.resolve();
      await act(async () => {
        pull = control().onRefresh();
      });
      expect(control().refreshing).toBe(true);

      await act(async () => {
        reload.settle(ok({ weekStart: "2026-10-19", items: [D] }));
        await pull;
      });

      expect(control().refreshing).toBe(false);
      expect(screen.getByTestId("occupancy-cell-D")).toBeOnTheScreen();
    });

    it("keeps the spinner off while a focus refetch runs", async () => {
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      const reload = pending();
      fetchMock.mockReturnValueOnce(reload.promise);

      await act(async () => {
        focusEffect();
      });

      expect(
        screen.getByTestId("weekly-occupancy-scroll").props.refreshControl.props
          .refreshing,
      ).toBe(false);
      await act(async () =>
        reload.settle(ok({ weekStart: "2026-10-19", items: WEEK })),
      );
    });

    it("writes the states in Spanish", async () => {
      await act(() => i18n.changeLanguage("es-ES"));
      weeks = {};
      await renderScreen();

      expect(
        await screen.findByText("Sin clases esta semana"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("Las clases creadas para esta semana aparecen aquí."),
      ).toBeOnTheScreen();
    });

    it("writes the states in Portuguese", async () => {
      await act(() => i18n.changeLanguage("pt-BR"));
      fetchMock.mockResolvedValueOnce(failure(500));
      await renderWith();

      expect(
        await screen.findByRole("header", {
          name: "Não foi possível carregar a ocupação",
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("Confira sua conexão e tente de novo."),
      ).toBeOnTheScreen();
    });
  });
});

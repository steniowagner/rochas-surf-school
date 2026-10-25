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

import {
  buildClassItem,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";
import type { ClassItem } from "../classes.types";
import { WeeklyOccupancyScreen } from "./weekly-occupancy.screen";

// The options the screen gave its Stack header.
let headerOptions: any = {};
// The clock `useNow` answers.
let mockNow = new Date();

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: () => undefined,
  Stack: {
    Screen: ({ options }: any) => {
      headerOptions = options;

      return <>{options.headerTitle()}</>;
    },
  },
}));

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
      expect(
        screen.getByRole("button", { name: "Show the previous week" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Show the next week" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/previous week/i)).not.toBeOnTheScreen();
      expect(screen.getByText("Week map")).toBeOnTheScreen();
    });

    it("makes the scroll view the first view, under the header", async () => {
      await renderScreen();

      const scroll = screen.getByTestId("weekly-occupancy-scroll");
      expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic");
    });

    it("moves one week with each arrow and asks for that week", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");

      await user.press(
        screen.getByRole("button", { name: "Show the next week" }),
      );

      expect(screen.getByText("26 OCT – 1 NOV")).toBeOnTheScreen();
      await waitFor(() =>
        expect(requestedPaths()).toContain("/classes?date=2026-10-26"),
      );

      await user.press(
        screen.getByRole("button", { name: "Show the previous week" }),
      );
      await user.press(
        screen.getByRole("button", { name: "Show the previous week" }),
      );

      expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
      await waitFor(() =>
        expect(requestedPaths()).toContain("/classes?date=2026-10-12"),
      );
    });

    it("shows a week already loaded from the cache, with no loading state", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByTestId("occupancy-cell-A");
      await user.press(
        screen.getByRole("button", { name: "Show the next week" }),
      );
      await user.press(
        screen.getByRole("button", { name: "Show the previous week" }),
      );

      expect(screen.getByTestId("occupancy-cell-A")).toBeOnTheScreen();
    });

    it("writes the week in Portuguese", async () => {
      await act(() => i18n.changeLanguage("pt-BR"));
      await renderScreen();

      expect(
        screen.getByRole("header", { name: "OCUPAÇÃO SEMANAL" }),
      ).toBeOnTheScreen();
      expect(screen.getByText("19 – 25 OUT")).toBeOnTheScreen();
      expect(await screen.findByText("Mapa da semana")).toBeOnTheScreen();
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
      await user.press(
        screen.getByRole("button", { name: "Show the next week" }),
      );
      await user.press(
        screen.getByRole("button", { name: "Show the previous week" }),
      );

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
});

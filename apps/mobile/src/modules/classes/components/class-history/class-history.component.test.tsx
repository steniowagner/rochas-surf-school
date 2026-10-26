import { render, screen } from "@testing-library/react-native";

import { buildClassItem } from "@/modules/classes/classes.test-utils";

import { ClassHistory } from "./class-history.component";
import type { UseClassHistoryResult } from "./class-history.types";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // Renders the header title the component sets, so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => options.headerTitle?.(),
  },
}));

const ITEM = buildClassItem(
  "c-13",
  "2026-10-13T11:00:00.000Z",
  "2026-10-13T12:00:00.000Z",
);

/** A loaded October with one class on the 13th. */
const loadedHistory = (): UseClassHistoryResult => ({
  now: new Date("2026-10-14T13:00:00.000Z"),
  today: "2026-10-14",
  selectedDay: null,
  discipline: "all",
  selectDiscipline: jest.fn(),
  markedDates: ["2026-10-13"],
  caption: "OCTOBER 2026",
  dayLabel: null,
  rows: [
    { type: "day", key: "day-2026-10-13", label: "TUE, 13 OCT" },
    { type: "class", key: ITEM.id, item: ITEM },
  ],
  isLoading: false,
  isError: false,
  isEmpty: false,
  isRetrying: false,
  isRefreshing: false,
  selectDay: jest.fn(),
  clearDay: jest.fn(),
  updatePeriod: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  openClass: jest.fn(),
});

describe("ClassHistory", () => {
  it("shows no intro by default, as the student's history: the plain header title only", async () => {
    await render(<ClassHistory history={loadedHistory()} copy="myHistory" />);

    expect(
      await screen.findByRole("header", { name: "TUE, 13 OCT" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "PAST CLASSES" }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("header", { name: "Past classes" }),
    ).not.toBeOnTheScreen();
  });

  it("shows the intro's title and description with withIntro", async () => {
    await render(
      <ClassHistory
        history={loadedHistory()}
        copy="teachingHistory"
        withIntro
      />,
    );

    expect(
      await screen.findByRole("header", { name: "Past classes" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Every class you have already taught, month by month or week by week.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("header", { name: "PAST CLASSES" }),
    ).not.toBeOnTheScreen();
  });
});

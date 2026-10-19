import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";

import { insetBehaviorsOf } from "@/navigation/stack-header/header-inset.test-utils";
import { headerTitleOf } from "@/navigation/stack-header/header-title.test-utils";
import * as api from "@/services/api";

import {
  createQueryClient,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { NewClassScreen } from "./new-class.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, children }: any) => (visible ? <View>{children}</View> : null),
  };
});

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

jest.mock("expo-router", () => ({
  Stack: {
    // Renders the header's right side, so the tests can reach what the screen puts there.
    Screen: jest.fn(({ options }: { options: { headerRight?: () => unknown } }) =>
      options.headerRight?.() ?? null,
    ),
  },
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Wednesday 2026-10-14, 10:00 in Fortaleza; only Date is faked so timers and user events keep working.
const NOW = new Date("2026-10-14T13:00:00.000Z");

const MORNING = "08:00 – 09:00";
const AFTERNOON = "16:00 – 17:00";

const teachers = [
  { id: "t-1", name: "Ana Souza", role: "instructor" },
  { id: "t-2", name: "Bruno Lima", role: "admin" },
];
const POINT = { latitude: -3.7442, longitude: -38.4617 };
const futuro = { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 5000", ...POINT, upcomingClasses: 2 };
const cumbuco = { id: "l-3", name: "Cumbuco", address: "Rua do Mar, 10", ...POINT, upcomingClasses: 0 };

type Handler = (init?: { method?: string; body?: string }) => unknown;

const serve = (overrides: Record<string, Handler> = {}) => {
  const routes: Record<string, Handler> = {
    "GET /locations": () => ok({ items: [futuro] }),
    "GET /classes/time-range-suggestions": () =>
      ok({
        items: [
          { start: "08:00", end: "09:00" },
          { start: "16:00", end: "17:00" },
        ],
      }),
    "GET /people?page=1&perPage=50&role=instructor,admin": () =>
      ok({
        items: teachers.map((item) => ({ ...item, createdAt: "2026-07-15T12:00:00.000Z", whatsappNumber: null })),
        page: 1,
        perPage: 50,
        total: 2,
      }),
    "POST /classes/batch": () => ({ ...ok({ count: 4 }), status: 201 }),
    ...overrides,
  };

  fetchMock.mockImplementation(async (url: string, init?: { method?: string; body?: string }) => {
    const handler = routes[`${init?.method ?? "GET"} ${String(url).replace("http://api.test", "")}`];

    if (!handler) {
      throw new Error(`unexpected request ${init?.method} ${url}`);
    }

    return handler(init);
  });
};

const failure = (status: number, key: string) => () => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

async function renderScreen() {
  const queryClient = createQueryClient();
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <NewClassScreen />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

const day = (date: string) => screen.getByTestId(`calendar-day-${date}`);
const submitButton = () => screen.getByRole("button", { name: /^Create (class|\d+ classes)$/ });

/** Fills what a valid batch of two days and two ranges needs. */
async function fillValidBatch(
  user: ReturnType<typeof userEvent.setup>,
  options: { singleDay?: boolean; withoutLocation?: boolean } = {},
) {
  await screen.findByText("Praia do Futuro");
  await user.press(day("2026-10-15"));
  if (!options.singleDay) {
    await user.press(day("2026-10-16"));
  }
  await user.press(screen.getByRole("button", { name: MORNING }));
  await user.press(screen.getByRole("button", { name: AFTERNOON }));
  if (!options.withoutLocation) {
    await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));
  }
  await user.press(await screen.findByRole("checkbox", { name: "Ana Souza" }));
}

beforeEach(() => {
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
  setupSignedInUser();
  serve();
  mockShow.mockClear();
  (router.back as jest.Mock).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

/** The options the screen gave the Stack header on its latest render. */
const headerOptions = () => {
  const calls = jest.mocked(Stack.Screen).mock.calls;

  return (
    calls[calls.length - 1][0] as {
      options: { headerTitle?: () => ReactNode; headerRight?: unknown };
    }
  ).options;
};

describe("NewClassScreen", () => {
  describe("day from the week", () => {
    const openWith = async (date: string) => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ date });
      await renderScreen();
    };

    afterEach(() => (useLocalSearchParams as jest.Mock).mockReturnValue({}));

    it("starts on the day passed by the week", async () => {
      await openWith("2027-02-20");

      expect(day("2027-02-20")).toBeSelected();
      expect(screen.getByText("1 day")).toBeOnTheScreen();
      expect(screen.getByText("February 2027")).toBeOnTheScreen();
    });

    it("starts on today when the week passes today", async () => {
      await openWith("2026-10-14");

      expect(day("2026-10-14")).toBeSelected();
      expect(screen.getByText("1 day")).toBeOnTheScreen();
    });

    it.each(["2026-10-13", "2026-02-30", "nope"])("ignores the past or malformed day %s", async (date) => {
      await openWith(date);

      expect(screen.getAllByText("pick at least 1").length).toBeGreaterThan(0);
      expect(screen.queryByText("1 day")).not.toBeOnTheScreen();
    });
  });

  it("insets its scroll view below the header, whatever the header is", async () => {
    await renderScreen();

    expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
  });

  it("shows the form in the design's order with its defaults", async () => {
    await renderScreen();

    expect(headerTitleOf(headerOptions().headerTitle)).toBe("New class");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    const headers = screen.getAllByRole("header").map((item) => item.props.children);
    expect(headers).toEqual([
      "Discipline",
      "Level",
      "Days",
      "Times",
      "Location",
      "Maximum capacity",
      "Notes",
      "Instructors",
    ]);
    expect(screen.getByRole("tab", { name: "Surf" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Beginner" })).toBeSelected();
    expect(screen.getByText("label only")).toBeTruthy();
    expect(screen.getAllByText("pick at least 1")).toHaveLength(2);
    expect(screen.getByText("pick a location")).toBeTruthy();
    expect(screen.getByText("at least 1")).toBeTruthy();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create class" })).toBeTruthy();
  });

  it("loads the suggestions, the locations and the teachers", async () => {
    await renderScreen();

    expect(await screen.findByRole("button", { name: MORNING })).toBeTruthy();
    expect(await screen.findByText("Praia do Futuro")).toBeTruthy();
    expect(await screen.findByText("Ana Souza")).toBeTruthy();
    expect(requestedPaths()).toEqual(
      expect.arrayContaining([
        "/locations",
        "/classes/time-range-suggestions",
        "/people?page=1&perPage=50&role=instructor,admin",
      ]),
    );
    expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Ana Souza" })).not.toBeChecked();
  });

  it("switches the discipline and the level", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole("tab", { name: "Skate" }));
    await user.press(screen.getByRole("tab", { name: "Expert" }));

    expect(screen.getByRole("tab", { name: "Skate" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Expert" })).toBeSelected();
  });

  describe("batch", () => {
    it("counts the days and the classes from the calendar, the days taken out and the ranges", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await user.press(day("2026-10-15"));
      await user.press(day("2026-10-17"));
      await user.press(day("2026-10-16"));
      await user.press(screen.getByRole("button", { name: MORNING }));
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));
      await user.press(await screen.findByRole("checkbox", { name: "Ana Souza" }));

      expect(screen.getByText("2 days")).toBeTruthy();
      expect(screen.getByText("16").props.className).toContain("line-through");
      expect(screen.getByTestId("excluded-2026-10-16")).toBeTruthy();
      expect(screen.getByText("2 days × 2 times · Praia do Futuro")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Create 4 classes" })).toBeEnabled();
    });

    it("counts one class per range for a single day, and shows no removed days", async () => {
      const user = userEvent.setup();
      await renderScreen();

      await fillValidBatch(user, { singleDay: true });
      await user.press(screen.getByRole("button", { name: AFTERNOON }));

      expect(screen.queryByText("Removed days")).toBeNull();
      expect(screen.getByText("1 day")).toBeTruthy();
      expect(screen.getByText("1 day × 1 time · Praia do Futuro")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Create class" })).toBeEnabled();
    });

    it("sends the days taken out of the range", async () => {
      serve({ "POST /classes/batch": () => ({ ...ok({ count: 2 }), status: 201 }) });
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await user.press(day("2026-10-15"));
      await user.press(day("2026-10-17"));
      await user.press(day("2026-10-16"));
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));
      await user.press(await screen.findByRole("checkbox", { name: "Ana Souza" }));

      expect(screen.getByText("2 days")).toBeTruthy();
      await user.press(screen.getByRole("button", { name: "Create 2 classes" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("2 classes created"));
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/classes/batch"));
      expect(JSON.parse(call?.[1].body)).toMatchObject({
        startDate: "2026-10-15",
        endDate: "2026-10-17",
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        excludedDates: ["2026-10-16"],
      });
    });

    it("forgets the removed days when a new range is started", async () => {
      serve({ "POST /classes/batch": () => ({ ...ok({ count: 1 }), status: 201 }) });
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await user.press(day("2026-10-15"));
      await user.press(day("2026-10-17"));
      await user.press(day("2026-10-16"));
      await user.press(day("2026-10-20"));
      await user.press(day("2026-10-21"));
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));
      await user.press(await screen.findByRole("checkbox", { name: "Ana Souza" }));

      expect(screen.getByText("2 days")).toBeTruthy();
      expect(screen.queryByTestId("excluded-2026-10-16")).toBeNull();
      await user.press(screen.getByRole("button", { name: "Create 2 classes" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalled());
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/classes/batch"));
      expect(JSON.parse(call?.[1].body)).not.toHaveProperty("excludedDates");
    });

    it("removes the range when one of its ends is pressed, and turns the button off", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      expect(submitButton()).toBeEnabled();

      await user.press(day("2026-10-15"));

      expect(submitButton()).toBeDisabled();
      expect(screen.getByText("Tap a day to start")).toBeTruthy();
      expect(screen.getByText("pick at least 1", { exact: true })).toBeTruthy();
    });

    it("clears the range and turns the button off", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      expect(submitButton()).toBeEnabled();

      await user.press(screen.getByText("Clear"));

      expect(submitButton()).toBeDisabled();
      expect(screen.queryByText(/ × /)).toBeNull();
      expect(screen.getByText("pick at least 1", { exact: true })).toBeTruthy();
    });

    it.each([
      ["an instructor", async (user: ReturnType<typeof userEvent.setup>) => user.press(screen.getByRole("checkbox", { name: "Ana Souza" }))],
      ["a time range", async (user: ReturnType<typeof userEvent.setup>) => {
        await user.press(screen.getByRole("button", { name: MORNING }));
        await user.press(screen.getByRole("button", { name: AFTERNOON }));
      }],
    ])("keeps the button off without %s", async (_name, undo) => {
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);

      await undo(user);

      expect(submitButton()).toBeDisabled();
    });

    it("keeps the button off without a location", async () => {
      const user = userEvent.setup();
      await renderScreen();

      await fillValidBatch(user, { withoutLocation: true });

      expect(submitButton()).toBeDisabled();
      expect(screen.queryByText(/ × /)).toBeTruthy();
      expect(screen.getByText("2 days × 2 times · pick a location")).toBeTruthy();
    });

    it("disables the button above 200 classes and says so", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user, { singleDay: true });
      await user.press(screen.getByRole("button", { name: "Next month" }));
      await user.press(screen.getByRole("button", { name: "Next month" }));
      await user.press(screen.getByRole("button", { name: "Next month" }));
      await user.press(screen.getByRole("button", { name: "Next month" }));

      await user.press(day("2027-02-20"));

      expect(screen.getByText("At most 200 classes at a time.")).toBeTruthy();
      expect(screen.queryByText(/ × /)).toBeNull();
      expect(submitButton()).toBeDisabled();
    });

    it("keeps the ranges that started selectable when today is among the dates, and says so", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByRole("button", { name: MORNING });

      await user.press(day("2026-10-14"));

      expect(screen.getByRole("button", { name: MORNING })).toBeEnabled();
      expect(screen.getByRole("button", { name: AFTERNOON })).toBeEnabled();
      expect(screen.getByText("Times that already passed today have no class today.")).toBeTruthy();
    });

    it("counts no class for a time that has passed today, and creates the other days with skipPast", async () => {
      serve({ "POST /classes/batch": () => ({ ...ok({ count: 3 }), status: 201 }) });
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      // 14 to 16 Oct, now is 10:00 on the 14th: the morning range has started there.
      await user.press(day("2026-10-14"));
      await user.press(day("2026-10-16"));
      await user.press(screen.getByRole("button", { name: MORNING }));
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));
      await user.press(await screen.findByRole("checkbox", { name: "Ana Souza" }));

      // 3 days x 2 times = 6, less the 14th's morning class that is already past.
      expect(screen.getByRole("button", { name: "Create 5 classes" })).toBeEnabled();
      await user.press(screen.getByRole("button", { name: "Create 5 classes" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalled());
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/classes/batch"));
      expect(JSON.parse(call?.[1].body)).toMatchObject({ startDate: "2026-10-14", endDate: "2026-10-16", skipPast: true });
    });

    it("creates nothing when the only date is today and every selected time has passed", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");
      await user.press(day("2026-10-14"));
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));
      await user.press(await screen.findByRole("checkbox", { name: "Ana Souza" }));

      await user.press(screen.getByRole("button", { name: MORNING }));

      expect(screen.getByRole("button", { name: MORNING })).toBeSelected();
      expect(submitButton()).toBeDisabled();

      await user.press(screen.getByRole("button", { name: AFTERNOON }));

      expect(screen.getByRole("button", { name: "Create class" })).toBeEnabled();
    });
  });

  describe("time ranges", () => {
    it("adds a new range from the sheet and selects it", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByRole("button", { name: MORNING });

      await user.press(screen.getByRole("button", { name: "New time" }));
      await user.press(screen.getByRole("button", { name: "Add time" }));

      expect(screen.getByRole("button", { name: "12:00 – 13:00" })).toBeSelected();
      expect(screen.queryByRole("button", { name: "Add time" })).toBeNull();
    });

    it("adds a range that overlaps a selected one as a blocked chip", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await user.press(await screen.findByRole("button", { name: MORNING }));
      // Anything but the default needs a native picker: select the afternoon one, then add the default 12:00-13:00.
      await user.press(screen.getByRole("button", { name: "New time" }));
      await user.press(screen.getByRole("button", { name: "Add time" }));
      await user.press(screen.getByRole("button", { name: "New time" }));
      await user.press(screen.getByRole("button", { name: "Add time" }));

      expect(screen.getAllByRole("button", { name: "12:00 – 13:00" })).toHaveLength(1);
      expect(screen.getByRole("button", { name: MORNING })).toBeSelected();
    });

    it("closes the sheet without adding anything on Cancel", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByRole("button", { name: MORNING });

      await user.press(screen.getByRole("button", { name: "New time" }));
      await user.press(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("button", { name: "Add time" })).toBeNull();
      expect(screen.queryByRole("button", { name: "12:00 – 13:00" })).toBeNull();
    });

    it("shows only the add button when the suggestions fail", async () => {
      serve({ "GET /classes/time-range-suggestions": failure(500, "x") });
      await renderScreen();

      await screen.findByText("Praia do Futuro");

      expect(screen.getByRole("button", { name: "New time" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: MORNING })).toBeNull();
      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe("locations", () => {
    it("saves a new location in place and selects it", async () => {
      const iracema = { id: "l-2", name: "Praia de Iracema", address: "Rua dos Tabajaras, 1", ...POINT, upcomingClasses: 0 };
      serve({ "POST /locations": () => ({ ...ok(iracema), status: 201 }) });
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await user.press(screen.getByRole("button", { name: "New location" }));
      await user.type(screen.getByLabelText("Name"), "Praia de Iracema");
      await user.type(screen.getByLabelText("Address"), "Rua dos Tabajaras, 1");
      await fireEvent(screen.getByTestId("location-map-picker"), "press", {
        nativeEvent: { coordinate: POINT },
      });
      await user.press(screen.getByRole("button", { name: "Save location" }));

      await waitFor(() =>
        expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toBeChecked(),
      );
      expect(JSON.parse(fetchMock.mock.calls.find(([, init]) => init?.method === "POST")![1].body)).toEqual({
        name: "Praia de Iracema",
        address: "Rua dos Tabajaras, 1",
        ...POINT,
      });
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
      expect(screen.queryByText("pick a location")).toBeNull();
    });
  });

  describe("manage locations", () => {
    const manageButton = () => screen.getByRole("button", { name: "Manage" });

    it("(manage) offers no Manage button without locations", async () => {
      serve({ "GET /locations": () => ok({ items: [] }) });
      await renderScreen();
      await screen.findByRole("button", { name: "New location" });

      expect(screen.queryByRole("button", { name: "Manage" })).toBeNull();
    });

    it("(manage) hides 'New location' until Done", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await user.press(manageButton());

      expect(screen.queryByRole("button", { name: "New location" })).toBeNull();

      await user.press(screen.getByRole("button", { name: "Done" }));

      expect(screen.getByRole("button", { name: "New location" })).toBeTruthy();
    });

    it("(manage) opens a row filled to edit it, saves it, updates the row and keeps the selection", async () => {
      const edited = { ...futuro, address: "Rua Nova, 1" };
      serve({ "PUT /locations/l-1": () => ok(edited) });
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));

      await user.press(manageButton());
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));

      expect(screen.getByText("Edit location")).toBeTruthy();
      expect(screen.getByLabelText("Name").props.value).toBe("Praia do Futuro");
      expect(screen.getByLabelText("Address").props.value).toBe("Av. Zezé Diogo, 5000");
      expect(screen.getByRole("checkbox", { name: "Tell the instructors of upcoming classes?" })).toBeChecked();

      await fireEvent.changeText(screen.getByLabelText("Address"), "Rua Nova, 1");
      await user.press(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Location updated"));
      expect(screen.getByText("Rua Nova, 1")).toBeTruthy();
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();
      expect(screen.queryByText("Edit location")).toBeNull();
      const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")!;
      expect(JSON.parse(put[1].body)).toEqual({
        name: "Praia do Futuro",
        address: "Rua Nova, 1",
        ...POINT,
        notify: true,
      });
    });
  });

  describe("remove location", () => {
    const openRemoval = async (user: ReturnType<typeof userEvent.setup>, name = "Praia do Futuro") => {
      await user.press(screen.getByRole("button", { name: "Manage" }));
      await user.press(screen.getByRole("radio", { name }));
      await user.press(screen.getByRole("button", { name: "Remove location" }));
    };
    const confirmRemoval = (user: ReturnType<typeof userEvent.setup>) =>
      user.press(screen.getAllByRole("button", { name: "Remove location" }).at(-1)!);

    it("removes the selected location: toast, out of the list, nothing selected, button off", async () => {
      serve({ "POST /locations/l-1/archive": () => ({ ok: true, status: 204, json: async () => undefined }) });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      expect(submitButton()).toBeEnabled();

      await openRemoval(user);
      expect(screen.getByText("The 2 classes that already use this location stay as they are.")).toBeTruthy();
      await confirmRemoval(user);

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Praia do Futuro removed"));
      expect(screen.queryByRole("radio", { name: "Praia do Futuro" })).toBeNull();
      expect(screen.getByText("pick a location")).toBeTruthy();
      expect(submitButton()).toBeDisabled();
    });

    it("keeps the selection when another location is removed", async () => {
      serve({
        "GET /locations": () => ok({ items: [futuro, cumbuco] }),
        "POST /locations/l-3/archive": () => ({ ok: true, status: 204, json: async () => undefined }),
      });
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Cumbuco");
      await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));

      await openRemoval(user, "Cumbuco");
      expect(screen.queryByText(/stay as they are/)).toBeNull();
      await confirmRemoval(user);

      await waitFor(() => expect(screen.queryByRole("radio", { name: "Cumbuco" })).toBeNull());
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();
    });

    it("sends nothing when the admin keeps the location", async () => {
      serve();
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await openRemoval(user);
      await user.press(screen.getByRole("button", { name: "Keep" }));

      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeTruthy();
    });

    it("tells that the chosen location was removed when the submit is refused, and clears it", async () => {
      serve({ "POST /classes/batch": failure(422, "class.location.archived") });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      const before = requestedPaths().filter((path) => path === "/locations").length;

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("The chosen location was removed. Pick another one."),
      );
      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === "/locations")).toHaveLength(before + 1),
      );
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
      expect(submitButton()).toBeDisabled();
    });
  });

  describe("location sheet", () => {
    it("closes on Cancel and selects nothing", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await screen.findByText("Praia do Futuro");

      await user.press(screen.getByRole("button", { name: "New location" }));
      await user.press(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("button", { name: "Save location" })).toBeNull();
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
    });
  });

  describe("instructors", () => {
    it("ticks and unticks an instructor", async () => {
      const user = userEvent.setup();
      await renderScreen();

      await user.press(await screen.findByRole("checkbox", { name: "Bruno Lima" }));
      expect(screen.getByRole("checkbox", { name: "Bruno Lima" })).toBeChecked();
      expect(screen.queryByText("at least 1")).toBeNull();

      await user.press(screen.getByRole("checkbox", { name: "Bruno Lima" }));
      expect(screen.getByRole("checkbox", { name: "Bruno Lima" })).not.toBeChecked();
    });

    it("shows the load error and retries", async () => {
      serve({
        "GET /people?page=1&perPage=50&role=instructor,admin": failure(500, "x"),
      });
      const user = userEvent.setup();
      await renderScreen();

      await screen.findByText("Couldn't load the instructors.");
      serve();
      await user.press(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Ana Souza")).toBeTruthy();
    });
  });

  describe("capacity and notes", () => {
    it("steps the capacity within 1 and 20", async () => {
      const user = userEvent.setup();
      await renderScreen();

      for (let i = 0; i < 9; i += 1) {
        await user.press(screen.getByRole("button", { name: "Decrease" }));
      }
      expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();

      for (let i = 0; i < 19; i += 1) {
        await user.press(screen.getByRole("button", { name: "Increase" }));
      }
      expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    });

    it("limits the notes to 300 characters and counts them", async () => {
      const user = userEvent.setup();
      await renderScreen();
      const notes = screen.getByLabelText("Notes");

      await user.type(notes, "Bring sunscreen");

      expect(notes.props.maxLength).toBe(300);
      expect(screen.getByText("15/300")).toBeTruthy();
    });
  });

  describe("submit", () => {
    it("sends the batch, shows the toast and goes back", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      await user.type(screen.getByLabelText("Notes"), "  Bring sunscreen ");

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(mockShow).toHaveBeenCalledWith("4 classes created");
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/classes/batch"));
      expect(call?.[1]).toEqual({
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
        body: JSON.stringify({
          discipline: "surf",
          level: "beginner",
          startDate: "2026-10-15",
          endDate: "2026-10-16",
          weekdays: [1, 2, 3, 4, 5, 6, 7],
          timeRanges: [
            { start: "08:00", end: "09:00" },
            { start: "16:00", end: "17:00" },
          ],
          locationId: "l-1",
          instructorIds: ["t-1"],
          capacity: 8,
          notes: "Bring sunscreen",
        }),
      });
    });

    it("sends a single day as a range that ends on its start, with no notes key when blank", async () => {
      serve({ "POST /classes/batch": () => ({ ...ok({ count: 1 }), status: 201 }) });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user, { singleDay: true });
      await user.press(screen.getByRole("button", { name: AFTERNOON }));

      await user.press(screen.getByRole("button", { name: "Create class" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Class created"));
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/classes/batch"));
      const body = JSON.parse(call?.[1].body);
      expect(body).toMatchObject({ startDate: "2026-10-15", endDate: "2026-10-15" });
      expect(body).not.toHaveProperty("notes");
    });

    it("sends once when pressed twice in the same frame, and shows the loading state", async () => {
      let finish: (value: unknown) => void = () => undefined;
      serve({ "POST /classes/batch": () => new Promise((resolve) => (finish = resolve)) });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      const button = screen.getByRole("button", { name: "Create 4 classes" });

      await act(async () => {
        // The press only resolves when the request does, so it is not awaited.
        void fireEvent.press(button);
        void fireEvent.press(button);
      });

      // `isPending` reaches React through TanStack Query's scheduled notification, which a slow runner (CI) may not
      // have delivered when `act` returns: wait for the loading state while the request is still held.
      await waitFor(() => expect(screen.queryByText("Create 4 classes")).toBeNull());
      expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/classes/batch"))).toHaveLength(1);

      await act(async () => finish({ ...ok({ count: 4 }), status: 201 }));
      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    });

    it.each([
      ["class.startsAt.past", "One of the times has already passed. Check the dates and times."],
      ["class.instructors.invalid", "One of the instructors can no longer teach."],
      ["class.location.notFound", "The chosen location no longer exists."],
    ])("maps %s to its toast and keeps the form", async (key, message) => {
      serve({ "POST /classes/batch": failure(422, key) });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
      expect(router.back).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "Create 4 classes" })).toBeEnabled();
      expect(screen.getByRole("checkbox", { name: "Ana Souza" })).toBeChecked();
    });

    it("reloads the instructors when one can no longer teach", async () => {
      serve({ "POST /classes/batch": failure(422, "class.instructors.invalid") });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      const teachersPath = "/people?page=1&perPage=50&role=instructor,admin";
      const before = requestedPaths().filter((path) => path === teachersPath).length;

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === teachersPath)).toHaveLength(before + 1),
      );
    });

    it("reloads the locations when the chosen one is gone", async () => {
      serve({ "POST /classes/batch": failure(422, "class.location.notFound") });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      const before = requestedPaths().filter((path) => path === "/locations").length;

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === "/locations")).toHaveLength(before + 1),
      );
    });

    it("shows the no-connection toast when there is no answer", async () => {
      serve({
        "POST /classes/batch": () => {
          throw new TypeError("Network request failed");
        },
      });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(mockShow.mock.calls[0]![0]).not.toBe("4 classes created");
      expect(router.back).not.toHaveBeenCalled();
    });

    it("shows nothing when the session expired", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);
      (api.apiPost as jest.Mock).mockRejectedValueOnce(new api.SessionExpiredError());

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() => expect(api.apiPost).toHaveBeenCalled());
      expect(mockShow).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
    });

    it("shows the generic toast for any other error", async () => {
      serve({ "POST /classes/batch": failure(500, "INTERNAL_SERVER_ERROR") });
      const user = userEvent.setup();
      await renderScreen();
      await fillValidBatch(user);

      await user.press(screen.getByRole("button", { name: "Create 4 classes" }));

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."),
      );
    });
  });
});

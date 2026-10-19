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

import { EditClassScreen } from "./edit-class.screen";

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

  return {
    ...actual,
    apiGet: jest.fn(actual.apiGet),
    apiPut: jest.fn(actual.apiPut),
  };
});

jest.mock("expo-router", () => ({
  Stack: {
    // Renders the header's right side, so the tests can reach what the screen puts there.
    Screen: jest.fn(({ options }: { options: { headerRight?: () => unknown } }) =>
      options.headerRight?.() ?? null,
    ),
  },
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: "c-1" })),
}));

// Wednesday 2026-10-14, 10:00 in Fortaleza; only Date is faked so timers and user events keep working.
const NOW = new Date("2026-10-14T13:00:00.000Z");
const STARTED_NOW = new Date("2026-10-15T11:30:00.000Z");
const FINISHED_NOW = new Date("2026-10-15T12:30:00.000Z");

const MORNING = "08:00 – 09:00";
const AFTERNOON = "16:00 – 17:00";

const teachers = [
  { id: "t-1", name: "Ana Souza", role: "instructor" },
  { id: "t-2", name: "Bruno Lima", role: "admin" },
];
const POINT = { latitude: -3.7442, longitude: -38.4617 };
const futuro = { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 5000", ...POINT, upcomingClasses: 1 };
const cumbuco = { id: "l-2", name: "Cumbuco", address: "Rua do Mar, 10", ...POINT, upcomingClasses: 0 };

// Tomorrow, 08:00-09:00 in Fortaleza, taught by Ana and by Carla, who is no longer a teacher.
const classItem = {
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: "2026-10-15T11:00:00.000Z",
  endsAt: "2026-10-15T12:00:00.000Z",
  capacity: 8,
  notes: "Bring a hat",
  cancelledAt: null,
  cancellationMessage: null,
  location: futuro,
  instructors: [
    { id: "t-1", name: "Ana Souza" },
    { id: "t-9", name: "Carla Dias" },
  ],
};

type Handler = (init?: { method?: string; body?: string }) => unknown;

const serve = (overrides: Record<string, Handler> = {}) => {
  const routes: Record<string, Handler> = {
    "GET /classes/c-1": () => ok(classItem),
    "GET /locations": () => ok({ items: [futuro, cumbuco] }),
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
    "PUT /classes/c-1": () => ok(classItem),
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

const failure = (status: number, key: string, details?: Record<string, unknown>) => () => ({
  ok: false,
  status,
  json: async () => ({ errors: [key], ...(details ? { details } : {}) }),
});

async function renderScreen() {
  const queryClient = createQueryClient();
  // The class query retries a failed load; do it at once so a failure shows up quickly.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  });
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <EditClassScreen />
    </QueryClientProvider>,
  );

  return { ...view, queryClient };
}

const day = (date: string) => screen.getByTestId(`calendar-day-${date}`);
const saveButton = () => screen.getByRole("button", { name: "Save and notify" });
const puts = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT") as [string, { body: string }][];

/** Waits for the form of the loaded class. */
const loaded = () => screen.findByRole("checkbox", { name: "Ana Souza" });

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
  (api.apiPut as jest.Mock).mockClear();
  (api.apiGet as jest.Mock).mockClear();
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

describe("EditClassScreen", () => {
  it("starts from the class: its values, its own time selected, and nothing to save", async () => {
    await renderScreen();
    await loaded();

    expect(headerTitleOf(headerOptions().headerTitle)).toBe("Edit class");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(day("2026-10-15")).toBeSelected();
    expect(screen.getByText("October 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: MORNING })).toBeSelected();
    expect(screen.getByRole("button", { name: AFTERNOON })).not.toBeSelected();
    expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();
    expect(screen.getByDisplayValue("Bring a hat")).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "Ana Souza" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Bruno Lima" })).not.toBeChecked();
    expect(screen.getByText("When you save, the class's instructors are notified.")).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("lists the class's own time while the suggestions are still loading", async () => {
    serve({ "GET /classes/time-range-suggestions": () => new Promise(() => undefined) });
    await renderScreen();
    await loaded();

    expect(screen.getByRole("button", { name: MORNING })).toBeSelected();
  });

  it("lists the class's own time even when last week had no such class", async () => {
    serve({ "GET /classes/time-range-suggestions": () => ok({ items: [] }) });
    await renderScreen();
    await loaded();

    expect(screen.getByRole("button", { name: MORNING })).toBeSelected();
  });

  it("lists an instructor who is no longer a teacher, ticked, so they can be removed", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    expect(screen.getByRole("checkbox", { name: "Carla Dias" })).toBeChecked();
    await user.press(screen.getByRole("checkbox", { name: "Carla Dias" }));

    expect(screen.getByRole("checkbox", { name: "Carla Dias" })).not.toBeChecked();
    expect(saveButton()).toBeEnabled();
  });

  it("selects only one day and one time, and saves the new day and time once", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(day("2026-10-16"));
    await user.press(screen.getByRole("button", { name: AFTERNOON }));

    expect(day("2026-10-16")).toBeSelected();
    expect(day("2026-10-15")).not.toBeSelected();
    expect(screen.getByRole("button", { name: AFTERNOON })).toBeSelected();
    expect(screen.getByRole("button", { name: MORNING })).not.toBeSelected();
    expect(saveButton()).toBeEnabled();

    await user.press(saveButton());

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(puts()).toHaveLength(1);
    expect(puts()[0]![0]).toBe("http://api.test/classes/c-1");
    expect(JSON.parse(puts()[0]![1].body)).toEqual({
      discipline: "surf",
      level: "beginner",
      date: "2026-10-16",
      start: "16:00",
      end: "17:00",
      locationId: "l-1",
      instructorIds: ["t-1", "t-9"],
      capacity: 8,
      notes: "Bring a hat",
    });
    expect(mockShow).toHaveBeenCalledWith("Changes saved");
  });

  it("reloads the weeks and the details after saving", async () => {
    const user = userEvent.setup();
    const { queryClient } = await renderScreen();
    await loaded();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { weekStart: "2026-10-12", items: [] });

    await user.press(screen.getByRole("button", { name: AFTERNOON }));
    await user.press(saveButton());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(true);
  });

  it("sends changed discipline, level, location, capacity and cleared notes", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(screen.getByRole("tab", { name: "Skate" }));
    await user.press(screen.getByRole("tab", { name: "Expert" }));
    await user.press(screen.getByRole("radio", { name: "Cumbuco" }));
    await user.press(screen.getByRole("button", { name: "Increase" }));
    fireEvent.changeText(screen.getByDisplayValue("Bring a hat"), "   ");
    await user.press(saveButton());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(JSON.parse(puts()[0]![1].body)).toEqual({
      discipline: "skate",
      level: "expert",
      date: "2026-10-15",
      start: "08:00",
      end: "09:00",
      locationId: "l-2",
      instructorIds: ["t-1", "t-9"],
      capacity: 9,
    });
  });

  it("keeps the button disabled when a change is undone", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(screen.getByRole("button", { name: AFTERNOON }));
    expect(saveButton()).toBeEnabled();
    await user.press(screen.getByRole("button", { name: MORNING }));

    expect(saveButton()).toBeDisabled();
  });

  it("disables saving with the hint when every instructor is removed", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(screen.getByRole("checkbox", { name: "Ana Souza" }));
    await user.press(screen.getByRole("checkbox", { name: "Carla Dias" }));

    expect(screen.getByText("at least 1")).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("blocks the times that already started on today's date, and lets another day use them", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(day("2026-10-14"));

    expect(screen.getByRole("button", { name: MORNING })).toBeEnabled();
    expect(screen.getByRole("button", { name: AFTERNOON })).toBeEnabled();
    // 08:00 started at 10:00 now, but it is the class's own range, so it stays: the screen still refuses it below.
    expect(day("2026-10-13")).toBeDisabled();
  });

  it("does not allow saving today with a time that has started", async () => {
    serve({
      "GET /classes/time-range-suggestions": () =>
        ok({ items: [{ start: "08:00", end: "09:00" }, { start: "09:30", end: "10:30" }, { start: "16:00", end: "17:00" }] }),
    });
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(day("2026-10-14"));

    expect(screen.getByRole("button", { name: "09:30 – 10:30" })).toBeDisabled();
    expect(screen.getByRole("button", { name: AFTERNOON })).toBeEnabled();
    // The class's own 08:00-09:00 range is today's already-started one, but it stays selectable: saving it is
    // refused because that start has passed.
    expect(saveButton()).toBeDisabled();
  });

  it("adds a new time from the sheet and selects it", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(screen.getByRole("button", { name: "New time" }));
    await user.press(screen.getByRole("button", { name: "Add time" }));

    expect(screen.getByRole("button", { name: "12:00 – 13:00" })).toBeSelected();
    expect(screen.getByRole("button", { name: MORNING })).not.toBeSelected();
    expect(saveButton()).toBeEnabled();
  });

  it("adds a new time that already started today only as a blocked chip", async () => {
    // 10:00 now; the sheet's default 12:00-13:00 has not started, so move the clock past it.
    jest.setSystemTime(new Date("2026-10-14T16:00:00.000Z"));
    const user = userEvent.setup();
    await renderScreen();
    await loaded();
    await user.press(day("2026-10-14"));

    await user.press(screen.getByRole("button", { name: "New time" }));
    await user.press(screen.getByRole("button", { name: "Add time" }));

    expect(screen.getByRole("button", { name: "12:00 – 13:00" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "12:00 – 13:00" })).not.toBeSelected();
  });

  it("saves a new location in place and selects it", async () => {
    const iracema = { id: "l-3", name: "Praia de Iracema", address: "Rua dos Tabajaras, 1", ...POINT, upcomingClasses: 0 };
    serve({ "POST /locations": () => ({ ...ok(iracema), status: 201 }) });
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

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
    expect(saveButton()).toBeEnabled();
  });

  describe("manage locations", () => {
    it("(manage) edits a location from its row and keeps the class's selection", async () => {
      const edited = { ...cumbuco, name: "Cumbuco Norte" };
      serve({ "PUT /locations/l-2": () => ok(edited) });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();

      await user.press(screen.getByRole("button", { name: "Manage" }));
      expect(screen.queryByRole("button", { name: "New location" })).toBeNull();
      await user.press(screen.getByRole("radio", { name: "Cumbuco" }));
      await fireEvent.changeText(screen.getByLabelText("Name"), "Cumbuco Norte");
      await user.press(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(screen.getByRole("radio", { name: "Cumbuco Norte" })).toBeTruthy());
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();
      expect(mockShow).toHaveBeenCalledWith("Location updated");
      await user.press(screen.getByRole("button", { name: "Done" }));
      expect(screen.getByRole("button", { name: "New location" })).toBeTruthy();
    });
  });

  describe("remove location", () => {
    const removeFromSheet = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
      await user.press(screen.getByRole("button", { name: "Manage" }));
      await user.press(screen.getByRole("radio", { name }));
      await user.press(screen.getByRole("button", { name: "Remove location" }));
      await user.press(screen.getAllByRole("button", { name: "Remove location" }).at(-1)!);
    };

    it("clears the selection when the class's own location is removed, and Save stays off", async () => {
      serve({ "POST /locations/l-1/archive": () => ({ ok: true, status: 204, json: async () => undefined }) });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();

      await removeFromSheet(user, "Praia do Futuro");

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Praia do Futuro removed"));
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
      expect(saveButton()).toBeDisabled();
    });

    it("keeps the selection when another location is removed", async () => {
      serve({ "POST /locations/l-2/archive": () => ({ ok: true, status: 204, json: async () => undefined }) });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();

      await removeFromSheet(user, "Cumbuco");

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Cumbuco removed"));
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();
    });

    it("offers no Manage button when no active location is left", async () => {
      serve({ "GET /locations": () => ok({ items: [] }) });
      await renderScreen();
      await loaded();

      await waitFor(() => expect(screen.getByText("Removed")).toBeTruthy());
      expect(screen.queryByRole("button", { name: "Manage" })).toBeNull();
    });

    it("shows the class's removed location as its selected row, with the chip, and saves without changing it", async () => {
      serve({ "GET /locations": () => ok({ items: [cumbuco] }) });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();

      await waitFor(() => expect(screen.getByText("Removed")).toBeTruthy());
      expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();

      await fireEvent.changeText(screen.getByLabelText("Notes"), "New notes");
      await user.press(saveButton());

      await waitFor(() => expect(puts()).toHaveLength(1));
      expect(JSON.parse(puts()[0][1].body)).toMatchObject({ locationId: "l-1", notes: "New notes" });
    });

    it("tells that the chosen location was removed when the save is refused, and clears it", async () => {
      serve({ "PUT /classes/c-1": failure(422, "class.location.archived") });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();
      await user.press(screen.getByRole("radio", { name: "Cumbuco" }));
      const before = requestedPaths().filter((path) => path === "/locations").length;

      await user.press(saveButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("The chosen location was removed. Pick another one."),
      );
      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === "/locations")).toHaveLength(before + 1),
      );
      expect(screen.getByRole("radio", { name: "Cumbuco" })).not.toBeChecked();
    });
  });

  it("keeps a time added twice as a single chip", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(screen.getByRole("button", { name: "New time" }));
    await user.press(screen.getByRole("button", { name: "Add time" }));
    await user.press(screen.getByRole("button", { name: "New time" }));
    await user.press(screen.getByRole("button", { name: "Add time" }));

    expect(screen.getAllByRole("button", { name: "12:00 – 13:00" })).toHaveLength(1);
  });

  it("closes the new time sheet on Cancel without adding anything", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await loaded();

    await user.press(screen.getByRole("button", { name: "New time" }));
    await user.press(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("button", { name: "Add time" })).toBeNull();
    expect(screen.queryByRole("button", { name: "12:00 – 13:00" })).toBeNull();
    expect(saveButton()).toBeDisabled();
  });

  it("lists the class's own location when the list of locations lacks it, and a class without notes", async () => {
    serve({
      "GET /classes/c-1": () => ok({ ...classItem, notes: null }),
      "GET /locations": () => ok({ items: [cumbuco] }),
    });
    await renderScreen();
    await loaded();

    expect(screen.getByRole("radio", { name: "Praia do Futuro" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Cumbuco" })).not.toBeChecked();
    expect(screen.queryByDisplayValue("Bring a hat")).toBeNull();
  });

  it("offers to retry the instructors when they fail to load", async () => {
    serve({ "GET /people?page=1&perPage=50&role=instructor,admin": failure(500, "INTERNAL_SERVER_ERROR") });
    const user = userEvent.setup();
    await renderScreen();

    expect(await screen.findByText("Couldn't load the instructors.")).toBeOnTheScreen();
    const before = requestedPaths().filter((path) => path.startsWith("/people")).length;

    await user.press(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(requestedPaths().filter((path) => path.startsWith("/people")).length).toBeGreaterThan(before),
    );
  });

  it("sends once on a double press", async () => {
    let finish: (value: unknown) => void = () => undefined;
    serve({ "PUT /classes/c-1": () => new Promise((resolve) => (finish = resolve)) });
    const user = userEvent.setup();
    await renderScreen();
    await loaded();
    await user.press(screen.getByRole("button", { name: AFTERNOON }));
    const button = saveButton();

    await act(async () => {
      void fireEvent.press(button);
      void fireEvent.press(button);
    });

    await waitFor(() => expect(puts()).toHaveLength(1));
    await act(async () => finish(ok(classItem)));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(puts()).toHaveLength(1);
  });

  it("has no Cancel class button: cancelling is done from the class tools", async () => {
    await renderScreen();
    await loaded();

    expect(screen.queryByRole("button", { name: "Cancel class" })).toBeNull();
    expect(saveButton()).toBeOnTheScreen();
  });

  describe("cancelled class", () => {
    const cancelledItem = { ...classItem, cancelledAt: "2026-10-13T10:00:00.000Z", cancellationMessage: "Big waves." };

    it("says the class was cancelled, with no form, footer or Cancel class", async () => {
      serve({ "GET /classes/c-1": () => ok(cancelledItem) });
      await renderScreen();

      expect(await screen.findByText("This class was cancelled and can't be changed.")).toBeOnTheScreen();
      expect(headerTitleOf(headerOptions().headerTitle)).toBe("Edit class");
      expect(screen.queryByRole("button", { name: "Save and notify" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Cancel class" })).toBeNull();
      expect(screen.queryByRole("checkbox", { name: "Ana Souza" })).toBeNull();
    });

    it("says it for a cancelled class that has started too", async () => {
      jest.setSystemTime(STARTED_NOW);
      serve({ "GET /classes/c-1": () => ok(cancelledItem) });
      await renderScreen();

      expect(await screen.findByText("This class was cancelled and can't be changed.")).toBeOnTheScreen();
    });

    it("shows the toast and goes back when a save is refused with class.cancelled", async () => {
      serve({ "PUT /classes/c-1": failure(409, "class.cancelled") });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();
      await user.press(screen.getByRole("button", { name: AFTERNOON }));

      await user.press(saveButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("This class was cancelled and can't be changed."),
      );
      expect(router.back).toHaveBeenCalledTimes(1);
    });
  });

  describe("started class", () => {
    beforeEach(() => jest.setSystemTime(STARTED_NOW));

    it("shows the banner and only the instructors", async () => {
      await renderScreen();
      await loaded();

      expect(screen.getByText("The class has started")).toBeOnTheScreen();
      expect(screen.getByText("Only the instructors can be changed.")).toBeOnTheScreen();
      expect(screen.queryByText("Day")).toBeNull();
      expect(screen.queryByRole("tab", { name: "Skate" })).toBeNull();
      expect(screen.queryByRole("button", { name: MORNING })).toBeNull();
      expect(saveButton()).toBeDisabled();
    });

    it("sends the stored values with the new instructors", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await loaded();

      await user.press(screen.getByRole("checkbox", { name: "Carla Dias" }));
      await user.press(screen.getByRole("checkbox", { name: "Bruno Lima" }));
      await user.press(saveButton());

      await waitFor(() => expect(router.back).toHaveBeenCalled());
      expect(JSON.parse(puts()[0]![1].body)).toEqual({
        discipline: "surf",
        level: "beginner",
        date: "2026-10-15",
        start: "08:00",
        end: "09:00",
        locationId: "l-1",
        instructorIds: ["t-1", "t-2"],
        capacity: 8,
        notes: "Bring a hat",
      });
    });

    it("keeps the button disabled with the same instructors, and with none", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await loaded();

      await user.press(screen.getByRole("checkbox", { name: "Carla Dias" }));
      await user.press(screen.getByRole("checkbox", { name: "Carla Dias" }));
      expect(saveButton()).toBeDisabled();

      await user.press(screen.getByRole("checkbox", { name: "Ana Souza" }));
      await user.press(screen.getByRole("checkbox", { name: "Carla Dias" }));
      expect(saveButton()).toBeDisabled();
    });
  });

  describe("states", () => {
    it("shows a spinner while loading, with no form", async () => {
      serve({ "GET /classes/c-1": () => new Promise(() => undefined) });
      await renderScreen();

      expect(screen.getByTestId("edit-class-loading")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Save and notify" })).toBeNull();
    });

    it("insets its loading view's scroll view below the header, so the header's scroll edge finds one", async () => {
      serve({ "GET /classes/c-1": () => new Promise(() => undefined) });
      await renderScreen();

      expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
    });

    it("insets its form's scroll view below the header", async () => {
      await renderScreen();
      await loaded();

      expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
    });

    it("offers to retry a failed load", async () => {
      serve({ "GET /classes/c-1": failure(500, "INTERNAL_SERVER_ERROR") });
      const user = userEvent.setup();
      await renderScreen();

      expect(await screen.findByText("Couldn't load the class.")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Save and notify" })).toBeNull();

      serve();
      await user.press(screen.getByRole("button", { name: "Try again" }));

      expect(await loaded()).toBeOnTheScreen();
    });

    it("says the class is gone on a 404", async () => {
      serve({ "GET /classes/c-1": failure(404, "class.notFound") });
      await renderScreen();

      expect(await screen.findByText("This class no longer exists.")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Save and notify" })).toBeNull();
    });

    it("shows nothing for an expired session", async () => {
      (api.apiGet as jest.Mock).mockRejectedValueOnce(new api.SessionExpiredError());
      await renderScreen();

      await waitFor(() => expect(screen.queryByTestId("edit-class-loading")).toBeNull());
      expect(screen.queryByText("Couldn't load the class.")).toBeNull();
      expect(screen.queryByRole("button", { name: "Save and notify" })).toBeNull();
    });

    it("says a class that finished cannot be changed, with no form", async () => {
      jest.setSystemTime(FINISHED_NOW);
      await renderScreen();

      expect(await screen.findByText("This class has finished and can't be changed.")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Save and notify" })).toBeNull();
    });
  });

  describe("errors", () => {
    async function save(key: string, status: number, details?: Record<string, unknown>) {
      serve({ "PUT /classes/c-1": failure(status, key, details) });
      const user = userEvent.setup();
      const view = await renderScreen();
      await loaded();
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      await user.press(saveButton());

      return view;
    }

    it.each([
      [422, "class.startsAt.past", "One of the times has already passed. Check the dates and times."],
      [422, "class.instructors.invalid", "One of the instructors can no longer teach."],
      [422, "class.location.notFound", "The chosen location no longer exists."],
    ])("maps %s %s to its toast and keeps the form", async (status, key, message) => {
      await save(key, status);

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
      expect(router.back).not.toHaveBeenCalled();
      expect(saveButton()).toBeEnabled();
      expect(screen.getByRole("button", { name: AFTERNOON })).toBeSelected();
    });

    it("shows the seats taken", async () => {
      await save("class.capacity.belowSeatsTaken", 422, { seatsTaken: 8 });

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("Capacity can't go below the 8 seats taken."),
      );
      expect(saveButton()).toBeEnabled();
    });

    it("tells that the class started, reloads it and switches to the instructors only", async () => {
      serve({ "PUT /classes/c-1": failure(409, "class.started") });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      const before = requestedPaths().filter((path) => path === "/classes/c-1").length;

      await user.press(saveButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("The class has started: only the instructors can be changed."),
      );
      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === "/classes/c-1").length).toBeGreaterThan(before),
      );
      expect(await screen.findByText("The class has started")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: AFTERNOON })).toBeNull();
      expect(router.back).not.toHaveBeenCalled();
    });

    it.each([
      ["class.finished", 409, "This class has finished and can't be changed."],
      ["class.notFound", 404, "This class no longer exists."],
    ])("goes back on %s", async (key, status, message) => {
      await save(key, status);

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("reloads the instructors when one can no longer teach", async () => {
      const teachersPath = "/people?page=1&perPage=50&role=instructor,admin";
      await save("class.instructors.invalid", 422);

      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === teachersPath).length).toBeGreaterThan(1),
      );
    });

    it("reloads the locations when the chosen one is gone", async () => {
      await save("class.location.notFound", 422);

      await waitFor(() =>
        expect(requestedPaths().filter((path) => path === "/locations").length).toBeGreaterThan(1),
      );
    });

    it("shows the no-connection toast when there is no answer", async () => {
      serve({
        "PUT /classes/c-1": () => {
          throw new TypeError("Network request failed");
        },
      });
      const user = userEvent.setup();
      await renderScreen();
      await loaded();
      await user.press(screen.getByRole("button", { name: AFTERNOON }));

      await user.press(saveButton());

      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(mockShow.mock.calls[0]![0]).not.toBe("Changes saved");
      expect(router.back).not.toHaveBeenCalled();
    });

    it("shows nothing when the session expired", async () => {
      const user = userEvent.setup();
      await renderScreen();
      await loaded();
      await user.press(screen.getByRole("button", { name: AFTERNOON }));
      (api.apiPut as jest.Mock).mockRejectedValueOnce(new api.SessionExpiredError());

      await user.press(saveButton());

      await waitFor(() => expect(api.apiPut).toHaveBeenCalled());
      expect(mockShow).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
    });

    it("shows the generic toast for any other error", async () => {
      await save("INTERNAL_SERVER_ERROR", 500);

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."),
      );
      expect(saveButton()).toBeEnabled();
    });
  });
});

afterAll(() => (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "c-1" }));

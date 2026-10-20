import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import type { ClassItem } from "@/modules/classes/classes.types";
import {
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { EnrolStudentScreen } from "./enrol-student.screen";

const mockShow = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the screen's header title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => options.unstable_headerLeftItems?.({})[0].element ?? options.headerTitle(),
  },
}));

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// Wednesday 2026-10-14, 10:15 in Fortaleza.
const NOW = new Date("2026-10-14T13:15:00.000Z");
const THIS_MONDAY = "2026-10-12";

const makeClass = (id: string, startsAt: string, endsAt: string, overrides: Partial<ClassItem> = {}): ClassItem => ({
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
  location: { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo", latitude: null, longitude: null },
  instructors: [{ id: "i-1", name: "Ana" }],
  seatsTaken: 0,
  students: [],
  myEnrolment: null,
  ...overrides,
});

// Today: one already started (08:00), one cancelled (14:00), one full (15:00), one open (16:00).
const STARTED = makeClass("c-started", "2026-10-14T11:00:00.000Z", "2026-10-14T12:00:00.000Z");
const CANCELLED = makeClass("c-cancelled", "2026-10-14T17:00:00.000Z", "2026-10-14T18:00:00.000Z", {
  cancelledAt: "2026-10-13T12:00:00.000Z",
});
const FULL = makeClass("c-full", "2026-10-14T18:00:00.000Z", "2026-10-14T19:00:00.000Z", {
  capacity: 2,
  seatsTaken: 2,
});
const OPEN = makeClass("c-open", "2026-10-14T19:00:00.000Z", "2026-10-14T20:00:00.000Z");

const person = (id: string, name: string) => ({
  id,
  name,
  role: "student",
  createdAt: "2026-10-01T10:00:00.000Z",
  whatsappNumber: null,
});
const ANA = person("s-ana", "Ana Souza");
const BRUNO = person("s-bruno", "Bruno Lima");

type Handlers = Record<string, () => unknown>;

function serve(
  options: { students?: ReturnType<typeof person>[]; total?: number; classes?: ClassItem[]; handlers?: Handlers } = {},
) {
  const students = options.students ?? [ANA, BRUNO];
  const classes = options.classes ?? [STARTED, CANCELLED, FULL, OPEN];

  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    const path = String(url).replace("http://api.test", "");
    const handler = options.handlers?.[`${init.method} ${path}`];

    if (handler) {
      return handler();
    }

    if (path.startsWith("/people")) {
      const page = Number(new URL(String(url)).searchParams.get("page"));

      return ok({ items: page === 1 ? students : [], page, perPage: 20, total: options.total ?? students.length });
    }

    if (path.startsWith("/classes?date=")) {
      const weekStart = new URL(String(url)).searchParams.get("date") as string;

      return ok({ weekStart, items: weekStart === THIS_MONDAY ? classes : [] });
    }

    return ok({ id: "e-1", classId: "c-open", status: "approved", requestedAt: NOW.toISOString() });
  });
}

const apiFailure = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

const posts = () => fetchMock.mock.calls.filter(([, init]) => init.method === "POST");

async function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });

  await render(
    <QueryClientProvider client={queryClient}>
      <EnrolStudentScreen />
    </QueryClientProvider>,
  );
}

const submitButton = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
  (router.back as jest.Mock).mockReset();
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

afterEach(() => jest.useRealTimers());

describe("EnrolStudentScreen", () => {
  it("shows the intro, the students and only the classes that haven't started and aren't cancelled", async () => {
    await renderScreen();

    expect(screen.getByText(/enrol a student/i)).toBeOnTheScreen();
    expect(screen.getByText("Enrol a school student in a class.")).toBeOnTheScreen();
    expect(screen.getByText("1 · Who")).toBeOnTheScreen();
    expect(screen.getByText("2 · Class")).toBeOnTheScreen();
    expect(await screen.findByRole("radio", { name: "Ana Souza" })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Bruno Lima" })).toBeOnTheScreen();
    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
    expect(screen.getByText("15:00 – 16:00")).toBeOnTheScreen();
    expect(screen.queryByText("08:00 – 09:00")).not.toBeOnTheScreen();
    expect(screen.queryByText("14:00 – 15:00")).not.toBeOnTheScreen();
    expect(requestedPaths()).toContain("/people?page=1&perPage=20&role=student");
    expect(submitButton("Enrol")).toBeDisabled();
  });

  it("enrols the picked student in the picked class, tells the admin and goes back", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByRole("radio", { name: "Ana Souza" }));
    expect(screen.getByRole("radio", { name: "Ana Souza" })).toBeSelected();
    expect(submitButton("Enrol Ana Souza")).toBeDisabled();
    await user.press(await screen.findByRole("button", { name: /16:00 – 17:00/ }));
    await user.press(submitButton("Enrol Ana Souza"));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
    expect(posts()[0][0]).toBe("http://api.test/classes/c-open/enrolments/direct");
    expect(posts()[0][1].body).toBe(JSON.stringify({ studentId: "s-ana" }));
    expect(mockShow).toHaveBeenCalledWith("Ana Souza enrolled · student notified");
  });

  it("sends once when the button is pressed twice", async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    serve({ handlers: { "POST /classes/c-open/enrolments/direct": () => pending } });
    await renderScreen();
    await user.press(await screen.findByRole("radio", { name: "Bruno Lima" }));
    await user.press(await screen.findByRole("button", { name: /16:00 – 17:00/ }));

    await user.press(submitButton("Enrol Bruno Lima"));
    await user.press(submitButton("Enrol Bruno Lima"));

    expect(posts()).toHaveLength(1);
    finish(ok({ id: "e-1", classId: "c-open", status: "approved", requestedAt: NOW.toISOString() }));
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
  });

  it("doesn't let a full class be picked", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(await screen.findByRole("radio", { name: "Ana Souza" }));

    await user.press(await screen.findByRole("button", { name: /15:00 – 16:00/ }));

    expect(submitButton("Enrol Ana Souza")).toBeDisabled();
    expect(posts()).toHaveLength(0);
  });

  it("says there are no classes on a day without any", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(await screen.findByTestId("calendar-day-2026-10-15"));

    expect(await screen.findByText("No upcoming classes on this day.")).toBeOnTheScreen();
  });

  it("says no student was found", async () => {
    serve({ students: [] });
    await renderScreen();

    expect(await screen.findByText("No students found.")).toBeOnTheScreen();
  });

  it("searches the students once the typing stops", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await screen.findByRole("radio", { name: "Ana Souza" });

    await user.type(screen.getByLabelText("Search students"), "Bru");

    await waitFor(() => expect(requestedPaths()).toContain("/people?page=1&perPage=20&role=student&search=Bru"));
  });

  it("loads the next page of students when the list is scrolled to its end", async () => {
    serve({ total: 40 });
    await renderScreen();
    const list = await screen.findByTestId("enrol-student-students");

    fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { y: 200 },
        layoutMeasurement: { height: 288 },
        contentSize: { height: 500 },
      },
    });

    await waitFor(() => expect(requestedPaths()).toContain("/people?page=2&perPage=20&role=student"));
  });

  it("shows a spinner under the list while the next page loads", async () => {
    let finish: (value: unknown) => void = () => undefined;
    const pending = new Promise((resolve) => {
      finish = resolve;
    });
    serve({ total: 40, handlers: { "GET /people?page=2&perPage=20&role=student": () => pending } });
    await renderScreen();
    const list = await screen.findByTestId("enrol-student-students");

    fireEvent.scroll(list, {
      nativeEvent: { contentOffset: { y: 200 }, layoutMeasurement: { height: 288 }, contentSize: { height: 500 } },
    });

    expect(await screen.findByTestId("enrol-student-more-loading")).toBeOnTheScreen();
    finish(ok({ items: [person("s-caio", "Caio Dias")], page: 2, perPage: 20, total: 40 }));
    expect(await screen.findByRole("radio", { name: "Caio Dias" })).toBeOnTheScreen();
    expect(screen.queryByTestId("enrol-student-more-loading")).not.toBeOnTheScreen();
  });

  it("does not load more while the list is far from its end", async () => {
    serve({ total: 40 });
    await renderScreen();
    const list = await screen.findByTestId("enrol-student-students");

    fireEvent.scroll(list, {
      nativeEvent: { contentOffset: { y: 0 }, layoutMeasurement: { height: 288 }, contentSize: { height: 900 } },
    });

    expect(requestedPaths().filter((path) => path.includes("page=2"))).toHaveLength(0);
  });

  it("shows the loading states and retries both lists after a failure", async () => {
    const user = userEvent.setup();
    let fail: (value: unknown) => void = () => undefined;
    const failing = new Promise((resolve) => {
      fail = resolve;
    });
    fetchMock.mockImplementation(() => failing);
    await renderScreen();

    expect(screen.getByTestId("enrol-student-students-loading")).toBeOnTheScreen();
    expect(screen.getByTestId("enrol-student-classes-loading")).toBeOnTheScreen();
    fail(failure(500));
    const retries = await screen.findAllByRole("button", { name: "Try again" });
    expect(retries).toHaveLength(2);

    serve();
    await user.press(retries[0]);
    await user.press(retries[1]);

    expect(await screen.findByRole("radio", { name: "Ana Souza" })).toBeOnTheScreen();
    expect(await screen.findByText("16:00 – 17:00")).toBeOnTheScreen();
  });

  it.each([
    ["enrolment.alreadyApproved", 409, "This student is already enrolled in this class."],
    ["enrolment.class.full", 409, "The class just filled up."],
    ["class.started", 409, "The class has already started."],
    ["class.cancelled", 409, "This class was cancelled."],
    ["enrolment.student.invalid", 422, "This student can't be enrolled."],
  ])("shows the toast for %s and reloads the classes", async (key, status, message) => {
    const user = userEvent.setup();
    serve({ handlers: { "POST /classes/c-open/enrolments/direct": () => apiFailure(status, key) } });
    await renderScreen();
    await user.press(await screen.findByRole("radio", { name: "Ana Souza" }));
    await user.press(await screen.findByRole("button", { name: /16:00 – 17:00/ }));
    const before = requestedPaths().filter((path) => path.startsWith("/classes?date=")).length;

    await user.press(submitButton("Enrol Ana Souza"));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
    expect(router.back).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(requestedPaths().filter((path) => path.startsWith("/classes?date=")).length).toBeGreaterThan(before),
    );
    expect(submitButton("Enrol Ana Souza")).toBeDisabled();
  });

  it("shows a generic toast for any other failure and keeps the selection", async () => {
    const user = userEvent.setup();
    serve({ handlers: { "POST /classes/c-open/enrolments/direct": () => failure(500) } });
    await renderScreen();
    await user.press(await screen.findByRole("radio", { name: "Ana Souza" }));
    await user.press(await screen.findByRole("button", { name: /16:00 – 17:00/ }));

    await user.press(submitButton("Enrol Ana Souza"));

    await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
    expect(submitButton("Enrol Ana Souza")).toBeEnabled();
  });
});

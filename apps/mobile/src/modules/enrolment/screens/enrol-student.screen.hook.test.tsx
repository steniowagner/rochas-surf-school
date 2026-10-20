import { act, renderHook, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import {
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";
import { SessionExpiredError } from "@/services/api";

import { useEnrolStudentScreen } from "./enrol-student.screen.hook";

const mockShow = jest.fn();
const mockMutate = jest.fn();

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("../hooks/use-enrol-student.hook", () => ({
  useEnrolStudent: () => ({ mutateAsync: mockMutate }),
}));

// Wednesday 2026-10-14, 10:15 in Fortaleza.
const NOW = new Date("2026-10-14T13:15:00.000Z");

const OPEN = {
  id: "c-open",
  discipline: "surf",
  level: "beginner",
  startsAt: "2026-10-14T19:00:00.000Z",
  endsAt: "2026-10-14T20:00:00.000Z",
  capacity: 8,
  notes: null,
  cancelledAt: null,
  cancellationMessage: null,
  cancellationDeadline: null,
  location: { id: "l-1", name: "Praia", address: "Av.", latitude: null, longitude: null },
  instructors: [],
  seatsTaken: 0,
  students: [],
  myEnrolment: null,
};
const ANA = { id: "s-ana", name: "Ana Souza", role: "student", createdAt: "2026-10-01T10:00:00.000Z", whatsappNumber: null };

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
  mockMutate.mockReset();
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
  fetchMock.mockImplementation(async (url: string) => {
    if (String(url).includes("/people")) {
      return ok({ items: [ANA], page: 1, perPage: 20, total: 1 });
    }

    const weekStart = new URL(String(url)).searchParams.get("date");

    return ok({ weekStart, items: weekStart === "2026-10-12" ? [OPEN] : [] });
  });
});

afterEach(() => jest.useRealTimers());

async function setup() {
  const view = await renderHook(() => useEnrolStudentScreen(), {
    wrapper: createWrapper(createQueryClient()),
  });
  await waitFor(() => expect(view.result.current.students).toHaveLength(1));
  await waitFor(() => expect(view.result.current.dayItems).toHaveLength(1));
  await act(async () => {
    view.result.current.selectStudent(view.result.current.students[0]);
    view.result.current.selectClass("c-open");
  });

  return view;
}

describe("useEnrolStudentScreen", () => {
  it("has nothing to submit until a student and a class are picked", async () => {
    const { result } = await renderHook(() => useEnrolStudentScreen(), {
      wrapper: createWrapper(createQueryClient()),
    });

    expect(result.current.submit).toBeUndefined();
  });

  it("sends once when submitted twice in the same frame", async () => {
    let finish: (value: unknown) => void = () => undefined;
    mockMutate.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = await setup();

    await act(async () => {
      void result.current.submit?.();
      void result.current.submit?.();
    });
    finish({});
    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({ classId: "c-open", studentId: "s-ana" });
  });

  it("shows no toast for an expired session, which the session flow handles", async () => {
    mockMutate.mockRejectedValue(new SessionExpiredError());
    const { result } = await setup();

    await act(async () => {
      await result.current.submit?.();
    });

    expect(mockShow).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("asks for no next page when there is none", async () => {
    const { result } = await setup();
    const before = requestedPaths().length;

    await act(async () => result.current.loadMoreStudents());

    expect(requestedPaths()).toHaveLength(before);
  });

  it("keeps the range when the calendar reports the same one again", async () => {
    const { result } = await setup();
    const range = { from: "2026-10-05", to: "2026-10-18" };

    await act(async () => result.current.updateVisibleRange(range));
    await act(async () => result.current.updateVisibleRange({ ...range }));

    expect(result.current.dayItems).toHaveLength(1);
  });
});

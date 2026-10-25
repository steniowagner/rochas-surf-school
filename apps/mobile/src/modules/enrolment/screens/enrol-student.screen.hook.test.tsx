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
import i18n from "@/i18n";
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

describe("useEnrolStudentScreen steps", () => {
  async function bare() {
    const view = await renderHook(() => useEnrolStudentScreen(), {
      wrapper: createWrapper(createQueryClient()),
    });
    await waitFor(() => expect(view.result.current.students).toHaveLength(1));
    await waitFor(() => expect(view.result.current.dayItems).toHaveLength(1));

    return view;
  }

  it("starts on the Quem step with nothing done", async () => {
    const { result } = await bare();

    expect(result.current.step).toBe("who");
    expect(result.current.isWhoDone).toBe(false);
    expect(result.current.isClassDone).toBe(false);
    expect(result.current.whoValue).toBeNull();
    expect(result.current.classValue).toBeNull();
  });

  it("does not open the Aula step before a person is ready, but always opens Quem", async () => {
    const { result } = await bare();

    await act(async () => result.current.goToStep("class"));
    expect(result.current.step).toBe("who");

    await act(async () => result.current.selectStudent(result.current.students[0]));
    await act(async () => result.current.goToStep("class"));
    expect(result.current.step).toBe("class");

    await act(async () => result.current.goToStep("who"));
    expect(result.current.step).toBe("who");
  });

  it("finishes Quem with a picked student, showing the name", async () => {
    const { result } = await bare();

    await act(async () => result.current.selectStudent(result.current.students[0]));

    expect(result.current.isWhoDone).toBe(true);
    expect(result.current.whoValue).toBe("Ana Souza");
  });

  it("finishes Quem in trial mode only with a full name and a valid number, showing the trimmed name", async () => {
    const { result } = await bare();

    await act(async () => result.current.selectStudent(result.current.students[0]));
    await act(async () => result.current.setMode("trial"));
    expect(result.current.isWhoDone).toBe(false);

    await act(async () => result.current.setGuestName("  Carolina Reis "));
    expect(result.current.isWhoDone).toBe(false);

    await act(async () => result.current.phone.numberInput.onChangeText("85999990000"));
    expect(result.current.isWhoDone).toBe(true);
    expect(result.current.whoValue).toBe("Carolina Reis");

    await act(async () => result.current.setMode("student"));
    expect(result.current.whoValue).toBe("Ana Souza");
  });

  it("finishes Aula with a class that has a free seat, and clears it on another day", async () => {
    const { result } = await bare();

    await act(async () => result.current.selectClass("c-open"));
    expect(result.current.isClassDone).toBe(true);

    await act(async () => result.current.selectDate("2026-10-15"));
    expect(result.current.isClassDone).toBe(false);
    expect(result.current.classValue).toBeNull();
  });

  it("keeps the selections when moving between steps", async () => {
    const { result } = await bare();

    await act(async () => {
      result.current.selectStudent(result.current.students[0]);
      result.current.selectClass("c-open");
    });
    await act(async () => result.current.goToStep("class"));
    await act(async () => result.current.goToStep("who"));
    await act(async () => result.current.goToStep("class"));

    expect(result.current.selectedStudent?.id).toBe("s-ana");
    expect(result.current.selectedClassId).toBe("c-open");
  });

  it("starts on every sport and narrows the day's classes to the chosen one", async () => {
    const { result } = await bare();
    expect(result.current.discipline).toBe("all");

    await act(async () => result.current.selectDiscipline("skate"));
    expect(result.current.discipline).toBe("skate");
    expect(result.current.dayItems).toHaveLength(0);

    await act(async () => result.current.selectDiscipline("surf"));
    expect(result.current.dayItems).toHaveLength(1);
  });

  it.each([
    ["en-US", "Wed 14 · 16:00"],
    ["pt-BR", "Qua 14 · 16:00"],
    ["es-ES", "Mié 14 · 16:00"],
  ])("writes the class value in %s", async (language, expected) => {
    await i18n.changeLanguage(language);
    const { result } = await bare();

    await act(async () => result.current.selectClass("c-open"));

    expect(result.current.classValue).toBe(expected);
  });
});

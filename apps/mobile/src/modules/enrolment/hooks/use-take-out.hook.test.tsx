import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import * as api from "@/services/api";

import { useTakeOut } from "./use-take-out.hook";

const mockShow = jest.fn();

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const TARGET = { name: "Ana Souza", enrolmentId: "e-1" };

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

async function setup() {
  const reload = jest.fn();
  const view = await renderHook(() => useTakeOut(reload), {
    wrapper: createWrapper(createQueryClient()),
  });

  return { ...view, reload };
}

describe("useTakeOut", () => {
  it("opens and closes for a student", async () => {
    const { result } = await setup();

    expect(result.current.target).toBeNull();
    await act(async () => result.current.open(TARGET));
    expect(result.current.target).toEqual(TARGET);
    await act(async () => result.current.close());
    expect(result.current.target).toBeNull();
  });

  it("does nothing when confirmed with no student", async () => {
    const { result } = await setup();

    await act(async () => result.current.confirm("x"));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("takes the student out, tells the admin and closes", async () => {
    fetchMock.mockResolvedValue(ok({ id: "e-1", classId: "c-1", status: "takenOut", requestedAt: "x" }));
    const { result, reload } = await setup();
    await act(async () => result.current.open(TARGET));

    await act(async () => result.current.confirm("Nível avançado"));

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/enrolments/e-1/take-out");
    expect(mockShow).toHaveBeenCalledWith("Ana Souza taken out · student notified", { tone: "success" });
    expect(result.current.target).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("closes and reloads the class when the seat or the class changed, with its toast", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ errors: ["enrolment.notApproved"] }) });
    const { result, reload } = await setup();
    await act(async () => result.current.open(TARGET));

    await act(async () => result.current.confirm(""));

    expect(mockShow).toHaveBeenCalledWith("This spot is no longer approved.");
    expect(result.current.target).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("keeps the student open on any other failure, and shows nothing for an expired session", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result, reload } = await setup();
    await act(async () => result.current.open(TARGET));

    await act(async () => result.current.confirm(""));

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.target).toEqual(TARGET);
    expect(reload).not.toHaveBeenCalled();
  });

  it("shows nothing for an expired session, which the session flow handles", async () => {
    const { result } = await setup();
    await act(async () => result.current.open(TARGET));
    jest.mocked(api.apiPost).mockRejectedValueOnce(new api.SessionExpiredError());

    await act(async () => result.current.confirm(""));

    expect(mockShow).not.toHaveBeenCalled();
    expect(result.current.target).toEqual(TARGET);
  });
});

import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useEnrolStudent } from "./use-enrol-student.hook";
import { useTakeStudentOut } from "./use-take-student-out.hook";

beforeEach(setupSignedInUser);

const answer = (status: string) => ({
  id: "e-1",
  classId: "c-1",
  status,
  requestedAt: "2026-10-14T13:00:00.000Z",
});

function seededClient() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["enrolments", "pending"], { total: 1, classes: [] });
  queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
  return queryClient;
}

const invalidated = (queryClient: ReturnType<typeof createQueryClient>) => [
  queryClient.getQueryState(["enrolments", "pending"])?.isInvalidated,
  queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated,
];

describe("useEnrolStudent", () => {
  it("posts the student, authenticated, and refreshes the requests and the classes", async () => {
    fetchMock.mockResolvedValue(ok(answer("approved")));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useEnrolStudent(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ classId: "c-1", studentId: "s-1" });
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/c-1/enrolments/direct", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({ studentId: "s-1" }),
    });
    expect(invalidated(queryClient)).toEqual([true, true]);
  });

  it("invalidates nothing and does not retry when it fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useEnrolStudent(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ classId: "c-1", studentId: "s-1" }),
      ).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidated(queryClient)).toEqual([false, false]);
  });
});

describe("useTakeStudentOut", () => {
  it("posts the reason and refreshes the requests and the classes", async () => {
    fetchMock.mockResolvedValue(ok(answer("takenOut")));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useTakeStudentOut(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "e-1", reason: "Nível avançado" });
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/enrolments/e-1/take-out", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({ reason: "Nível avançado" }),
    });
    expect(invalidated(queryClient)).toEqual([true, true]);
  });

  it("sends no reason for a blank one, and does not retry a failure", async () => {
    fetchMock.mockResolvedValueOnce(ok(answer("takenOut"))).mockResolvedValueOnce(failure(409));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useTakeStudentOut(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "e-1", reason: "   " });
    });
    expect(fetchMock.mock.calls[0][1].body).toBe("{}");

    await act(async () => {
      await expect(result.current.mutateAsync({ id: "e-1", reason: "x" })).rejects.toBeDefined();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

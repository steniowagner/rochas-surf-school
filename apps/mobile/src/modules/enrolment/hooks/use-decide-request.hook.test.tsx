import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useApproveRequest } from "./use-approve-request.hook";
import { useDenyRequest } from "./use-deny-request.hook";

beforeEach(setupSignedInUser);

const decided = (status: string) => ({
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

describe("useApproveRequest", () => {
  it("posts the approval, authenticated, and refreshes the tool and the classes", async () => {
    fetchMock.mockResolvedValue(ok(decided("approved")));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("e-1");
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/enrolments/e-1/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: "{}",
    });
    expect(invalidated(queryClient)).toEqual([true, true]);
  });

  it("invalidates nothing and does not retry when it fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useApproveRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync("e-1")).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidated(queryClient)).toEqual([false, false]);
  });
});

describe("useDenyRequest", () => {
  it("posts the reason and refreshes the tool and the classes", async () => {
    fetchMock.mockResolvedValue(ok(decided("denied")));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useDenyRequest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "e-1", reason: "Nível avançado" });
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/enrolments/e-1/deny", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({ reason: "Nível avançado" }),
    });
    expect(invalidated(queryClient)).toEqual([true, true]);
  });

  it("sends no reason for a blank one, and does not retry a failure", async () => {
    fetchMock.mockResolvedValueOnce(ok(decided("denied"))).mockResolvedValueOnce(failure(409));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useDenyRequest(), {
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

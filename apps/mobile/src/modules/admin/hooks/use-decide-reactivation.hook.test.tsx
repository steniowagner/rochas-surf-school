import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "@/services/api";

import {
  CARLA,
  DAVI,
  createQueryClient,
  createWrapper,
  fetchMock,
  respond,
  setupSignedInAdmin,
} from "../registrations.test-utils";
import { REACTIVATIONS_QUERY_KEY } from "../utils/reactivations-cache";

import { useApproveReactivation } from "./use-approve-reactivation.hook";
import { useDenyReactivation } from "./use-deny-reactivation.hook";

beforeEach(setupSignedInAdmin);

function seed() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(REACTIVATIONS_QUERY_KEY, { items: [CARLA, DAVI] });
  return queryClient;
}

describe("useApproveReactivation", () => {
  it("posts the approval and takes the account out of the cached list", async () => {
    const queryClient = seed();
    respond(200, { id: "c", decision: "approved" });
    const { result } = await renderHook(() => useApproveReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("c");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/reactivation-requests/c/approve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer at-1" }),
      }),
    );
    expect(queryClient.getQueryData(REACTIVATIONS_QUERY_KEY)).toEqual({
      items: [DAVI],
    });
  });

  it("keeps the list and does not retry on a generic error", async () => {
    const queryClient = seed();
    respond(500, { errors: ["INTERNAL_SERVER_ERROR"] });
    const { result } = await renderHook(() => useApproveReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("c").catch(() => {});
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(REACTIVATIONS_QUERY_KEY)).toEqual({
      items: [CARLA, DAVI],
    });
  });

  it("reloads the list on 409 already decided", async () => {
    const queryClient = seed();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    respond(409, { errors: ["reactivation.status.notRequested"] });
    const { result } = await renderHook(() => useApproveReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    let error: unknown;
    await act(async () => {
      error = await result.current.mutateAsync("c").catch((e) => e);
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: REACTIVATIONS_QUERY_KEY,
    });
  });
});

describe("useDenyReactivation", () => {
  it("posts the reason and takes the account out of the cached list", async () => {
    const queryClient = seed();
    respond(200, { id: "d", decision: "denied" });
    const { result } = await renderHook(() => useDenyReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "d", reason: "Turmas cheias." });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/reactivation-requests/d/deny",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Turmas cheias." }),
      }),
    );
    expect(queryClient.getQueryData(REACTIVATIONS_QUERY_KEY)).toEqual({
      items: [CARLA],
    });
  });

  it.each(["", "   "])("sends no reason for %p", async (reason) => {
    const queryClient = seed();
    respond(200, { id: "d", decision: "denied" });
    const { result } = await renderHook(() => useDenyReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "d", reason });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/reactivation-requests/d/deny",
      expect.objectContaining({ body: JSON.stringify({}) }),
    );
  });

  it("keeps the list on a generic error", async () => {
    const queryClient = seed();
    respond(500, { errors: ["INTERNAL_SERVER_ERROR"] });
    const { result } = await renderHook(() => useDenyReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ id: "d", reason: "x" })
        .catch(() => {});
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(REACTIVATIONS_QUERY_KEY)).toEqual({
      items: [CARLA, DAVI],
    });
  });

  it("reloads the list on 409 already decided", async () => {
    const queryClient = seed();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    respond(409, { errors: ["reactivation.status.notRequested"] });
    const { result } = await renderHook(() => useDenyReactivation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ id: "d", reason: "x" })
        .catch(() => {});
    });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: REACTIVATIONS_QUERY_KEY,
    });
  });
});

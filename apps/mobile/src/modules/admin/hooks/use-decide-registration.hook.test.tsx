import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "@/services/api";

import {
  ANA,
  BRUNO,
  createQueryClient,
  createWrapper,
  fetchMock,
  respond,
  setupSignedInAdmin,
} from "../registrations.test-utils";
import { REGISTRATIONS_QUERY_KEY } from "../utils/registrations-cache";

import { useApproveRegistration } from "./use-approve-registration.hook";
import { useDenyRegistration } from "./use-deny-registration.hook";

beforeEach(setupSignedInAdmin);

function seed() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(REGISTRATIONS_QUERY_KEY, { items: [ANA, BRUNO] });
  return queryClient;
}

describe("useApproveRegistration", () => {
  it("posts the approval and takes the person out of the cached list", async () => {
    const queryClient = seed();
    respond(200, { id: "a", status: "approved" });
    const { result } = await renderHook(() => useApproveRegistration(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("a");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/registrations/a/approve",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer at-1" }),
      }),
    );
    expect(queryClient.getQueryData(REGISTRATIONS_QUERY_KEY)).toEqual({
      items: [BRUNO],
    });
  });

  it("keeps the list and does not retry on a generic error", async () => {
    const queryClient = seed();
    respond(500, { errors: ["INTERNAL_SERVER_ERROR"] });
    const { result } = await renderHook(() => useApproveRegistration(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("a").catch(() => {});
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(REGISTRATIONS_QUERY_KEY)).toEqual({
      items: [ANA, BRUNO],
    });
  });

  it("refetches the list on 409 already decided", async () => {
    const queryClient = seed();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    respond(409, { errors: ["registration.status.notPending"] });
    const { result } = await renderHook(() => useApproveRegistration(), {
      wrapper: createWrapper(queryClient),
    });

    let error: unknown;
    await act(async () => {
      error = await result.current.mutateAsync("a").catch((e) => e);
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: REGISTRATIONS_QUERY_KEY,
    });
  });
});

describe("useDenyRegistration", () => {
  it("posts the reason and takes the person out of the cached list", async () => {
    const queryClient = seed();
    respond(200, { id: "b", status: "denied" });
    const { result } = await renderHook(() => useDenyRegistration(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "b", reason: "Unknown" });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/registrations/b/deny",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Unknown" }),
      }),
    );
    expect(queryClient.getQueryData(REGISTRATIONS_QUERY_KEY)).toEqual({
      items: [ANA],
    });
  });

  it.each(["", "   "])("sends no reason for %p", async (reason) => {
    const queryClient = seed();
    respond(200, { id: "b", status: "denied" });
    const { result } = await renderHook(() => useDenyRegistration(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "b", reason });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/registrations/b/deny",
      expect.objectContaining({ body: JSON.stringify({}) }),
    );
  });

  it("keeps the list on an error and refetches on 409", async () => {
    const queryClient = seed();
    respond(500, { errors: [] });
    const { result } = await renderHook(() => useDenyRegistration(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "b", reason: "" }).catch(() => {});
    });
    expect(queryClient.getQueryData(REGISTRATIONS_QUERY_KEY)).toEqual({
      items: [ANA, BRUNO],
    });

    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    respond(409, { errors: ["registration.status.notPending"] });
    await act(async () => {
      await result.current.mutateAsync({ id: "b", reason: "" }).catch(() => {});
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: REGISTRATIONS_QUERY_KEY,
    });
  });
});

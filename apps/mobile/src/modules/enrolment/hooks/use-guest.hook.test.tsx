import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useAddGuest } from "./use-add-guest.hook";
import { useRemoveGuest } from "./use-remove-guest.hook";

beforeEach(setupSignedInUser);

function seededClient() {
  const queryClient = createQueryClient();
  queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
  return queryClient;
}

const isInvalidated = (queryClient: ReturnType<typeof createQueryClient>) =>
  queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated;

describe("useAddGuest", () => {
  it("posts the name and the number, authenticated, and refreshes the classes", async () => {
    fetchMock.mockResolvedValue(
      ok({ id: "g-1", classId: "c-1", name: "Carolina Reis" }),
    );
    const queryClient = seededClient();
    const { result } = await renderHook(() => useAddGuest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({
        classId: "c-1",
        name: "Carolina Reis",
        whatsappNumber: "+5585999990000",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/classes/c-1/guests",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer at-1",
        },
        body: JSON.stringify({
          name: "Carolina Reis",
          whatsappNumber: "+5585999990000",
        }),
      },
    );
    expect(isInvalidated(queryClient)).toBe(true);
  });

  it("invalidates nothing and does not retry when it fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useAddGuest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          classId: "c-1",
          name: "Carolina Reis",
          whatsappNumber: "+5585999990000",
        }),
      ).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isInvalidated(queryClient)).toBe(false);
  });
});

describe("useRemoveGuest", () => {
  it("deletes the guest, authenticated, and refreshes the classes", async () => {
    fetchMock.mockResolvedValue(ok(undefined));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useRemoveGuest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "g-1" });
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/guests/g-1", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer at-1",
      },
      body: undefined,
    });
    expect(isInvalidated(queryClient)).toBe(true);
  });

  it("invalidates nothing and does not retry when it fails", async () => {
    fetchMock.mockResolvedValue(failure(404));
    const queryClient = seededClient();
    const { result } = await renderHook(() => useRemoveGuest(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ id: "g-1" }),
      ).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isInvalidated(queryClient)).toBe(false);
  });
});

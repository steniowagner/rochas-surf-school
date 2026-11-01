import { renderHook, waitFor } from "@testing-library/react-native";

import {
  buildNotification,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requests,
  setupSignedInUser,
} from "../notifications.test-utils";

import { useNotification } from "./use-notification.hook";

beforeEach(() => setupSignedInUser());

describe("useNotification", () => {
  it("reads one notification in the app's language", async () => {
    const notification = buildNotification(1);
    fetchMock.mockResolvedValue(ok(notification));

    const { result } = await renderHook(() => useNotification("n-1", { enabled: true }), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual(notification));
    expect(requests()).toEqual([{ method: "GET", path: "/notifications/n-1?locale=en" }]);
  });

  it("reads nothing when it isn't enabled", async () => {
    const { result } = await renderHook(() => useNotification("n-1", { enabled: false }), {
      wrapper: createWrapper(createQueryClient()),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads nothing without an id", async () => {
    const { result } = await renderHook(() => useNotification(null, { enabled: true }), {
      wrapper: createWrapper(createQueryClient()),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doesn't retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(404));

    const { result } = await renderHook(() => useNotification("n-1", { enabled: true }), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

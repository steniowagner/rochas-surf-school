import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../notifications.test-utils";

import { useUnreadNotificationsCount } from "./use-unread-notifications-count.hook";

const render = () =>
  renderHook(() => useUnreadNotificationsCount(), {
    wrapper: createWrapper(createQueryClient()),
  });

beforeEach(() => setupSignedInUser());

describe("useUnreadNotificationsCount", () => {
  it("answers the unread count, authenticated", async () => {
    fetchMock.mockResolvedValue(ok({ count: 3 }));

    const { result } = await render();

    expect(result.current.count).toBe(0);
    await waitFor(() => expect(result.current.count).toBe(3));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/notifications/unread-count", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("answers 0 when the count fails, without retrying", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.count).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("answers 0 after a failed reload, even with an older count", async () => {
    fetchMock.mockResolvedValueOnce(ok({ count: 4 })).mockResolvedValueOnce(failure());
    const { result } = await render();
    await waitFor(() => expect(result.current.count).toBe(4));

    await result.current.refetch();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.count).toBe(0);
  });
});

import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  buildPage,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  noContent,
  ok,
  requests,
  setupSignedInUser,
} from "../notifications.test-utils";
import {
  NOTIFICATIONS_LIST_QUERY_KEY,
  NotificationsListData,
  UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY,
} from "../utils/notifications-cache";

import { useMarkNotificationRead } from "./use-mark-notification-read.hook";

const seed = () => {
  const queryClient = createQueryClient();
  const page = buildPage(1, 3, 3);
  page.items[2] = { ...page.items[2], read: true };
  queryClient.setQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY, {
    pages: [page],
    pageParams: [1],
  });
  queryClient.setQueryData(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY, { count: 2 });
  return queryClient;
};

const render = async (queryClient = seed()) => ({
  queryClient,
  ...(await renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper(queryClient) })),
});

const readStates = (queryClient: ReturnType<typeof seed>) =>
  queryClient
    .getQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY)!
    .pages.flatMap((page) => page.items.map((item) => item.read));

const count = (queryClient: ReturnType<typeof seed>) =>
  queryClient.getQueryData<{ count: number }>(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY)?.count;

const countInvalidated = (queryClient: ReturnType<typeof seed>) =>
  queryClient.getQueryState(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY)?.isInvalidated;

beforeEach(() => setupSignedInUser());

describe("useMarkNotificationRead", () => {
  it("shows the row read and drops the badge at once, then sends the mark and reloads the count", async () => {
    let answer: (value: unknown) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.endsWith("/read")
        ? new Promise((resolve) => (answer = resolve))
        : Promise.resolve(ok({ count: 1 })),
    );
    const { queryClient, result } = await render();

    await act(async () => {
      result.current.mutate("n-0");
    });

    await waitFor(() => expect(readStates(queryClient)).toEqual([true, false, true]));
    expect(count(queryClient)).toBe(1);
    expect(requests()[0]).toEqual({ method: "POST", path: "/notifications/n-0/read" });

    await act(async () => answer(noContent()));

    await waitFor(() => expect(countInvalidated(queryClient)).toBe(true));
  });

  it("keeps the badge for a row that was already read", async () => {
    fetchMock.mockResolvedValue(noContent());
    const { queryClient, result } = await render();

    await act(async () => {
      await result.current.mutateAsync("n-2");
    });

    expect(count(queryClient)).toBe(2);
  });

  it("is silent on failure and still reloads the count", async () => {
    fetchMock.mockResolvedValue(failure());
    const { queryClient, result } = await render();

    await act(async () => {
      await result.current.mutateAsync("n-0").catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readStates(queryClient)).toEqual([true, false, true]);
    expect(countInvalidated(queryClient)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("works with nothing cached", async () => {
    fetchMock.mockResolvedValue(noContent());
    const queryClient = createQueryClient();
    const { result } = await render(queryClient);

    await act(async () => {
      await result.current.mutateAsync("n-9");
    });

    expect(queryClient.getQueryData(NOTIFICATIONS_LIST_QUERY_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY)).toBeUndefined();
  });
});

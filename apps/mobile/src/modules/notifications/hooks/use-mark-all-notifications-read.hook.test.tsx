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

import { useMarkAllNotificationsRead } from "./use-mark-all-notifications-read.hook";

const seed = () => {
  const queryClient = createQueryClient();
  const first = buildPage(1, 2, 3);
  const second = buildPage(2, 1, 3);
  first.items[1] = { ...first.items[1], read: true };
  queryClient.setQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY, {
    pages: [first, second],
    pageParams: [1, 2],
  });
  queryClient.setQueryData(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY, { count: 2 });
  return queryClient;
};

const render = async (queryClient = seed()) => ({
  queryClient,
  ...(await renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper(queryClient) })),
});

const readStates = (queryClient: ReturnType<typeof seed>) =>
  queryClient
    .getQueryData<NotificationsListData>(NOTIFICATIONS_LIST_QUERY_KEY)
    ?.pages.flatMap((page) => page.items.map((item) => item.read));

const count = (queryClient: ReturnType<typeof seed>) =>
  queryClient.getQueryData<{ count: number }>(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY)?.count;

const countInvalidated = (queryClient: ReturnType<typeof seed>) =>
  queryClient.getQueryState(UNREAD_NOTIFICATIONS_COUNT_QUERY_KEY)?.isInvalidated;

beforeEach(() => setupSignedInUser());

describe("useMarkAllNotificationsRead", () => {
  it("clears every row and the badge at once, then sends read-all and reloads the count", async () => {
    let answer: (value: unknown) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.endsWith("/read-all")
        ? new Promise((resolve) => (answer = resolve))
        : Promise.resolve(ok({ count: 0 })),
    );
    const { queryClient, result } = await render();

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(readStates(queryClient)).toEqual([true, true, true]));
    expect(count(queryClient)).toBe(0);
    expect(requests()[0]).toEqual({ method: "POST", path: "/notifications/read-all" });

    await act(async () => answer(noContent()));

    await waitFor(() => expect(countInvalidated(queryClient)).toBe(true));
    expect(readStates(queryClient)).toEqual([true, true, true]);
  });

  it("puts the rows and the badge back when the request fails", async () => {
    fetchMock.mockResolvedValue(failure());
    const { queryClient, result } = await render();

    await act(async () => {
      await result.current.mutateAsync().catch(() => {});
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readStates(queryClient)).toEqual([false, true, false]);
    expect(count(queryClient)).toBe(2);
  });

  it("works with nothing cached", async () => {
    fetchMock.mockResolvedValue(failure());
    const queryClient = createQueryClient();
    const { result } = await render(queryClient);

    await act(async () => {
      await result.current.mutateAsync().catch(() => {});
    });

    expect(readStates(queryClient)).toBeUndefined();
    expect(count(queryClient)).toBeUndefined();
  });
});

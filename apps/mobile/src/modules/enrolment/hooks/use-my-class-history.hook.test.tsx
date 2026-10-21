import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  buildClassItem,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useMyClassHistory } from "./use-my-class-history.hook";

const item = (index: number) =>
  buildClassItem(`c-${index}`, "2026-10-01T11:00:00.000Z", "2026-10-01T12:00:00.000Z");

const page = (number: number, from: number, count: number, total: number) => ({
  items: Array.from({ length: count }, (_, index) => item(from + index)),
  page: number,
  perPage: 20,
  total,
});

const render = () =>
  renderHook(() => useMyClassHistory(), { wrapper: createWrapper(createQueryClient()) });

beforeEach(setupSignedInUser);

describe("useMyClassHistory", () => {
  it("loads page 1 of 20, authenticated", async () => {
    fetchMock.mockResolvedValue(ok(page(1, 0, 3, 3)));

    const { result } = await render();

    await waitFor(() => expect(result.current.classes).toHaveLength(3));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/mine/history?page=1&perPage=20", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
    expect(result.current.hasNextPage).toBe(false);
  });

  it("loads the next page while there are more classes, and stops at the end", async () => {
    fetchMock.mockResolvedValueOnce(ok(page(1, 0, 20, 25))).mockResolvedValueOnce(ok(page(2, 20, 5, 25)));
    const { result } = await render();
    await waitFor(() => expect(result.current.classes).toHaveLength(20));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.classes).toHaveLength(25));
    expect(requestedPaths()[1]).toBe("/classes/mine/history?page=2&perPage=20");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("drops a class repeated across pages", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(page(1, 0, 20, 21)))
      .mockResolvedValueOnce(ok({ ...page(2, 19, 2, 22) }));
    const { result } = await render();
    await waitFor(() => expect(result.current.classes).toHaveLength(20));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.classes).toHaveLength(21));
    expect(result.current.classes.map((each) => each.id).slice(-2)).toEqual(["c-19", "c-20"]);
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.classes).toEqual([]);
  });
});

import { renderHook, waitFor } from "@testing-library/react-native";

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

import { MyClassHistoryPeriod } from "../enrolment.types";
import { useMyClassHistory } from "./use-my-class-history.hook";

const AUGUST = { from: "2026-08-01", to: "2026-08-31" };
const SEPTEMBER = { from: "2026-09-01", to: "2026-09-30" };

const item = (id: string) => buildClassItem(id, "2026-08-14T11:00:00.000Z", "2026-08-14T12:00:00.000Z");

const render = (period: MyClassHistoryPeriod = AUGUST, queryClient = createQueryClient()) =>
  renderHook((props: { period: MyClassHistoryPeriod }) => useMyClassHistory(props.period), {
    initialProps: { period },
    wrapper: createWrapper(queryClient),
  });

beforeEach(setupSignedInUser);

describe("useMyClassHistory", () => {
  it("loads the period, authenticated, under its own key", async () => {
    fetchMock.mockResolvedValue(ok({ items: [item("c-1"), item("c-2")] }));
    const queryClient = createQueryClient();

    const { result } = await render(AUGUST, queryClient);

    await waitFor(() => expect(result.current.data?.items).toHaveLength(2));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/mine/history?from=2026-08-01&to=2026-08-31", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
    expect(queryClient.getQueryData(["classes", "mine", "history", "2026-08-01", "2026-08-31"])).toEqual({
      items: [item("c-1"), item("c-2")],
    });
  });

  it("shows nothing for a new period until it loads, and the cached one at once when going back", async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ items: [item("c-1")] }))
      .mockResolvedValueOnce(ok({ items: [item("c-9")] }));
    const { result, rerender } = await render();
    await waitFor(() => expect(result.current.data?.items[0]?.id).toBe("c-1"));

    await rerender({ period: SEPTEMBER });

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.items[0]?.id).toBe("c-9"));

    await rerender({ period: AUGUST });

    expect(result.current.data?.items[0]?.id).toBe("c-1");
    expect(requestedPaths().slice(0, 2)).toEqual([
      "/classes/mine/history?from=2026-08-01&to=2026-08-31",
      "/classes/mine/history?from=2026-09-01&to=2026-09-30",
    ]);
  });

  it("is refreshed by an invalidation of the classes", async () => {
    fetchMock.mockResolvedValue(ok({ items: [] }));
    const queryClient = createQueryClient();
    const { result } = await render(AUGUST, queryClient);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: ["classes"] });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

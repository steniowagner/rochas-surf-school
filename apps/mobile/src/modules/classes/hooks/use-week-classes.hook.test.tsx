import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useWeekClasses } from "./use-week-classes.hook";

beforeEach(setupSignedInUser);

describe("useWeekClasses", () => {
  it("loads the week by its Monday", async () => {
    const body = { weekStart: "2026-10-12", items: [] };
    fetchMock.mockResolvedValue(ok(body));

    const { result } = await renderHook(() => useWeekClasses("2026-10-12"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual(body));
    expect(requestedPaths()).toEqual(["/classes?date=2026-10-12"]);
  });

  it("keeps one cache entry per week", async () => {
    fetchMock.mockResolvedValue(ok({ weekStart: "x", items: [] }));
    const queryClient = createQueryClient();

    await renderHook(() => useWeekClasses("2026-10-12"), {
      wrapper: createWrapper(queryClient),
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(["classes", "week", "2026-10-12"])).toBeDefined(),
    );
  });

  it("reports a failed request", async () => {
    fetchMock.mockResolvedValue(failure());
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });

    const { result } = await renderHook(() => useWeekClasses("2026-10-12"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

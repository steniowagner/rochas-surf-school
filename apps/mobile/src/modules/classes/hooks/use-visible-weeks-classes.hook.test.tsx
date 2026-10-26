import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useVisibleWeeksClasses } from "./use-visible-weeks-classes.hook";

const item = (id: string) => ({ id });

const OCTOBER = { from: "2026-09-28", to: "2026-11-01" };

const serveWeeks = (weeks: Record<string, unknown[]> = {}) =>
  fetchMock.mockImplementation(async (url: string) => {
    const weekStart = new URL(String(url)).searchParams.get("date") as string;

    return ok({ weekStart, items: weeks[weekStart] ?? [] });
  });

const setup = async (range = OCTOBER) => {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
  });
  const { result } = await renderHook(() => useVisibleWeeksClasses(range), {
    wrapper: createWrapper(queryClient),
  });

  return { queryClient, result };
};

beforeEach(setupSignedInUser);

describe("useVisibleWeeksClasses", () => {
  it("requests the Monday of every week of the range", async () => {
    serveWeeks();
    const { result } = await setup();

    await waitFor(() => expect(requestedPaths()).toHaveLength(5));
    expect(requestedPaths().sort()).toEqual([
      "/classes?date=2026-09-28",
      "/classes?date=2026-10-05",
      "/classes?date=2026-10-12",
      "/classes?date=2026-10-19",
      "/classes?date=2026-10-26",
    ]);
    expect(result.current.items).toEqual([]);
  });

  it("requests a single week for a week range", async () => {
    serveWeeks({ "2026-10-12": [item("a")] });
    const { result } = await setup({ from: "2026-10-12", to: "2026-10-18" });

    await waitFor(() => expect(result.current.items).toEqual([item("a")]));
    expect(requestedPaths()).toEqual(["/classes?date=2026-10-12"]);
  });

  it("returns the items of every week", async () => {
    serveWeeks({
      "2026-10-05": [item("a")],
      "2026-10-26": [item("b"), item("c")],
    });
    const { result } = await setup();

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items).toEqual([item("a"), item("b"), item("c")]);
  });

  it("doesn't request a week that is already loaded when the range grows", async () => {
    serveWeeks();
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({
      queries: { retry: false, gcTime: Infinity },
    });
    const { rerender } = await renderHook(
      (range: { from: string; to: string }) => useVisibleWeeksClasses(range),
      {
        initialProps: { from: "2026-10-12", to: "2026-10-18" },
        wrapper: createWrapper(queryClient),
      },
    );
    await waitFor(() => expect(requestedPaths()).toHaveLength(1));

    await rerender(OCTOBER);
    await waitFor(() => expect(requestedPaths()).toHaveLength(5));

    expect(
      requestedPaths().filter((path) => path.endsWith("2026-10-12")),
    ).toHaveLength(1);
  });

  it("leaves the items of the other weeks when one fails", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const weekStart = new URL(String(url)).searchParams.get("date") as string;

      return weekStart === "2026-10-12"
        ? failure()
        : ok({
            weekStart,
            items: weekStart === "2026-10-05" ? [item("a")] : [],
          });
    });
    const { result } = await setup();

    await waitFor(() => expect(requestedPaths()).toHaveLength(5));
    await waitFor(() => expect(result.current.items).toEqual([item("a")]));
  });

  it("refetches every week", async () => {
    serveWeeks();
    const { result } = await setup();
    await waitFor(() => expect(requestedPaths()).toHaveLength(5));

    await act(async () => {
      await result.current.refetch();
    });

    expect(requestedPaths()).toHaveLength(10);
  });
});

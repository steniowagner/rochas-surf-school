import { focusManager } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createQueryWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";

import { useNoticeRecipientsCounts } from "./use-notice-recipients-counts.hook";

const COUNTS: Record<string, number> = { all: 12, students: 8, instructors: 3 };

afterEach(() => focusManager.setFocused(undefined));

beforeEach(() => {
  setupSignedInUser();
  fetchMock.mockImplementation(async (url: string) =>
    ok({ count: COUNTS[new URL(url).searchParams.get("audience")!] }),
  );
});

const PATHS = [
  "/notifications/broadcast/recipients?audience=all",
  "/notifications/broadcast/recipients?audience=students",
  "/notifications/broadcast/recipients?audience=instructors",
];

describe("useNoticeRecipientsCounts", () => {
  it("reads the count of every audience once, in the audiences' order", async () => {
    const { result } = await renderHook(() => useNoticeRecipientsCounts(), {
      wrapper: createQueryWrapper(createQueryClient()),
    });

    await waitFor(() =>
      expect(result.current.map((query) => query.data)).toEqual([
        { count: 12 },
        { count: 8 },
        { count: 3 },
      ]),
    );
    expect(requestedPaths().sort()).toEqual([...PATHS].sort());
  });

  it("reuses the counts while the screen stays open, even when the app comes back to the foreground", async () => {
    const { result } = await renderHook(() => useNoticeRecipientsCounts(), {
      wrapper: createQueryWrapper(createQueryClient()),
    });
    await waitFor(() => expect(result.current.every((query) => query.isSuccess)).toBe(true));

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reads them again on the next visit", async () => {
    const wrapper = createQueryWrapper(createQueryClient());
    const first = await renderHook(() => useNoticeRecipientsCounts(), { wrapper });
    await waitFor(() => expect(first.result.current.every((query) => query.isSuccess)).toBe(true));
    await first.unmount();

    const second = await renderHook(() => useNoticeRecipientsCounts(), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    await waitFor(() => expect(second.result.current[1]!.data).toEqual({ count: 8 }));
  });

  it("fails without retrying", async () => {
    fetchMock.mockResolvedValue(failure(500));

    const { result } = await renderHook(() => useNoticeRecipientsCounts(), {
      wrapper: createQueryWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.every((query) => query.isError)).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

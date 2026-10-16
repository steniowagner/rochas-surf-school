import { act, renderHook } from "@testing-library/react-native";

import { NOW_TICK_MS, useNow } from "./use-now.hook";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-14T13:00:00.000Z"));
});

afterEach(() => jest.useRealTimers());

describe("useNow", () => {
  it("starts at the phone's clock and moves every minute", async () => {
    const { result } = await renderHook(() => useNow());

    expect(result.current.toISOString()).toBe("2026-10-14T13:00:00.000Z");

    await act(async () => {
      jest.advanceTimersByTime(NOW_TICK_MS);
    });

    expect(result.current.toISOString()).toBe("2026-10-14T13:01:00.000Z");
  });

  it("stops ticking when unmounted", async () => {
    const clear = jest.spyOn(globalThis, "clearInterval");
    const { unmount } = await renderHook(() => useNow());

    await unmount();

    expect(clear).toHaveBeenCalledTimes(1);
  });
});

import { act, renderHook } from "@testing-library/react-native";

import { useDebouncedValue } from "./use-debounced-value.hook";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useDebouncedValue", () => {
  it("starts with the value and follows it only after it stopped changing", async () => {
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 300),
      {
        initialProps: { value: "a" },
      },
    );

    await rerender({ value: "ab" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: "abc" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current).toBe("a");

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current).toBe("abc");
  });
});

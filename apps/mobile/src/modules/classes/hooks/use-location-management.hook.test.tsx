import { act, renderHook } from "@testing-library/react-native";

import { useLocationManagement } from "./use-location-management.hook";

describe("useLocationManagement", () => {
  it("toggles the manage mode only while a location exists", async () => {
    const { result, rerender } = await renderHook(
      ({ canManage }: { canManage: boolean }) =>
        useLocationManagement(canManage),
      { initialProps: { canManage: true } },
    );

    expect(result.current.managing).toBe(false);

    await act(async () => result.current.toggleManaging());
    expect(result.current.managing).toBe(true);

    await rerender({ canManage: false });
    expect(result.current.managing).toBe(false);

    await act(async () => result.current.toggleManaging());
    await rerender({ canManage: true });
    expect(result.current.managing).toBe(false);
  });
});

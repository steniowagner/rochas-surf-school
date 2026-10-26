import { act, renderHook } from "@testing-library/react-native";

import { buildLocation } from "../classes.test-utils";

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

  it("opens the sheet for a new location or for the one pressed, and closes it", async () => {
    const { result } = await renderHook(() => useLocationManagement(true));
    const location = buildLocation();

    await act(async () => result.current.openEdit(location));
    expect([result.current.sheetVisible, result.current.editing]).toEqual([
      true,
      location,
    ]);

    await act(async () => result.current.closeSheet());
    expect(result.current.sheetVisible).toBe(false);

    await act(async () => result.current.openNew());
    expect([result.current.sheetVisible, result.current.editing]).toEqual([
      true,
      null,
    ]);
  });
});

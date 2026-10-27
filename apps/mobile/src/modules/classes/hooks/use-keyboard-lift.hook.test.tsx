import { act, renderHook } from "@testing-library/react-native";
import { DeviceEventEmitter, Keyboard } from "react-native";
import { KeyboardState, useAnimatedKeyboard } from "react-native-reanimated";

import { useKeyboardLift } from "./use-keyboard-lift.hook";

const mockKeyboard = jest.mocked(useAnimatedKeyboard);

let height = 0;
let state = KeyboardState.CLOSED;

const lift = (style: unknown) =>
  -(style as { transform: { translateY: number }[] }).transform[0].translateY;

const emit = (event: "keyboardDidShow" | "keyboardDidHide") =>
  act(async () => {
    DeviceEventEmitter.emit(event, {
      endCoordinates: { height, screenX: 0, screenY: 0, width: 400 },
    });
  });

beforeEach(() => {
  height = 0;
  state = KeyboardState.CLOSED;
  mockKeyboard.mockReturnValue({
    height: { get: () => height },
    state: { get: () => state },
  } as never);
  jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
});

afterEach(() => jest.restoreAllMocks());

describe("useKeyboardLift", () => {
  it("rides on the keyboard as it opens, stays open and closes", async () => {
    const { result, rerender } = await renderHook(() => useKeyboardLift());
    expect(lift(result.current)).toBe(0);

    state = KeyboardState.OPENING;
    height = 120;
    await rerender({});
    expect(lift(result.current)).toBe(120);

    state = KeyboardState.OPEN;
    height = 300;
    await emit("keyboardDidShow");
    expect(lift(result.current)).toBe(300);

    await emit("keyboardDidHide");
    state = KeyboardState.CLOSING;
    height = 80;
    await rerender({});
    expect(lift(result.current)).toBe(80);

    state = KeyboardState.CLOSED;
    height = 0;
    await rerender({});
    expect(lift(result.current)).toBe(0);
  });

  it("ignores a keyboard Reanimated still thinks is open when none is on screen", async () => {
    state = KeyboardState.OPEN;
    height = 300;
    const { result } = await renderHook(() => useKeyboardLift());

    expect(lift(result.current)).toBe(0);
  });

  it("follows a keyboard that was already open when the screen opened", async () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    state = KeyboardState.OPEN;
    height = 300;
    const { result } = await renderHook(() => useKeyboardLift());

    expect(lift(result.current)).toBe(300);
  });

  it("stops listening once the screen is gone", async () => {
    const remove = jest.fn();
    jest.spyOn(Keyboard, "addListener").mockReturnValue({ remove } as never);
    const { unmount } = await renderHook(() => useKeyboardLift());

    await unmount();

    expect(remove).toHaveBeenCalledTimes(2);
  });
});

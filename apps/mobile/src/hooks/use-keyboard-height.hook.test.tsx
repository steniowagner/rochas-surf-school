import { act, renderHook } from "@testing-library/react-native";
import { DeviceEventEmitter, Keyboard } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { KeyboardState } from "react-native-reanimated";

// The Jest setup replaces this hook for the components that use it; here it is the real one.
jest.unmock("@/hooks/use-keyboard-height.hook");

const { useKeyboardHeight } = jest.requireActual<
  typeof import("./use-keyboard-height.hook")
>("./use-keyboard-height.hook");

let height = 0;
let state = KeyboardState.CLOSED;

const emit = (event: "keyboardDidShow" | "keyboardDidHide") =>
  act(async () => {
    DeviceEventEmitter.emit(event, {
      endCoordinates: { height, screenX: 0, screenY: 0, width: 400 },
    });
  });

beforeEach(() => {
  height = 0;
  state = KeyboardState.CLOSED;
  jest.spyOn(Reanimated, "useAnimatedKeyboard").mockReturnValue({
    height: { get: () => height },
    state: { get: () => state },
  } as never);
  jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
});

afterEach(() => jest.restoreAllMocks());

describe("useKeyboardHeight", () => {
  it("follows the keyboard as it opens, stays open and closes", async () => {
    const { result, rerender } = await renderHook(() => useKeyboardHeight());
    expect(result.current.get()).toBe(0);

    state = KeyboardState.OPENING;
    height = 120;
    await rerender({});
    expect(result.current.get()).toBe(120);

    state = KeyboardState.OPEN;
    height = 300;
    await emit("keyboardDidShow");
    expect(result.current.get()).toBe(300);

    await emit("keyboardDidHide");
    state = KeyboardState.CLOSING;
    height = 80;
    await rerender({});
    expect(result.current.get()).toBe(80);

    state = KeyboardState.CLOSED;
    height = 0;
    await rerender({});
    expect(result.current.get()).toBe(0);
  });

  it("is 0 while Reanimated still thinks a keyboard is open but none is on screen", async () => {
    state = KeyboardState.OPEN;
    height = 300;
    const { result } = await renderHook(() => useKeyboardHeight());

    expect(result.current.get()).toBe(0);
  });

  it("follows a keyboard that was already open when the screen opened", async () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    state = KeyboardState.OPEN;
    height = 300;
    const { result } = await renderHook(() => useKeyboardHeight());

    expect(result.current.get()).toBe(300);
  });

  it("stops listening once the screen is gone", async () => {
    const remove = jest.fn();
    jest.spyOn(Keyboard, "addListener").mockReturnValue({ remove } as never);
    const { unmount } = await renderHook(() => useKeyboardHeight());

    await unmount();

    expect(remove).toHaveBeenCalledTimes(2);
  });
});

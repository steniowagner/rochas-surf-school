import { act, renderHook } from "@testing-library/react-native";
import { Keyboard } from "react-native";

import { useScrollFieldIntoView } from "./use-scroll-field-into-view.hook";

describe("useScrollFieldIntoView", () => {
  const layout = (y: number) =>
    ({ nativeEvent: { layout: { x: 0, y, width: 1, height: 1 } } }) as never;
  const withScroll = async () => {
    const { result } = await renderHook(() => useScrollFieldIntoView());
    const scrollTo = jest.fn();
    (result.current.scrollRef as { current: unknown }).current = { scrollTo };
    await act(async () => {
      result.current.onFieldLayout("title", layout(300));
      result.current.onFieldLayout("message", layout(380));
    });

    return { result, scrollTo };
  };

  const original = {
    isVisible: Keyboard.isVisible,
    addListener: Keyboard.addListener,
  };
  const stub = (method: "isVisible" | "addListener") => {
    const fn = jest.fn();
    (Keyboard as unknown as Record<string, unknown>)[method] = fn;

    return fn;
  };

  afterEach(() => Object.assign(Keyboard, original));

  it("scrolls at once when the keyboard is already up, keeping the field below the header", async () => {
    const { result, scrollTo } = await withScroll();
    stub("isVisible").mockReturnValue(true);

    await act(async () => {
      result.current.onFieldFocus("message");
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: 364, animated: true });
  });

  it("waits for the keyboard to show, and scrolls once", async () => {
    const { result, scrollTo } = await withScroll();
    stub("isVisible").mockReturnValue(false);
    let shown: () => void = () => undefined;
    const remove = jest.fn();
    stub("addListener").mockImplementation(((
      _event: string,
      listener: () => void,
    ) => {
      shown = listener;

      return { remove };
    }) as never);

    await act(async () => {
      result.current.onFieldFocus("title");
    });
    expect(scrollTo).not.toHaveBeenCalled();

    await act(async () => {
      shown();
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: 284, animated: true });
    expect(remove).toHaveBeenCalled();
  });

  it("never scrolls above the top", async () => {
    const { result, scrollTo } = await withScroll();
    stub("isVisible").mockReturnValue(true);
    await act(async () => {
      result.current.onFieldLayout("title", layout(4));
    });

    await act(async () => {
      result.current.onFieldFocus("title");
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });
});

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Keyboard } from "react-native";

import {
  createQueryClient,
  createQueryWrapper,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";

import { useSendNoticeScreen } from "./send-notice.screen.hook";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

beforeEach(() => {
  setupSignedInUser();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? ok(undefined) : ok({ count: 3 }),
  );
});

const open = async () => {
  const { result } = await renderHook(() => useSendNoticeScreen(), {
    wrapper: createQueryWrapper(createQueryClient()),
  });
  await waitFor(() => expect(result.current.count).toBe(3));

  return result;
};

const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

describe("useSendNoticeScreen", () => {
  it("does not open the confirmation, nor send, while a field is blank", async () => {
    const result = await open();

    await act(async () => {
      result.current.askToConfirm();
      result.current.confirm();
    });

    expect(result.current.isConfirming).toBe(false);
    expect(posts()).toHaveLength(0);
  });

  it("sends once even when confirmed twice in the same frame", async () => {
    const result = await open();
    await act(async () => {
      result.current.setTitle("T");
      result.current.setMessage("M");
    });

    await act(async () => {
      result.current.askToConfirm();
    });
    expect(result.current.isConfirming).toBe(true);

    await act(async () => {
      result.current.confirm();
      result.current.confirm();
    });

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
  });

  it("keeps the confirmation open while a send is under way", async () => {
    let finish: (value: unknown) => void = () => undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(ok({ count: 3 })),
    );
    const result = await open();
    await act(async () => {
      result.current.setTitle("T");
      result.current.setMessage("M");
    });
    await act(async () => {
      result.current.askToConfirm();
    });
    await act(async () => {
      result.current.confirm();
    });

    expect(posts()).toHaveLength(1);
    await waitFor(() => expect(result.current.isSending).toBe(true));

    await act(async () => {
      result.current.closeConfirm();
    });

    expect(result.current.isConfirming).toBe(true);

    await act(async () => {
      finish(ok(undefined));
    });
    await waitFor(() => expect(result.current.isConfirming).toBe(false));
  });

  describe("scrolling a focused field into view", () => {
    const layout = (y: number) => ({ nativeEvent: { layout: { x: 0, y, width: 1, height: 1 } } }) as never;
    const withScroll = async () => {
      const result = await open();
      const scrollTo = jest.fn();
      (result.current.scrollRef as { current: unknown }).current = { scrollTo };
      await act(async () => {
        result.current.onFieldLayout("title", layout(300));
        result.current.onFieldLayout("message", layout(380));
      });

      return { result, scrollTo };
    };

    const original = { isVisible: Keyboard.isVisible, addListener: Keyboard.addListener };
    const stub = (method: "isVisible" | "addListener") => {
      const fn = jest.fn();
      (Keyboard as unknown as Record<string, unknown>)[method] = fn;

      return fn;
    };

    afterEach(() => Object.assign(Keyboard, original));

    it("scrolls at once when the keyboard is already up, keeping the field below the header", async () => {
      const { result, scrollTo } = await withScroll();
      stub("isVisible").mockReturnValue(true);

      await act(async () => { result.current.onFieldFocus("message"); });

      expect(scrollTo).toHaveBeenCalledWith({ y: 364, animated: true });
    });

    it("waits for the keyboard to show, and scrolls once", async () => {
      const { result, scrollTo } = await withScroll();
      stub("isVisible").mockReturnValue(false);
      let shown: () => void = () => undefined;
      const remove = jest.fn();
      stub("addListener").mockImplementation(((_event: string, listener: () => void) => {
        shown = listener;

        return { remove };
      }) as never);

      await act(async () => { result.current.onFieldFocus("title"); });
      expect(scrollTo).not.toHaveBeenCalled();

      await act(async () => { shown(); });

      expect(scrollTo).toHaveBeenCalledWith({ y: 284, animated: true });
      expect(remove).toHaveBeenCalled();
    });

    it("never scrolls above the top", async () => {
      const { result, scrollTo } = await withScroll();
      stub("isVisible").mockReturnValue(true);
      await act(async () => { result.current.onFieldLayout("title", layout(4)); });

      await act(async () => { result.current.onFieldFocus("title"); });

      expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
    });
  });
});

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

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
});

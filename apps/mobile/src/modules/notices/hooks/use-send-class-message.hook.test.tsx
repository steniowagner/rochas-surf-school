import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createQueryWrapper,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";
import { ApiError, apiPost, NetworkError, SessionExpiredError } from "@/services/api";

import { useSendClassMessage } from "./use-send-class-message.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("@/services/api", () => ({
  ...jest.requireActual("@/services/api"),
  apiPost: jest.fn(),
}));

beforeEach(() => {
  mockShow.mockReset();
  jest.mocked(apiPost).mockReset();
});

const send = async () => {
  const { result } = await renderHook(() => useSendClassMessage("c-1"), {
    wrapper: createQueryWrapper(createQueryClient()),
  });

  await act(async () => {
    await result.current.mutateAsync({ title: "T", message: "M" }).catch(() => undefined);
  });
};

describe("useSendClassMessage", () => {
  it("posts the message to the class as an authenticated request and says nothing", async () => {
    jest.mocked(apiPost).mockResolvedValue(undefined);

    await send();

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith(
      "/classes/c-1/message",
      { title: "T", message: "M" },
      { authenticated: true },
    );
    expect(mockShow).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiError(409, ["class.finished"]), "This class has already finished. The message wasn't sent."],
    [new ApiError(409, ["class.cancelled"]), "This class was cancelled. The message wasn't sent."],
    [new ApiError(404, ["class.notFound"]), "This class no longer exists."],
    [new ApiError(500, []), "Couldn't send the message. Try again."],
    [new NetworkError(), "No connection. Check your internet and try again."],
  ])("shows the error for %p, without retrying", async (error, text) => {
    jest.mocked(apiPost).mockRejectedValue(error);

    await send();

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(text);
  });

  it("leaves an expired session to the app", async () => {
    jest.mocked(apiPost).mockRejectedValue(new SessionExpiredError());

    await send();

    expect(mockShow).not.toHaveBeenCalled();
  });
});

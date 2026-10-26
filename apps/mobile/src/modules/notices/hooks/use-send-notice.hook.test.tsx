import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createQueryWrapper,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";
import { ApiError, apiPost, NetworkError, SessionExpiredError } from "@/services/api";

import { useSendNotice } from "./use-send-notice.hook";

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
  const { result } = await renderHook(() => useSendNotice(), {
    wrapper: createQueryWrapper(createQueryClient()),
  });

  await act(async () => {
    await result.current
      .mutateAsync({ audience: "students", title: "T", message: "M" })
      .catch(() => undefined);
  });
};

describe("useSendNotice", () => {
  it("posts the notice as an authenticated request and says nothing", async () => {
    jest.mocked(apiPost).mockResolvedValue(undefined);

    await send();

    expect(apiPost).toHaveBeenCalledWith(
      "/notifications/broadcast",
      { audience: "students", title: "T", message: "M" },
      { authenticated: true },
    );
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the generic error when the backend refuses", async () => {
    jest.mocked(apiPost).mockRejectedValue(new ApiError(500, []));

    await send();

    expect(mockShow).toHaveBeenCalledWith("Couldn't send the notice. Try again.");
  });

  it("shows the no-connection error when the network is down", async () => {
    jest.mocked(apiPost).mockRejectedValue(new NetworkError());

    await send();

    expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
  });

  it("leaves an expired session to the app", async () => {
    jest.mocked(apiPost).mockRejectedValue(new SessionExpiredError());

    await send();

    expect(mockShow).not.toHaveBeenCalled();
  });
});

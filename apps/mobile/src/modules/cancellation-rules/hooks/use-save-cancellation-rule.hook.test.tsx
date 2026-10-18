import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createQueryWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../cancellation-rules.test-utils";

import { CANCELLATION_RULES_QUERY_KEY } from "./use-cancellation-rules.hook";
import { useSaveCancellationRule } from "./use-save-cancellation-rule.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

const save = async (queryClient = createQueryClient()) => {
  const { result } = await renderHook(() => useSaveCancellationRule(), {
    wrapper: createQueryWrapper(queryClient),
  });

  await act(async () => {
    await result.current
      .mutateAsync({ discipline: "surf", text: "Surf." })
      .catch(() => undefined);
  });

  return result;
};

describe("useSaveCancellationRule", () => {
  it("sends the text, authenticated, and puts both rules in the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(CANCELLATION_RULES_QUERY_KEY, { surf: null, skate: "Skate." });
    fetchMock.mockResolvedValue(ok({ surf: "Surf.", skate: "Skate." }));

    await save(queryClient);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/cancellation-rules/surf", {
      method: "PUT",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Surf." }),
    });
    expect(queryClient.getQueryData(CANCELLATION_RULES_QUERY_KEY)).toEqual({
      surf: "Surf.",
      skate: "Skate.",
    });
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the generic toast on a failure, does not retry and leaves the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(CANCELLATION_RULES_QUERY_KEY, { surf: null, skate: null });
    fetchMock.mockResolvedValue(failure());

    const result = await save(queryClient);

    expect(result.current.isError).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again.");
    expect(queryClient.getQueryData(CANCELLATION_RULES_QUERY_KEY)).toEqual({ surf: null, skate: null });
  });

  it("shows the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await save();

    expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
  });

  it("shows nothing when the session expired", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) });

    await save();

    expect(mockShow).not.toHaveBeenCalled();
  });
});

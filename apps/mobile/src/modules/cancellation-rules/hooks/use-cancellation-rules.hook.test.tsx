import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../cancellation-rules.test-utils";

import { useCancellationRules } from "./use-cancellation-rules.hook";

beforeEach(setupSignedInUser);

describe("useCancellationRules", () => {
  it("loads both rules, authenticated", async () => {
    const rules = { surf: "Até 12 horas antes.", skate: null };
    fetchMock.mockResolvedValue(ok(rules));

    const { result } = await renderHook(() => useCancellationRules(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual(rules));
    expect(requestedPaths()).toEqual(["/cancellation-rules"]);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/cancellation-rules", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("does not load while disabled", async () => {
    const { result } = await renderHook(() => useCancellationRules({ enabled: false }), {
      wrapper: createWrapper(createQueryClient()),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await renderHook(() => useCancellationRules(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

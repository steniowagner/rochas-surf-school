import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { useReorderSchoolRules } from "./use-reorder-school-rules.hook";
import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const rule = (id: string, index: number) => ({
  id,
  title: `Rule ${id}`,
  description: `Explanation ${id}`,
  index,
});

const A = rule("a", 1);
const B = rule("b", 2);
const C = rule("c", 3);
const CACHED = { version: 3, rules: [A, B, C] };

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

const setup = async () => {
  const queryClient = createQueryClient();
  queryClient.setQueryData(SCHOOL_RULES_QUERY_KEY, CACHED);
  const { result } = await renderHook(() => useReorderSchoolRules(), {
    wrapper: createWrapper(queryClient),
  });

  return { queryClient, result };
};

const deferredFetch = () => {
  let resolve: (value: unknown) => void = () => undefined;
  fetchMock.mockReturnValue(
    new Promise((settle) => {
      resolve = settle;
    }),
  );

  return (value: unknown) => resolve(value);
};

describe("useReorderSchoolRules", () => {
  it("shows the new order at once, is pending until the answer, then keeps the answer", async () => {
    const answer = deferredFetch();
    const { queryClient, result } = await setup();

    await act(async () => {
      result.current.mutate({ rules: [A, C, B] });
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual({
      version: 3,
      rules: [A, { ...C, index: 2 }, { ...B, index: 3 }],
    });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules/order", {
      method: "PUT",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
      body: JSON.stringify({ ruleIds: ["a", "c", "b"] }),
    });

    // The server's answer is the truth, even when it differs from what the app guessed.
    const fromServer = { version: 3, rules: [A, { ...rule("c", 2), title: "Edited meanwhile" }, rule("b", 3)] };
    await act(async () => {
      answer(ok(fromServer));
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual(fromServer);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("puts the list back and shows the generic toast on a failure, without reloading", async () => {
    fetchMock.mockResolvedValue(failure());
    const { queryClient, result } = await setup();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync({ rules: [A, C, B] }).catch(() => undefined);
    });

    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual(CACHED);
    expect(invalidate).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });

  it("puts the list back and shows the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const { queryClient, result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({ rules: [B, A, C] }).catch(() => undefined);
    });

    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual(CACHED);
    expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
  });

  it("reloads the list and says the rules changed when the order is stale", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ errors: ["schoolRule.order.mismatch"] }),
    });
    const { queryClient, result } = await setup();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync({ rules: [A, C, B] }).catch(() => undefined);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: SCHOOL_RULES_QUERY_KEY });
    expect(mockShow).toHaveBeenCalledWith("The rules changed. Check the new order.");
  });

  it("shows nothing when the session expired", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) });
    const { queryClient, result } = await setup();

    await act(async () => {
      await result.current.mutateAsync({ rules: [A, C, B] }).catch(() => undefined);
    });

    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual(CACHED);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("writes nothing optimistic while the rules were never loaded", async () => {
    fetchMock.mockResolvedValue(failure());
    const queryClient = createQueryClient();
    const { result } = await renderHook(() => useReorderSchoolRules(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ rules: [A, C, B] }).catch(() => undefined);
    });

    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toBeUndefined();
  });
});

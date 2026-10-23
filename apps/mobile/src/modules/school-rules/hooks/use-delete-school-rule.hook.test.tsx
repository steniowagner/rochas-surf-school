import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { useDeleteSchoolRule } from "./use-delete-school-rule.hook";
import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const rule = (index: number, id = `r-${index}`) => ({
  id,
  title: `Rule ${index}`,
  description: `Explanation ${index}`,
  index,
});

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

const remove = async (queryClient = createQueryClient()) => {
  const { result } = await renderHook(() => useDeleteSchoolRule(), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync({ id: "r-2" }).catch(() => undefined);
  });

  return result;
};

describe("useDeleteSchoolRule", () => {
  it("deletes the rule, authenticated and without a body, and puts the answer in the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(SCHOOL_RULES_QUERY_KEY, { version: 1, rules: [rule(1), rule(2), rule(3)] });
    const answer = { version: 2, rules: [rule(1), rule(2, "r-3")] };
    fetchMock.mockResolvedValue(ok(answer));

    await remove(queryClient);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules/r-2", {
      method: "DELETE",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
    });
    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual(answer);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("reloads the list and says the rule was already deleted when it no longer exists", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ errors: ["schoolRule.id.notFound"] }),
    });

    const result = await remove(queryClient);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SCHOOL_RULES_QUERY_KEY });
    expect(mockShow).toHaveBeenCalledWith("This rule was already deleted.");
  });

  it("shows the generic toast on another failure, without reloading or retrying", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(failure());

    await remove(queryClient);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });

  it("shows the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await remove();

    expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
  });

  it("shows nothing when the session expired", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) });

    await remove();

    expect(mockShow).not.toHaveBeenCalled();
  });
});

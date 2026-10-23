import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";
import { useUpdateSchoolRule } from "./use-update-school-rule.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const rule = (index: number, title = `Rule ${index}`) => ({
  id: `r-${index}`,
  title,
  description: `Explanation ${index}`,
  index,
});

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

const update = async (queryClient = createQueryClient()) => {
  const { result } = await renderHook(() => useUpdateSchoolRule(), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current
      .mutateAsync({ id: "r-2", title: " New title ", description: "Explanation 2 " })
      .catch(() => undefined);
  });

  return result;
};

describe("useUpdateSchoolRule", () => {
  it("sends both texts trimmed to the rule, authenticated, and puts the answer in the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(SCHOOL_RULES_QUERY_KEY, { version: 1, rules: [rule(1), rule(2)] });
    const answer = { version: 2, rules: [rule(1), rule(2, "New title")] };
    fetchMock.mockResolvedValue(ok(answer));

    const result = await update(queryClient);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules/r-2", {
      method: "PUT",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New title", description: "Explanation 2" }),
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

    const result = await update(queryClient);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SCHOOL_RULES_QUERY_KEY });
    expect(mockShow).toHaveBeenCalledWith("This rule was already deleted.");
  });

  it("shows the generic toast on another failure, without reloading or retrying", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(failure());

    await update(queryClient);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again.");
  });

  it("shows the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await update();

    expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
  });

  it("shows nothing when the session expired", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) });

    await update();

    expect(mockShow).not.toHaveBeenCalled();
  });
});

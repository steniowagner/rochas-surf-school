import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { useCreateSchoolRule } from "./use-create-school-rule.hook";
import { SCHOOL_RULES_QUERY_KEY } from "./use-school-rules.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const rule = (index: number) => ({
  id: `r-${index}`,
  title: `Rule ${index}`,
  description: `Explanation ${index}`,
  index,
});

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

const create = async (queryClient = createQueryClient()) => {
  const { result } = await renderHook(() => useCreateSchoolRule(), {
    wrapper: createWrapper(queryClient),
  });

  await act(async () => {
    await result.current
      .mutateAsync({ title: "  Bring sunscreen ", description: " Every class.  " })
      .catch(() => undefined);
  });

  return result;
};

describe("useCreateSchoolRule", () => {
  it("sends both texts trimmed, authenticated, and puts the answer in the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(SCHOOL_RULES_QUERY_KEY, { version: 1, rules: [rule(1)] });
    const answer = { version: 2, rules: [rule(1), rule(2)] };
    fetchMock.mockResolvedValue(ok(answer));

    await create(queryClient);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules", {
      method: "POST",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Bring sunscreen", description: "Every class." }),
    });
    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual(answer);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the generic toast on a failure, does not retry and leaves the cache", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(SCHOOL_RULES_QUERY_KEY, { version: 1, rules: [rule(1)] });
    fetchMock.mockResolvedValue(failure());

    const result = await create(queryClient);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again.");
    expect(queryClient.getQueryData(SCHOOL_RULES_QUERY_KEY)).toEqual({ version: 1, rules: [rule(1)] });
  });

  it("shows the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await create();

    expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
  });

  it("shows nothing when the session expired", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ errors: ["auth.token.invalid"] }) });

    await create();

    expect(mockShow).not.toHaveBeenCalled();
  });
});

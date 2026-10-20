import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { usePendingRequests } from "./use-pending-requests.hook";

beforeEach(setupSignedInUser);

describe("usePendingRequests", () => {
  it("reads the pending requests, authenticated", async () => {
    fetchMock.mockResolvedValue(ok({ total: 0, classes: [] }));
    const { result } = await renderHook(() => usePendingRequests(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual({ total: 0, classes: [] }));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/enrolments/pending", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await renderHook(() => usePendingRequests(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

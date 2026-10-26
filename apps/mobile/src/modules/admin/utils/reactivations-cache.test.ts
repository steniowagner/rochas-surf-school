import { QueryClient } from "@tanstack/react-query";

import { CARLA, DAVI } from "../registrations.test-utils";

import {
  REACTIVATIONS_QUERY_KEY,
  removeReactivationRequest,
} from "./reactivations-cache";

describe("removeReactivationRequest", () => {
  it("removes the request from the cached list and invalidates the query", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(REACTIVATIONS_QUERY_KEY, { items: [CARLA, DAVI] });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await removeReactivationRequest(queryClient, "c");

    expect(queryClient.getQueryData(REACTIVATIONS_QUERY_KEY)).toEqual({
      items: [DAVI],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: REACTIVATIONS_QUERY_KEY,
    });
  });

  it("does nothing to a list that was never loaded", async () => {
    const queryClient = new QueryClient();

    await removeReactivationRequest(queryClient, "c");

    expect(queryClient.getQueryData(REACTIVATIONS_QUERY_KEY)).toBeUndefined();
  });
});

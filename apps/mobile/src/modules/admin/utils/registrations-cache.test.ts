import { QueryClient } from "@tanstack/react-query";

import {
  REGISTRATIONS_QUERY_KEY,
  removeRegistration,
} from "./registrations-cache";

const ana = {
  id: "a",
  name: "Ana",
  email: "a@x.com",
  createdAt: "2026-10-01T10:00:00.000Z",
};
const bruno = {
  id: "b",
  name: "Bruno",
  email: "b@x.com",
  createdAt: "2026-10-02T10:00:00.000Z",
};

describe("removeRegistration", () => {
  it("removes the registration from the cached list and invalidates the query", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(REGISTRATIONS_QUERY_KEY, { items: [ana, bruno] });
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");

    await removeRegistration(queryClient, "a");

    expect(queryClient.getQueryData(REGISTRATIONS_QUERY_KEY)).toEqual({
      items: [bruno],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: REGISTRATIONS_QUERY_KEY,
    });
  });

  it("does nothing to a list that was never loaded", async () => {
    const queryClient = new QueryClient();

    await removeRegistration(queryClient, "a");

    expect(queryClient.getQueryData(REGISTRATIONS_QUERY_KEY)).toBeUndefined();
  });
});

import { renderHook, waitFor } from "@testing-library/react-native";

import {
  CARLA,
  DAVI,
  createQueryClient,
  createWrapper,
  fetchMock,
  respond,
  setupSignedInAdmin,
} from "../registrations.test-utils";

import { useReactivationRequests } from "./use-reactivation-requests.hook";

beforeEach(setupSignedInAdmin);

describe("useReactivationRequests", () => {
  it("loads the list asking with the access token", async () => {
    respond(200, { items: [CARLA, DAVI] });

    const { result } = await renderHook(() => useReactivationRequests(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() =>
      expect(result.current.data).toEqual({ items: [CARLA, DAVI] }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/reactivation-requests",
      { method: "GET", headers: { Authorization: "Bearer at-1" } },
    );
  });

  it("fails without retrying", async () => {
    respond(500, { errors: [] });

    const { result } = await renderHook(() => useReactivationRequests(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

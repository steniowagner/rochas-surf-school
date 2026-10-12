import { renderHook, waitFor } from "@testing-library/react-native";

import {
  ANA,
  BRUNO,
  createQueryClient,
  createWrapper,
  fetchMock,
  respond,
  setupSignedInAdmin,
} from "../registrations.test-utils";

import { useRegistrations } from "./use-registrations.hook";

beforeEach(setupSignedInAdmin);

describe("useRegistrations", () => {
  it("loads the list asking with the access token", async () => {
    respond(200, { items: [ANA, BRUNO] });

    const { result } = await renderHook(() => useRegistrations(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() =>
      expect(result.current.data).toEqual({ items: [ANA, BRUNO] }),
    );
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/registrations", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("fails without retrying", async () => {
    respond(500, { errors: [] });

    const { result } = await renderHook(() => useRegistrations(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

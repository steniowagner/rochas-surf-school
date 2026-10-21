import { renderHook, waitFor } from "@testing-library/react-native";

import {
  buildClassItem,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { MY_CLASSES_QUERY_KEY, useMyClasses } from "./use-my-classes.hook";

beforeEach(setupSignedInUser);

describe("useMyClasses", () => {
  it("reads the student's classes, authenticated, under the classes key", async () => {
    const items = [buildClassItem("c-1", "2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z")];
    fetchMock.mockResolvedValue(ok({ items }));
    const { result } = await renderHook(() => useMyClasses(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual({ items }));
    expect(MY_CLASSES_QUERY_KEY).toEqual(["classes", "mine"]);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/mine", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await renderHook(() => useMyClasses(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

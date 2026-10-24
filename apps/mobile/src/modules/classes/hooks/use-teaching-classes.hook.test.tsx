import { renderHook, waitFor } from "@testing-library/react-native";

import {
  buildClassItem,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";
import { TEACHING_CLASSES_QUERY_KEY, useTeachingClasses } from "./use-teaching-classes.hook";

beforeEach(setupSignedInUser);

describe("useTeachingClasses", () => {
  it("reads the classes the caller teaches, authenticated, under the classes key", async () => {
    const answer = {
      items: [buildClassItem("c-1", "2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z")],
      teachesAny: true,
    };
    fetchMock.mockResolvedValue(ok(answer));
    const { result } = await renderHook(() => useTeachingClasses(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual(answer));
    expect(TEACHING_CLASSES_QUERY_KEY).toEqual(["classes", "teaching"]);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/teaching", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await renderHook(() => useTeachingClasses(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useTimeRangeSuggestions } from "./use-time-range-suggestions.hook";

beforeEach(setupSignedInUser);

describe("useTimeRangeSuggestions", () => {
  it("loads the suggestions", async () => {
    const items = [{ start: "08:00", end: "09:00" }];
    fetchMock.mockResolvedValue(ok({ items }));

    const { result } = await renderHook(() => useTimeRangeSuggestions(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data?.items).toEqual(items));
    expect(requestedPaths()).toEqual(["/classes/time-range-suggestions"]);
  });

  it("fails once without retrying", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await renderHook(() => useTimeRangeSuggestions(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

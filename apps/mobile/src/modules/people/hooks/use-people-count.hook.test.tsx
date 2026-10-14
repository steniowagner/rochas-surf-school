import { renderHook, waitFor } from "@testing-library/react-native";

import {
  buildPage,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../people.test-utils";

import { usePeopleCount } from "./use-people-count.hook";

beforeEach(setupSignedInUser);

describe("usePeopleCount", () => {
  it("asks for one unfiltered row and answers the total", async () => {
    fetchMock.mockResolvedValue(ok(buildPage(1, 1, 42)));

    const { result } = await renderHook(() => usePeopleCount(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toBe(42));
    expect(requestedPaths()).toEqual(["/people?perPage=1"]);
  });

  it("fails without retrying and without data", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await renderHook(() => usePeopleCount(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

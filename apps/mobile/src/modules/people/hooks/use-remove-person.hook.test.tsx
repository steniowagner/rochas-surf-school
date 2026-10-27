import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "@/services/api";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../people.test-utils";

import { useRemovePerson } from "./use-remove-person.hook";

beforeEach(setupSignedInUser);

describe("useRemovePerson", () => {
  it("posts the removal and reloads the people, the classes and the removed accounts", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(ok({ id: "p-1", status: "removed" }));
    const { result } = await renderHook(() => useRemovePerson(), {
      wrapper: createWrapper(queryClient),
    });

    let answer: unknown;
    await act(async () => {
      answer = await result.current.mutateAsync("p-1");
    });

    expect(answer).toEqual({ id: "p-1", status: "removed" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/people/p-1/remove",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer at-1" }),
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["people"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["classes"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["removed-accounts"] });
  });

  it("fails without retrying and without reloading anything", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(failure(409));
    const { result } = await renderHook(() => useRemovePerson(), {
      wrapper: createWrapper(queryClient),
    });

    let error: unknown;
    await act(async () => {
      error = await result.current.mutateAsync("p-1").catch((caught) => caught);
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

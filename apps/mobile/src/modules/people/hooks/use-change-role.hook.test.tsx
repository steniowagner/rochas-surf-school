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

import { useChangeRole } from "./use-change-role.hook";

beforeEach(setupSignedInUser);

describe("useChangeRole", () => {
  it("puts the new role and reloads the people and the classes", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(ok({ id: "p-1", role: "instructor" }));
    const { result } = await renderHook(() => useChangeRole(), {
      wrapper: createWrapper(queryClient),
    });

    let answer: unknown;
    await act(async () => {
      answer = await result.current.mutateAsync({ id: "p-1", role: "instructor" });
    });

    expect(answer).toEqual({ id: "p-1", role: "instructor" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/people/p-1/role",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ role: "instructor" }),
        headers: expect.objectContaining({ Authorization: "Bearer at-1" }),
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["people"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["classes"] });
  });

  it("fails without retrying and without reloading anything", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(failure(409));
    const { result } = await renderHook(() => useChangeRole(), {
      wrapper: createWrapper(queryClient),
    });

    let error: unknown;
    await act(async () => {
      error = await result.current.mutateAsync({ id: "p-1", role: "admin" }).catch((caught) => caught);
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

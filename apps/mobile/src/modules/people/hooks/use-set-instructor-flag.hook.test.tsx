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

import { useSetInstructorFlag } from "./use-set-instructor-flag.hook";

beforeEach(setupSignedInUser);

describe("useSetInstructorFlag", () => {
  it("puts the flag and reloads the people", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(ok({ id: "p-1", isInstructor: true }));
    const { result } = await renderHook(() => useSetInstructorFlag(), {
      wrapper: createWrapper(queryClient),
    });

    let answer: unknown;
    await act(async () => {
      answer = await result.current.mutateAsync({ id: "p-1", isInstructor: true });
    });

    expect(answer).toEqual({ id: "p-1", isInstructor: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/people/p-1/instructor",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ isInstructor: true }),
        headers: expect.objectContaining({ Authorization: "Bearer at-1" }),
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["people"] });
  });

  it("fails without retrying and without reloading anything", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(failure(409));
    const { result } = await renderHook(() => useSetInstructorFlag(), {
      wrapper: createWrapper(queryClient),
    });

    let error: unknown;
    await act(async () => {
      error = await result.current
        .mutateAsync({ id: "p-1", isInstructor: false })
        .catch((caught) => caught);
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});

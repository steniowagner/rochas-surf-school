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

import { useTeachers } from "./use-teachers.hook";

beforeEach(setupSignedInUser);

const page = (page: number, from: number, count: number, total: number) =>
  ok({
    items: Array.from({ length: count }, (_, i) => ({
      id: `t-${from + i}`,
      name: `Teacher ${from + i}`,
      role: (from + i) % 2 ? "admin" : "instructor",
      createdAt: "2026-07-15T12:00:00.000Z",
      photoUrl: null,
      whatsappNumber: null,
    })),
    page,
    perPage: 50,
    total,
  });

describe("useTeachers", () => {
  it("loads every page of instructors and admins", async () => {
    fetchMock
      .mockResolvedValueOnce(page(1, 0, 50, 120))
      .mockResolvedValueOnce(page(2, 50, 50, 120))
      .mockResolvedValueOnce(page(3, 100, 20, 120));

    const { result } = await renderHook(() => useTeachers(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toHaveLength(120));
    expect(requestedPaths()).toEqual([
      "/people?page=1&perPage=50&role=instructor,admin&teaches=true",
      "/people?page=2&perPage=50&role=instructor,admin&teaches=true",
      "/people?page=3&perPage=50&role=instructor,admin&teaches=true",
    ]);
    expect(result.current.data?.[0]).toEqual({
      id: "t-0",
      name: "Teacher 0",
      role: "instructor",
    });
    expect(result.current.data?.[1]?.role).toBe("admin");
  });

  it("stops after one page when everything fits, and when there is nobody", async () => {
    fetchMock.mockResolvedValueOnce(page(1, 0, 3, 3));
    const first = await renderHook(() => useTeachers(), {
      wrapper: createWrapper(createQueryClient()),
    });
    await waitFor(() => expect(first.result.current.data).toHaveLength(3));

    fetchMock.mockReset().mockResolvedValueOnce(page(1, 0, 0, 0));
    const second = await renderHook(() => useTeachers(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(second.result.current.data).toEqual([]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails when a page fails, without retrying", async () => {
    fetchMock
      .mockResolvedValueOnce(page(1, 0, 50, 120))
      .mockResolvedValue(failure());

    const { result } = await renderHook(() => useTeachers(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

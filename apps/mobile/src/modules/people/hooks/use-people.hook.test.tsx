import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  buildPage,
  buildPerson,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../people.test-utils";
import { PeopleFilters } from "../people.types";

import { usePeople } from "./use-people.hook";

const DEFAULT: PeopleFilters = { roles: [], search: "" };

const render = (filters: PeopleFilters = DEFAULT) =>
  renderHook(() => usePeople(filters), {
    wrapper: createWrapper(createQueryClient()),
  });

beforeEach(setupSignedInUser);

describe("usePeople", () => {
  it("loads page 1 with only the parameters that are set, authenticated", async () => {
    fetchMock.mockResolvedValue(ok(buildPage(1, 3, 3)));

    const { result } = await render();

    await waitFor(() => expect(result.current.people).toHaveLength(3));
    expect(requestedPaths()).toEqual(["/people?page=1&perPage=20"]);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/people?page=1&perPage=20", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("sends the role, the trimmed and encoded search", async () => {
    fetchMock.mockResolvedValue(ok(buildPage(1, 1, 1)));

    await render({ roles: ["admin", "student"], search: "  joão silva " });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requestedPaths()).toEqual([
      "/people?page=1&perPage=20&role=student,admin&search=jo%C3%A3o%20silva",
    ]);
  });

  it("sends no search for blank text", async () => {
    fetchMock.mockResolvedValue(ok(buildPage(1, 1, 1)));

    await render({ roles: [], search: "   " });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requestedPaths()).toEqual(["/people?page=1&perPage=20"]);
  });

  it("loads the next page while there are more rows, and stops at the end", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(buildPage(1, 20, 25)))
      .mockResolvedValueOnce(ok(buildPage(2, 5, 25)));
    const { result } = await render();
    await waitFor(() => expect(result.current.people).toHaveLength(20));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.people).toHaveLength(25));
    expect(requestedPaths()[1]).toBe("/people?page=2&perPage=20");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("drops a row repeated across pages", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(buildPage(1, 20, 21)))
      .mockResolvedValueOnce(
        ok({ items: [buildPerson(19), buildPerson(99)], page: 2, perPage: 20, total: 22 }),
      );
    const { result } = await render();
    await waitFor(() => expect(result.current.people).toHaveLength(20));

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.people).toHaveLength(21));
    expect(result.current.people.filter((person) => person.id === "p-19")).toHaveLength(1);
  });

  it("fails without retrying", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await render();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.people).toEqual([]);
  });
});

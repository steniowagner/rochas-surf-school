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

import { useClassMessages } from "./use-class-messages.hook";

beforeEach(() => setupSignedInUser());

describe("useClassMessages", () => {
  it("loads the messages of a class", async () => {
    const page = {
      items: [
        { id: "m-1", title: "Aviso", message: "Oi", createdAt: "2026-10-20T12:00:00.000Z", sender: null },
      ],
    };
    fetchMock.mockResolvedValue(ok(page));

    const { result } = await renderHook(() => useClassMessages("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual(page));
    expect(requestedPaths()).toEqual(["/classes/c-1/messages"]);
  });

  it("doesn't retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(500));

    const { result } = await renderHook(() => useClassMessages("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

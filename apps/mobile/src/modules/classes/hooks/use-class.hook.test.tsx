import { renderHook, waitFor } from "@testing-library/react-native";

import * as api from "@/services/api";

import {
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useClass } from "./use-class.hook";

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

beforeEach(() => {
  setupSignedInUser();
  (api.apiGet as jest.Mock).mockClear();
});

const notFound = () => ({
  ok: false,
  status: 404,
  json: async () => ({ errors: ["class.notFound"] }),
});

describe("useClass", () => {
  it("loads one class by id", async () => {
    fetchMock.mockResolvedValue(ok({ id: "c-1" }));

    const { result } = await renderHook(() => useClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual({ id: "c-1" }));
    expect(requestedPaths()).toEqual(["/classes/c-1"]);
  });

  it("reads nothing when it isn't enabled", async () => {
    fetchMock.mockResolvedValue(ok({ id: "c-1" }));

    const { result } = await renderHook(() => useClass("", { enabled: false }), {
      wrapper: createWrapper(createQueryClient()),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry a 404", async () => {
    fetchMock.mockResolvedValue(notFound());

    const { result } = await renderHook(() => useClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry an expired session", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(
      new api.SessionExpiredError(),
    );

    const { result } = await renderHook(() => useClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(api.apiGet).toHaveBeenCalledTimes(1);
  });

  it("retries other failures", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ errors: [] }),
      })
      .mockResolvedValue(ok({ id: "c-1" }));

    const { result } = await renderHook(() => useClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual({ id: "c-1" }), {
      timeout: 4000,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the default retries", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });

    const { result } = await renderHook(() => useClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });
    await jest.advanceTimersByTimeAsync(20_000);

    expect(result.current.isError).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });
});

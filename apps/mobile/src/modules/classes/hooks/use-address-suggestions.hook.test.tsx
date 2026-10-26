import { act, renderHook, waitFor } from "@testing-library/react-native";

import i18n from "@/i18n";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useAddressSuggestions } from "./use-address-suggestions.hook";

const items = [
  { placeId: "p1", title: "Praia do Futuro", description: "Fortaleza" },
];

beforeEach(() => {
  setupSignedInUser();
  jest.useFakeTimers({
    doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
  });
});
afterEach(() => jest.useRealTimers());

const render = (text: string, queryClient = createQueryClient()) =>
  renderHook(
    ({ value }: { value: string }) => useAddressSuggestions(value, "tok-1"),
    {
      initialProps: { value: text },
      wrapper: createWrapper(queryClient),
    },
  );

describe("useAddressSuggestions", () => {
  it("asks 300 ms after the last keystroke with the text, the session token and the language", async () => {
    fetchMock.mockResolvedValue(ok({ items }));
    const { result, rerender } = await render("");

    await rerender({ value: "pra" });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: "praia do " });
    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => expect(result.current.data).toEqual({ items }));
    expect(requestedPaths()).toEqual([
      "/locations/address-suggestions?q=praia%20do&sessionToken=tok-1&language=en",
    ]);
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("sends the language of the app in the backend's words", async () => {
    await i18n.changeLanguage("pt-BR");
    fetchMock.mockResolvedValue(ok({ items }));
    const { result } = await render("praia");

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(requestedPaths()[0]).toContain("language=pt-BR");
  });

  it("does not ask for fewer than 3 characters", async () => {
    const { result } = await render("  pr ");

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure(502));
    const { result } = await render("praia");

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

import { act, renderHook, waitFor } from "@testing-library/react-native";

import i18n from "@/i18n";

import {
  buildNotification,
  buildPage,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requests,
  setupSignedInUser,
} from "../notifications.test-utils";

import { useNotifications } from "./use-notifications.hook";

const render = () =>
  renderHook(() => useNotifications(), {
    wrapper: createWrapper(createQueryClient()),
  });

beforeEach(() => setupSignedInUser());

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

describe("useNotifications", () => {
  it("loads page 1 of 20 in the app's language, authenticated", async () => {
    fetchMock.mockResolvedValue(ok(buildPage(1, 3, 3)));

    const { result } = await render();

    await waitFor(() => expect(result.current.notifications).toHaveLength(3));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/notifications?page=1&perPage=20&locale=en",
      { method: "GET", headers: { Authorization: "Bearer at-1" } },
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it.each([
    ["pt-BR", "pt-BR"],
    ["es-ES", "es"],
  ])("asks for the text in %s as %s", async (appLocale, locale) => {
    await i18n.changeLanguage(appLocale);
    fetchMock.mockResolvedValue(ok(buildPage(1, 1, 1)));

    await render();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(requests()[0].path).toBe(`/notifications?page=1&perPage=20&locale=${locale}`);
  });

  it("loads the next page while there are more rows, dropping a row repeated across pages", async () => {
    fetchMock.mockResolvedValueOnce(ok(buildPage(1, 20, 25))).mockResolvedValueOnce(
      ok({
        ...buildPage(2, 5, 25),
        items: [buildNotification(19), ...buildPage(2, 5, 25).items],
      }),
    );
    const { result } = await render();
    await waitFor(() => expect(result.current.notifications).toHaveLength(20));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.notifications).toHaveLength(25));
    expect(requests()[1].path).toBe("/notifications?page=2&perPage=20&locale=en");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("answers an empty list before the first page and reports a failure without retrying", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await render();

    expect(result.current.notifications).toEqual([]);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

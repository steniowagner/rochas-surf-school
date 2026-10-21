import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import {
  buildClassItem,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";
import type { ClassItem } from "@/modules/classes/classes.types";
import * as api from "@/services/api";
import { SessionExpiredError } from "@/services/api";

import { MyClassHistoryScreen } from "./my-class-history.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  // Renders the screen's header title so the tests can see it.
  Stack: { Screen: ({ options }: any) => options.headerTitle() },
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

/** A class taken `index + 1` days ago at 08:00 in Fortaleza, with three students present. */
const taken = (index: number): ClassItem =>
  buildClassItem(
    `c-${index}`,
    new Date(Date.UTC(2026, 9, 14 - index, 11)).toISOString(),
    new Date(Date.UTC(2026, 9, 14 - index, 12)).toISOString(),
    {
      seatsTaken: 3,
      myEnrolment: { id: `e-${index}`, status: "approved", requestedAt: "2026-09-01T12:00:00.000Z", reason: null },
    },
  );

const page = (number: number, from: number, count: number, total: number) => ({
  items: Array.from({ length: count }, (_, index) => taken(from + index)),
  page: number,
  perPage: 20,
  total,
});

const listData = () => screen.getByTestId("my-history-list").props.data as ClassItem[];

const renderScreen = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MyClassHistoryScreen />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
  (router.push as jest.Mock).mockReset();
  fetchMock.mockResolvedValue(ok(page(1, 0, 3, 3)));
});

afterEach(async () => {
  await act(() => i18n.changeLanguage("en-US"));
});

describe("MyClassHistoryScreen", () => {
  it("titles the header and lists the classes taken, newest first, with the students present", async () => {
    await renderScreen();

    expect(screen.getByText("HISTORY")).toBeOnTheScreen();
    expect(await screen.findAllByText("3 students present")).toHaveLength(3);
    expect(listData().map((item) => item.id)).toEqual(["c-0", "c-1", "c-2"]);
    expect(screen.getAllByText("Finished")).toHaveLength(3);
    expect(requestedPaths()).toEqual(["/classes/mine/history?page=1&perPage=20"]);
  });

  it("loads 20 more at the end of the list, and stops once every class is there", async () => {
    fetchMock
      .mockResolvedValueOnce(ok(page(1, 0, 20, 25)))
      .mockResolvedValueOnce(ok(page(2, 20, 5, 25)));
    await renderScreen();
    await waitFor(() => expect(listData()).toHaveLength(20));

    await fireEvent(screen.getByTestId("my-history-list"), "endReached");

    await waitFor(() => expect(listData()).toHaveLength(25));
    expect(listData()[24]?.id).toBe("c-24");
    await fireEvent(screen.getByTestId("my-history-list"), "endReached");
    expect(requestedPaths()).toEqual([
      "/classes/mine/history?page=1&perPage=20",
      "/classes/mine/history?page=2&perPage=20",
    ]);
  });

  it("shows a spinner under the list while the next page loads, and ignores another end meanwhile", async () => {
    let resolve: (value: Response) => void = () => undefined;
    fetchMock
      .mockResolvedValueOnce(ok(page(1, 0, 20, 25)))
      .mockReturnValueOnce(new Promise<Response>((done) => (resolve = done)));
    await renderScreen();
    await waitFor(() => expect(listData()).toHaveLength(20));
    const endReached = () => screen.getByTestId("my-history-list").props.onEndReached();
    let loading: Promise<void> = Promise.resolve();

    // The page stays in flight: the act must not wait for it.
    await act(async () => {
      loading = endReached();
    });
    expect(await screen.findByTestId("my-history-loading-more")).toBeOnTheScreen();
    await act(() => endReached());

    await act(async () => {
      resolve(ok(page(2, 20, 5, 25)) as Response);
      await loading;
    });
    await waitFor(() => expect(listData()).toHaveLength(25));
    expect(requestedPaths()).toHaveLength(2);
    expect(screen.queryByTestId("my-history-loading-more")).not.toBeOnTheScreen();
  });

  it("toasts a failed next page and keeps the classes", async () => {
    fetchMock.mockResolvedValueOnce(ok(page(1, 0, 20, 25))).mockResolvedValueOnce(failure(500));
    await renderScreen();
    await waitFor(() => expect(listData()).toHaveLength(20));

    await fireEvent(screen.getByTestId("my-history-list"), "endReached");

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."),
    );
    expect(listData()).toHaveLength(20);
  });

  it("shows no toast when the next page fails with an expired session", async () => {
    fetchMock.mockResolvedValueOnce(ok(page(1, 0, 20, 25)));
    await renderScreen();
    await waitFor(() => expect(listData()).toHaveLength(20));
    (api.apiGet as jest.Mock).mockRejectedValueOnce(new SessionExpiredError());

    await fireEvent(screen.getByTestId("my-history-list"), "endReached");

    expect(api.apiGet).toHaveBeenLastCalledWith("/classes/mine/history?page=2&perPage=20", {
      authenticated: true,
    });
    expect(listData()).toHaveLength(20);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("opens a class's details", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok(page(1, 0, 1, 1)));
    await renderScreen();

    await user.press(await screen.findByRole("button", { name: "Surf, 08:00 – 09:00" }));

    expect(router.push).toHaveBeenCalledWith(routes.student.classDetail("c-0"));
  });

  it("says when no class was taken yet", async () => {
    fetchMock.mockResolvedValue(ok(page(1, 0, 0, 0)));
    await renderScreen();

    expect(await screen.findByText("You haven't taken any class yet.")).toBeOnTheScreen();
  });

  it("shows a spinner while loading, then the error with a retry that loads again", async () => {
    let fail: (value: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (fail = resolve)));
    const user = userEvent.setup();
    await renderScreen();

    expect(screen.getByTestId("my-history-loading")).toBeOnTheScreen();

    await act(async () => fail(failure(500) as Response));

    expect(await screen.findByText("We couldn't load your history.")).toBeOnTheScreen();
    expect(screen.queryByText("You haven't taken any class yet.")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findAllByText("3 students present")).toHaveLength(3);
  });

  it("shows nothing after an expired session", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(new SessionExpiredError());
    await renderScreen();

    await waitFor(() => expect(screen.queryByTestId("my-history-loading")).not.toBeOnTheScreen());
    expect(screen.queryByText("We couldn't load your history.")).not.toBeOnTheScreen();
    expect(screen.queryByText("You haven't taken any class yet.")).not.toBeOnTheScreen();
  });

  it("reloads on pull-to-refresh", async () => {
    await renderScreen();
    await waitFor(() => expect(listData()).toHaveLength(3));
    fetchMock.mockResolvedValue(ok(page(1, 0, 1, 1)));

    await act(async () => {
      await screen.getByTestId("my-history-list").props.refreshControl.props.onRefresh();
    });

    expect(listData()).toHaveLength(1);
    expect(screen.getByTestId("my-history-list").props.refreshControl.props.refreshing).toBe(false);
  });

  it("is translated into Portuguese and Spanish", async () => {
    fetchMock.mockResolvedValue(ok(page(1, 0, 0, 0)));
    await act(() => i18n.changeLanguage("pt-BR"));
    const view = await renderScreen();

    expect(screen.getByText("HISTÓRICO")).toBeOnTheScreen();
    expect(await screen.findByText("Você ainda não fez nenhuma aula.")).toBeOnTheScreen();

    await view.unmount();
    await act(() => i18n.changeLanguage("es-ES"));
    await renderScreen();

    expect(screen.getByText("HISTORIAL")).toBeOnTheScreen();
    expect(await screen.findByText("Todavía no has hecho ninguna clase.")).toBeOnTheScreen();
  });
});

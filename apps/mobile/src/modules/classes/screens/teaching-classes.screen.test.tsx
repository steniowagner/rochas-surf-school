import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { SessionExpiredError } from "@/services/api";
import * as api from "@/services/api";

import {
  buildClassItem,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";
import type { ClassItem } from "../classes.types";
import { TeachingClassesScreen } from "./teaching-classes.screen";

// The callback the screen gave `useFocusEffect`, run by a test when the screen is focused.
let focusEffect: () => (() => void) | void = () => undefined;
// The options the screen gave its Stack header.
let headerOptions: any = {};
// The clock `useNow` answers; a test moves it to simulate the minute tick.
let mockNow = new Date();

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => (() => void) | void) => {
    focusEffect = effect;
  },
  // Renders the screen's header title and right button so the tests can see them.
  Stack: {
    Screen: ({ options }: any) => {
      headerOptions = options;

      return (
        <>
          {options.headerTitle()}
          {options.headerRight?.()}
        </>
      );
    },
  },
}));

jest.mock("../hooks/use-now.hook", () => ({ useNow: () => mockNow }));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiGet: jest.fn(actual.apiGet) };
});

// Thursday 17 Sep 2026, 08:00 in Fortaleza (UTC−3).
const NOW = new Date("2026-09-17T11:00:00.000Z");
const CANCELLED_AT = "2026-09-10T12:00:00.000Z";

// B under way 07:30–09:00, N 09:00 and L 19:00 today, T cancelled tomorrow 11:00, F on Saturday 09:00.
const B = buildClassItem("b", "2026-09-17T10:30:00.000Z", "2026-09-17T12:00:00.000Z");
const N = buildClassItem("n", "2026-09-17T12:00:00.000Z", "2026-09-17T13:00:00.000Z");
const L = buildClassItem("l", "2026-09-17T22:00:00.000Z", "2026-09-17T23:00:00.000Z");
const T = buildClassItem("t", "2026-09-18T14:00:00.000Z", "2026-09-18T15:00:00.000Z", { cancelledAt: CANCELLED_AT });
const F = buildClassItem("f", "2026-09-19T12:00:00.000Z", "2026-09-19T13:00:00.000Z");
const ITEMS = [B, N, L, T, F];

const cardOf = (time: string) => screen.getByRole("button", { name: `Surf, ${time}` });
const cardTimes = () =>
  screen.getAllByRole("button", { name: /^Surf, / }).map((card) => card.props.accessibilityLabel);

const renderScreen = async (role: "instructor" | "admin" = "instructor", items: ClassItem[] = ITEMS) => {
  fetchMock.mockResolvedValue(ok({ items, teachesAny: true }));
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const element = () => (
    <QueryClientProvider client={queryClient}>
      <TeachingClassesScreen role={role} />
    </QueryClientProvider>
  );
  const view = await render(element());

  return { ...view, rerenderScreen: () => view.rerender(element()) };
};

beforeEach(() => {
  setupSignedInUser();
  (router.push as jest.Mock).mockReset();
  mockNow = NOW;
});

afterEach(async () => {
  await act(() => i18n.changeLanguage("en-US"));
});

describe("TeachingClassesScreen", () => {
  it("shows the title with nothing on the right, the class under way on grape, then each day with its classes", async () => {
    await renderScreen();

    expect(screen.getByRole("header", { name: "MY CLASSES" })).toBeOnTheScreen();
    // A centered title: no left alignment and no left items, so the native back button stays.
    expect(headerOptions.headerTitleAlign).toBeUndefined();
    expect(headerOptions.unstable_headerLeftItems).toBeUndefined();
    expect(headerOptions.headerRight).toBeUndefined();
    expect(screen.queryAllByRole("button", { name: /history/i })).toEqual([]);
    expect(await screen.findByText("19:00 – 20:00")).toBeOnTheScreen();
    expect(cardTimes()).toEqual([
      "Surf, 07:30 – 09:00",
      "Surf, 09:00 – 10:00",
      "Surf, 19:00 – 20:00",
      "Surf, 11:00 – 12:00",
      "Surf, 09:00 – 10:00",
    ]);
    expect(screen.getAllByRole("header").map((header) => header.props.accessibilityLabel).slice(1)).toEqual([
      "Today, 17 Sep",
      "Tomorrow, 18 Sep",
      "Saturday, 19 Sep",
    ]);
    expect(cardOf("07:30 – 09:00").props.className).toContain("bg-grape");
    expect(screen.getByText("In progress")).toBeOnTheScreen();
    expect(screen.getByText("Cancelled")).toBeOnTheScreen();
  });

  it("highlights only the next class with the \"Up next\" chip and the sun border", async () => {
    await renderScreen();
    await screen.findByText("19:00 – 20:00");

    expect(screen.getAllByText("Up next")).toHaveLength(1);
    const [next, saturday] = screen.getAllByRole("button", { name: "Surf, 09:00 – 10:00" });
    expect(next!.props.className).toContain("border-sun");
    expect(saturday!.props.className).not.toContain("border-sun");
    expect(cardOf("19:00 – 20:00").props.className).not.toContain("border-sun");
  });

  it("moves on with the minute tick, without a refetch", async () => {
    const { rerenderScreen } = await renderScreen();
    await screen.findByText("19:00 – 20:00");

    mockNow = new Date("2026-09-17T12:00:00.000Z");
    await rerenderScreen();

    expect(screen.queryByText("07:30 – 09:00")).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: "Surf, 09:00 – 10:00" })[0]!.props.className).toContain(
      "bg-grape",
    );
    expect(cardOf("19:00 – 20:00").props.className).toContain("border-sun");
    expect(requestedPaths()).toEqual(["/classes/teaching"]);
  });

  it("shows no grape card when nothing is under way", async () => {
    await renderScreen("instructor", [N, F]);
    await screen.findAllByText("09:00 – 10:00");

    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: /^Surf, / }).some((card) => card.props.className.includes("bg-grape"))).toBe(
      false,
    );
  });

  it("opens a class's details in the role's stack", async () => {
    const user = userEvent.setup();
    await renderScreen("admin");
    await screen.findByText("19:00 – 20:00");

    await user.press(cardOf("19:00 – 20:00"));
    await user.press(cardOf("07:30 – 09:00"));

    expect(router.push).toHaveBeenNthCalledWith(1, routes.admin.classDetail("l"));
    expect(router.push).toHaveBeenNthCalledWith(2, routes.admin.classDetail("b"));
  });

  it("opens an instructor's class in the instructor's stack", async () => {
    await renderScreen("instructor");
    await screen.findByText("19:00 – 20:00");

    await userEvent.press(cardOf("19:00 – 20:00"));

    expect(router.push).toHaveBeenCalledWith(routes.instructor.classDetail("l"));
  });

  it("says when no class is assigned", async () => {
    await renderScreen("instructor", []);

    expect(await screen.findByRole("header", { name: "Nothing here" })).toBeOnTheScreen();
    expect(screen.getByText("You don't have any classes assigned yet.")).toBeOnTheScreen();
  });

  it("reads the classes again when the screen is focused again", async () => {
    await renderScreen();
    await screen.findByText("19:00 – 20:00");
    fetchMock.mockResolvedValue(ok({ items: [F], teachesAny: true }));

    await act(async () => {
      focusEffect();
    });

    await waitFor(() => expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(1));
    expect(requestedPaths()).toEqual(["/classes/teaching", "/classes/teaching"]);
  });

  it("shows the skeleton as one loading state, then the error with a retry that loads again", async () => {
    let fail: (value: Response) => void = () => undefined;
    const user = userEvent.setup();
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (fail = resolve)));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    await render(
      <QueryClientProvider client={queryClient}>
        <TeachingClassesScreen role="instructor" />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Loading the classes")).toBeOnTheScreen();
    expect(screen.getAllByTestId("class-card-skeleton")).toHaveLength(4);

    await act(async () => fail(failure(500) as Response));

    expect(await screen.findByRole("header", { name: "Something went wrong" })).toBeOnTheScreen();
    expect(screen.getByText("We couldn't load your classes. Check your connection and try again.")).toBeOnTheScreen();
    fetchMock.mockResolvedValue(ok({ items: ITEMS, teachesAny: true }));

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("19:00 – 20:00")).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "Something went wrong" })).not.toBeOnTheScreen();
  });

  it("keeps the error with the button's spinner while Try again loads, not the skeleton", async () => {
    let answer: (value: Response) => void = () => undefined;
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(failure(500));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    await render(
      <QueryClientProvider client={queryClient}>
        <TeachingClassesScreen role="instructor" />
      </QueryClientProvider>,
    );
    await screen.findByRole("header", { name: "Something went wrong" });
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)));

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByRole("button", { name: "Try again" })).toBeDisabled();
    expect(screen.queryByLabelText("Loading the classes")).not.toBeOnTheScreen();

    await act(async () => answer(ok({ items: ITEMS, teachesAny: true }) as Response));

    expect(await screen.findByText("19:00 – 20:00")).toBeOnTheScreen();
  });

  it("shows nothing after an expired session", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(new SessionExpiredError());
    await renderScreen();

    await waitFor(() => expect(screen.queryByLabelText("Loading the classes")).not.toBeOnTheScreen());
    expect(api.apiGet).toHaveBeenCalledWith("/classes/teaching", { authenticated: true });
    expect(screen.queryByRole("header", { name: "Something went wrong" })).not.toBeOnTheScreen();
    expect(screen.queryByText("Nothing here")).not.toBeOnTheScreen();
  });

  it("reloads on pull-to-refresh", async () => {
    await renderScreen();
    await screen.findByText("19:00 – 20:00");
    fetchMock.mockResolvedValue(ok({ items: [F], teachesAny: true }));

    await act(async () => {
      await screen.getByTestId("teaching-classes-list").props.refreshControl.props.onRefresh();
    });

    expect(screen.getAllByRole("button", { name: /^Surf, / })).toHaveLength(1);
    expect(screen.getByTestId("teaching-classes-list").props.refreshControl.props.refreshing).toBe(false);
  });

  it("is translated into Portuguese", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    await renderScreen();

    expect(screen.getByRole("header", { name: "MINHAS AULAS" })).toBeOnTheScreen();
    expect(await screen.findByRole("header", { name: "Hoje, 17 set" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Amanhã, 18 set" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Sábado, 19 set" })).toBeOnTheScreen();
    expect(screen.getByText("Próxima")).toBeOnTheScreen();
    expect(screen.getByText("Em andamento")).toBeOnTheScreen();
    expect(screen.getByText("Cancelada")).toBeOnTheScreen();
  });

  it("writes a weekday's name without the Portuguese \"-feira\"", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    // Wednesday 23 Sep, 09:00.
    await renderScreen("instructor", [buildClassItem("w", "2026-09-23T12:00:00.000Z", "2026-09-23T13:00:00.000Z")]);

    expect(await screen.findByRole("header", { name: "Quarta, 23 set" })).toBeOnTheScreen();
    expect(screen.queryByText(/feira/i)).toBeNull();
  });

  it("shows the empty state and the error in Portuguese", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    await renderScreen("instructor", []);
    expect(await screen.findByText("Nada por aqui")).toBeOnTheScreen();
    expect(screen.getByText("Você ainda não tem aulas atribuídas.")).toBeOnTheScreen();

    fetchMock.mockResolvedValue(failure(500));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    await render(
      <QueryClientProvider client={queryClient}>
        <TeachingClassesScreen role="instructor" />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("header", { name: "Algo deu errado" })).toBeOnTheScreen();
    expect(
      screen.getByText("Não conseguimos carregar suas aulas. Verifique sua conexão e tente novamente."),
    ).toBeOnTheScreen();
  });

  it("is translated into Spanish", async () => {
    await act(() => i18n.changeLanguage("es-ES"));
    await renderScreen();

    expect(screen.getByRole("header", { name: "MIS CLASES" })).toBeOnTheScreen();
    expect(await screen.findByRole("header", { name: /^Hoy, / })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: /^Mañana, / })).toBeOnTheScreen();
    expect(screen.getByText("Próxima")).toBeOnTheScreen();
  });
});

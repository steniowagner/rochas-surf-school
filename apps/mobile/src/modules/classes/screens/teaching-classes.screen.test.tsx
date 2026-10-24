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
import { TeachingClassesEntryRow } from "../components/teaching-classes-entry-row";
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

describe("TeachingClassesScreen sport filter", () => {
  // Under way: Bs (surf) 07:30–09:00 and Bk (skate) 07:00–09:00. Today: Nk (skate) 09:00, Ns (surf) 11:00. Saturday:
  // Fk (skate) 09:00. In start order, as the API answers.
  const BK = buildClassItem("bk", "2026-09-17T10:00:00.000Z", "2026-09-17T12:00:00.000Z", { discipline: "skate" });
  const BS = buildClassItem("bs", "2026-09-17T10:30:00.000Z", "2026-09-17T12:00:00.000Z");
  const NK = buildClassItem("nk", "2026-09-17T12:00:00.000Z", "2026-09-17T13:00:00.000Z", { discipline: "skate" });
  const NS = buildClassItem("ns", "2026-09-17T14:00:00.000Z", "2026-09-17T15:00:00.000Z");
  const FK = buildClassItem("fk", "2026-09-19T12:00:00.000Z", "2026-09-19T13:00:00.000Z", { discipline: "skate" });
  const MIXED = [BK, BS, NK, NS, FK];

  const choose = async (user: ReturnType<typeof userEvent.setup>, label: "All" | "Surf" | "Skate") => {
    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await user.press(screen.getByRole("button", { name: label }));
  };

  const cards = () =>
    screen.getAllByRole("button", { name: /^(Surf|Skate), / }).map((card) => card.props.accessibilityLabel);
  const dayHeaders = () =>
    screen
      .getAllByRole("header")
      .map((header) => header.props.accessibilityLabel)
      .slice(1);
  const grapeCards = () =>
    screen
      .getAllByRole("button", { name: /^(Surf|Skate), / })
      .filter((card) => card.props.className.includes("bg-grape"))
      .map((card) => card.props.accessibilityLabel);
  const nextCard = () =>
    screen
      .getAllByRole("button", { name: /^(Surf|Skate), / })
      .filter((card) => card.props.className.includes("border-sun"))
      .map((card) => card.props.accessibilityLabel);

  it("lists only the chosen sport, with its own class under way and its own next class", async () => {
    const user = userEvent.setup();
    await renderScreen("instructor", MIXED);
    await screen.findByText("11:00 – 12:00");

    await choose(user, "Surf");

    expect(screen.queryByTestId("discipline-filter-backdrop")).not.toBeOnTheScreen();
    expect(cards()).toEqual(["Surf, 07:30 – 09:00", "Surf, 11:00 – 12:00"]);
    expect(grapeCards()).toEqual(["Surf, 07:30 – 09:00"]);
    expect(dayHeaders()).toEqual(["Today, 17 Sep"]);
    expect(nextCard()).toEqual(["Surf, 11:00 – 12:00"]);
    expect(screen.getAllByText("Up next")).toHaveLength(1);

    await choose(user, "Skate");

    expect(cards()).toEqual(["Skate, 07:00 – 09:00", "Skate, 09:00 – 10:00", "Skate, 09:00 – 10:00"]);
    expect(grapeCards()).toEqual(["Skate, 07:00 – 09:00"]);
    expect(dayHeaders()).toEqual(["Today, 17 Sep", "Saturday, 19 Sep"]);
    const [todaySkate, saturdaySkate] = screen.getAllByRole("button", { name: "Skate, 09:00 – 10:00" });
    expect(todaySkate!.props.className).toContain("border-sun");
    expect(saturdaySkate!.props.className).not.toContain("border-sun");

    await choose(user, "All");

    expect(cards()).toEqual([
      "Skate, 07:00 – 09:00",
      "Surf, 07:30 – 09:00",
      "Skate, 09:00 – 10:00",
      "Surf, 11:00 – 12:00",
      "Skate, 09:00 – 10:00",
    ]);
    expect(grapeCards()).toEqual(["Skate, 07:00 – 09:00", "Surf, 07:30 – 09:00"]);
    expect(dayHeaders()).toEqual(["Today, 17 Sep", "Saturday, 19 Sep"]);
    expect(screen.getAllByRole("button", { name: "Skate, 09:00 – 10:00" })[0]!.props.className).toContain(
      "border-sun",
    );
    expect(screen.getAllByText("Up next")).toHaveLength(1);
  });

  it("keeps a cancelled class of the chosen sport in its day, never as the next class", async () => {
    const user = userEvent.setup();
    // Surf, today 10:00–11:00, cancelled: before Ns, so it would be the next class if it counted.
    const cancelled = buildClassItem("cs", "2026-09-17T13:00:00.000Z", "2026-09-17T14:00:00.000Z", {
      cancelledAt: CANCELLED_AT,
    });
    await renderScreen("instructor", [BK, BS, NK, cancelled, NS, FK]);
    await screen.findByText("11:00 – 12:00");

    await choose(user, "Surf");

    expect(cards()).toEqual(["Surf, 07:30 – 09:00", "Surf, 10:00 – 11:00", "Surf, 11:00 – 12:00"]);
    expect(dayHeaders()).toEqual(["Today, 17 Sep"]);
    expect(screen.getByText("Cancelled")).toBeOnTheScreen();
    expect(nextCard()).toEqual(["Surf, 11:00 – 12:00"]);
  });

  it("keeps the chosen sport with the minute tick, without a refetch", async () => {
    const user = userEvent.setup();
    const { rerenderScreen } = await renderScreen("instructor", MIXED);
    await screen.findByText("11:00 – 12:00");
    await choose(user, "Skate");

    // 09:00: Bk has ended and Nk is under way.
    mockNow = new Date("2026-09-17T12:00:00.000Z");
    await rerenderScreen();

    expect(cards()).toEqual(["Skate, 09:00 – 10:00", "Skate, 09:00 – 10:00"]);
    expect(grapeCards()).toEqual(["Skate, 09:00 – 10:00"]);
    expect(dayHeaders()).toEqual(["Saturday, 19 Sep"]);
    expect(nextCard()).toEqual(["Skate, 09:00 – 10:00"]);
    expect(requestedPaths()).toEqual(["/classes/teaching"]);
  });

  it("filters without a request", async () => {
    const user = userEvent.setup();
    await renderScreen("admin", MIXED);
    await screen.findByText("11:00 – 12:00");

    await choose(user, "Surf");
    await choose(user, "Skate");
    await choose(user, "All");

    expect(cards()).toHaveLength(5);
    expect(requestedPaths()).toEqual(["/classes/teaching"]);
  });

  it("is back to All when the screen opens again", async () => {
    const user = userEvent.setup();
    const first = await renderScreen("instructor", MIXED);
    await screen.findByText("11:00 – 12:00");
    await choose(user, "Surf");
    expect(cards()).toHaveLength(2);
    await first.unmount();

    await renderScreen("instructor", MIXED);

    await waitFor(() => expect(cards()).toHaveLength(5));
    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    expect(screen.getByRole("button", { name: "All", selected: true })).toBeOnTheScreen();
  });

  it.each(["instructor", "admin"] as const)("shows the filter button to the %s", async (role) => {
    await renderScreen(role, MIXED);
    await screen.findByText("11:00 – 12:00");

    expect(screen.getByRole("button", { name: "Filter by sport" })).toBeOnTheScreen();
  });

  it("shows the filter button while loading, on an error and when empty", async () => {
    const queryClient = () =>
      new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined));
    const loading = await render(
      <QueryClientProvider client={queryClient()}>
        <TeachingClassesScreen role="instructor" />
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText("Loading the classes")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Filter by sport" })).toBeOnTheScreen();
    await loading.unmount();

    fetchMock.mockResolvedValueOnce(failure(500));
    const failed = await render(
      <QueryClientProvider client={queryClient()}>
        <TeachingClassesScreen role="instructor" />
      </QueryClientProvider>,
    );
    await screen.findByRole("header", { name: "Something went wrong" });
    expect(screen.getByRole("button", { name: "Filter by sport" })).toBeOnTheScreen();
    await failed.unmount();

    await renderScreen("instructor", []);
    await screen.findByRole("header", { name: "Nothing here" });
    expect(screen.getByRole("button", { name: "Filter by sport" })).toBeOnTheScreen();
  });

  it("pads the list's bottom for the button and its gap", async () => {
    await renderScreen("instructor", MIXED);
    await screen.findByText("11:00 – 12:00");

    // The mocked bottom inset is 0, so the list keeps its 24 and adds the button's 56 and its 16 gap.
    expect(screen.getByTestId("teaching-classes-list").props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingBottom: 24 + 56 + 16 }),
    );
  });

  it.each(["Surf", "Skate"] as const)(
    "says nothing is assigned whatever the sport when there are no classes: %s",
    async (label) => {
      const user = userEvent.setup();
      await renderScreen("instructor", []);
      await screen.findByRole("header", { name: "Nothing here" });

      await choose(user, label);

      expect(screen.getByRole("header", { name: "Nothing here" })).toBeOnTheScreen();
      expect(screen.getByText("You don't have any classes assigned yet.")).toBeOnTheScreen();
    },
  );

  it.each([
    ["pt-BR", "Surf", [NK, FK], "Nenhuma aula de surf", "Você não tem aulas de surf atribuídas."],
    ["pt-BR", "Skate", [BS, NS], "Nenhuma aula de skate", "Você não tem aulas de skate atribuídas."],
    ["es-ES", "Surf", [NK, FK], "Ninguna clase de surf", "No tienes clases de surf asignadas."],
    ["es-ES", "Skate", [BS, NS], "Ninguna clase de skate", "No tienes clases de skate asignadas."],
    ["en-US", "Surf", [NK, FK], "No surf classes", "You don't have any surf classes assigned."],
    ["en-US", "Skate", [BS, NS], "No skate classes", "You don't have any skate classes assigned."],
  ] as const)(
    "says when no class of the chosen sport is assigned (%s, %s)",
    async (language, label, items, title, description) => {
      const user = userEvent.setup();
      await act(() => i18n.changeLanguage(language));
      // The filter's labels in the language: "Surf" and "Skate" are the same in all three.
      const filterName = { "pt-BR": "Filtrar por modalidade", "es-ES": "Filtrar por modalidad", "en-US": "Filter by sport" };
      await renderScreen("instructor", [...items]);
      await waitFor(() => expect(cards()).toHaveLength(2));

      await user.press(screen.getByRole("button", { name: filterName[language] }));
      await user.press(screen.getByRole("button", { name: label }));

      expect(screen.queryAllByRole("button", { name: /^(Surf|Skate), / })).toEqual([]);
      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
      expect(screen.getByText(description)).toBeOnTheScreen();
      // No action: the filter's is the only button.
      expect(screen.getAllByRole("button").map((button) => button.props.accessibilityLabel)).toEqual([
        filterName[language],
      ]);
    },
  );

  it("brings the classes back on All", async () => {
    const user = userEvent.setup();
    await renderScreen("instructor", [NK, FK]);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await choose(user, "Surf");
    expect(screen.getByRole("header", { name: "No surf classes" })).toBeOnTheScreen();

    await choose(user, "All");

    expect(cards()).toEqual(["Skate, 09:00 – 10:00", "Skate, 09:00 – 10:00"]);
    expect(screen.queryByRole("header", { name: "No surf classes" })).not.toBeOnTheScreen();
  });

  it("shows the filtered empty state when the sport's last class ends at the minute tick, without a refetch", async () => {
    const user = userEvent.setup();
    // The only surf class is under way until 09:00; the skate one is today at 09:00–10:00.
    const { rerenderScreen } = await renderScreen("instructor", [BS, NK]);
    await waitFor(() => expect(cards()).toHaveLength(2));
    await choose(user, "Surf");
    expect(cards()).toEqual(["Surf, 07:30 – 09:00"]);

    mockNow = new Date("2026-09-17T12:00:00.000Z");
    await rerenderScreen();

    expect(screen.queryAllByRole("button", { name: /^(Surf|Skate), / })).toEqual([]);
    expect(screen.getByRole("header", { name: "No surf classes" })).toBeOnTheScreen();
    expect(screen.getByText("You don't have any surf classes assigned.")).toBeOnTheScreen();

    // 10:00: no class left of any sport, so nothing is assigned.
    mockNow = new Date("2026-09-17T13:00:00.000Z");
    await rerenderScreen();

    expect(screen.getByRole("header", { name: "Nothing here" })).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "No surf classes" })).not.toBeOnTheScreen();
    expect(requestedPaths()).toEqual(["/classes/teaching"]);
  });

  it("keeps the home row's count whatever the sport chosen", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok({ items: MIXED, teachesAny: true }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    // The home's row and the screen share the query, as when the screen is pushed over the home.
    await render(
      <QueryClientProvider client={queryClient}>
        <TeachingClassesEntryRow role="instructor" onPress={jest.fn()} />
        <TeachingClassesScreen role="instructor" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText("5 classes assigned to you")).toBeOnTheScreen();

    await choose(user, "Surf");
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("5 classes assigned to you")).toBeOnTheScreen();

    await choose(user, "Skate");
    expect(cards()).toHaveLength(3);
    expect(screen.getByText("5 classes assigned to you")).toBeOnTheScreen();
  });
});

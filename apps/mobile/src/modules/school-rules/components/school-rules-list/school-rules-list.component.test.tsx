import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";

import i18n from "@/i18n";
import { SessionContext } from "@/providers/session/session.context";

import { SchoolRulesList } from "./school-rules-list.component";

const fetchMock = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const ruleOf = (position: number) => ({
  id: `rule-${position}`,
  title: `Title ${position}`,
  description: `Description ${position}`,
  index: position - 1,
});

const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const renderList = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      <SessionContext.Provider
        value={{
          user: null,
          tokens,
          setSession: jest.fn(),
          clearSession: jest.fn(),
          isRestoring: false,
          updateUser: jest.fn(),
        }}
      >
        <SchoolRulesList />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("SchoolRulesList", () => {
  it("shows a loading indicator", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderList();

    expect(
      screen.root?.queryAll((node) => node.type === "ActivityIndicator"),
    ).toHaveLength(1);
  });

  it("shows the rules in order", async () => {
    fetchMock.mockResolvedValue(
      response(200, { version: 3, rules: [1, 2, 3].map(ruleOf) }),
    );
    await renderList();

    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    expect(screen.getAllByText(/^0\d$/).map((n) => n.props.children)).toEqual([
      "01",
      "02",
      "03",
    ]);
    expect(screen.getByText("Description 2")).toBeOnTheScreen();
    expect(
      screen.getAllByText(/^Title \d$/).map((n) => n.props.children),
    ).toEqual(["Title 1", "Title 2", "Title 3"]);
  });

  it("numbers twelve rules up to 12", async () => {
    fetchMock.mockResolvedValue(
      response(200, {
        version: 3,
        rules: Array.from({ length: 12 }, (_, i) => ruleOf(i + 1)),
      }),
    );
    await renderList();

    expect(await screen.findByText("12")).toBeOnTheScreen();
  });

  it("shows the empty message", async () => {
    fetchMock.mockResolvedValue(response(200, { version: 4, rules: [] }));
    await renderList();

    expect(
      await screen.findByText("The school has no rules yet."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("01")).not.toBeOnTheScreen();
  });

  it("retries after a failed load", async () => {
    fetchMock
      .mockResolvedValueOnce(response(500, {}))
      .mockResolvedValueOnce(response(200, { version: 1, rules: [ruleOf(1)] }));
    const user = userEvent.setup();
    await renderList();

    expect(
      await screen.findByText("Couldn't load the rules."),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    expect(
      screen.queryByText("Couldn't load the rules."),
    ).not.toBeOnTheScreen();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it.each([
    ["en-US", "The school has no rules yet."],
    ["pt-BR", "A escola ainda não tem regras."],
    ["es-ES", "La escuela todavía no tiene normas."],
  ])("shows the empty message in %s", async (locale, empty) => {
    await i18n.changeLanguage(locale);
    fetchMock.mockResolvedValue(response(200, { version: 4, rules: [] }));
    await renderList();

    expect(await screen.findByText(empty)).toBeOnTheScreen();
  });

  it.each([
    ["en-US", "Couldn't load the rules.", "Try again"],
    ["pt-BR", "Não foi possível carregar as regras.", "Tentar novamente"],
    ["es-ES", "No se pudieron cargar las normas.", "Intentar de nuevo"],
  ])("shows the load error in %s", async (locale, loadError, retry) => {
    await i18n.changeLanguage(locale);
    fetchMock.mockResolvedValue(response(500, {}));
    await renderList();

    expect(await screen.findByText(loadError)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: retry })).toBeOnTheScreen();
  });
});

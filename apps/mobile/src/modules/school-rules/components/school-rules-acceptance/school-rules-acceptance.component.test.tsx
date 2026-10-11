import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";

import i18n from "@/i18n";
import { SessionContext } from "@/providers/session/session.context";

import { SchoolRulesAcceptance } from "./school-rules-acceptance.component";

const fetchMock = jest.fn();
const mockShow = jest.fn();
const setSession = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const user = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: "+5585999998888",
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const ruleOf = (position: number) => ({
  id: `rule-${position}`,
  title: `Title ${position}`,
  description: `Description ${position}`,
  index: position - 1,
});

const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

type Handlers = {
  rules?: () => unknown;
  accept?: () => unknown;
};

// Answers GET /school-rules and POST /school-rules/acceptances through the given handlers.
const serve = ({ rules, accept }: Handlers) =>
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith("/acceptances") ? accept?.() : rules?.(),
  );

const acceptCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url.endsWith("/acceptances"));

const renderStep = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      <SessionContext.Provider
        value={{ user, tokens, setSession, clearSession: jest.fn() }}
      >
        <SchoolRulesAcceptance
          eyebrow="Last step"
          title="School rules"
          description="Few and simple — so classes go well for everyone."
          submitLabel="Enter the app"
        />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );

const checkbox = () => screen.getByRole("checkbox");
const cta = () => screen.getByRole("button", { name: "Enter the app" });

beforeEach(() => {
  fetchMock.mockReset();
  mockShow.mockReset();
  setSession.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("SchoolRulesAcceptance", () => {
  it("shows the copy it is given", async () => {
    serve({
      rules: () => json(200, { version: 3, rules: [1, 2, 3].map(ruleOf) }),
    });
    await renderStep();

    expect(screen.getByText("Last step")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "School rules" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Few and simple — so classes go well for everyone."),
    ).toBeOnTheScreen();
    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    expect(screen.getByText("Description 3")).toBeOnTheScreen();
  });

  it("enables the CTA only when ticked", async () => {
    serve({ rules: () => json(200, { version: 3, rules: [ruleOf(1)] }) });
    const press = userEvent.setup();
    await renderStep();
    await screen.findByText("Title 1");

    expect(checkbox()).not.toBeChecked();
    expect(cta()).toBeDisabled();
    await press.press(cta());
    expect(acceptCalls()).toHaveLength(0);

    await press.press(
      screen.getByText(
        "I have read and accept the rules and terms of Rocha's Surf School.",
      ),
    );

    expect(checkbox()).toBeChecked();
    expect(cta()).toBeEnabled();

    await press.press(checkbox());

    expect(checkbox()).not.toBeChecked();
    expect(cta()).toBeDisabled();
  });

  it("disabled while the rules can't be shown (loading)", async () => {
    serve({ rules: () => new Promise(() => {}) });
    const press = userEvent.setup();
    await renderStep();

    expect(checkbox()).toBeDisabled();
    expect(cta()).toBeDisabled();

    await press.press(checkbox());

    expect(checkbox()).not.toBeChecked();
  });

  it("disabled while the rules can't be shown (load error)", async () => {
    serve({ rules: () => json(500, {}) });
    await renderStep();

    expect(
      await screen.findByText("Couldn't load the rules."),
    ).toBeOnTheScreen();
    expect(checkbox()).toBeDisabled();
    expect(cta()).toBeDisabled();
  });

  it("accepts an empty list", async () => {
    serve({
      rules: () => json(200, { version: 4, rules: [] }),
      accept: () => json(200, { ...user, rulesAccepted: true }),
    });
    const press = userEvent.setup();
    await renderStep();

    expect(
      await screen.findByText("The school has no rules yet."),
    ).toBeOnTheScreen();

    await press.press(checkbox());
    await press.press(cta());

    await waitFor(() =>
      expect(setSession).toHaveBeenCalledWith({
        user: { ...user, rulesAccepted: true },
        tokens,
      }),
    );
    expect(acceptCalls()).toHaveLength(1);
    expect(acceptCalls()[0][1]).toEqual({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer at-1",
      },
      body: JSON.stringify({ version: 4 }),
    });
  });

  it("sends one request for two quick presses", async () => {
    let resolveAccept: (value: unknown) => void = () => {};
    serve({
      rules: () => json(200, { version: 3, rules: [ruleOf(1)] }),
      accept: () => new Promise((resolve) => (resolveAccept = resolve)),
    });
    const press = userEvent.setup();
    await renderStep();
    await screen.findByText("Title 1");
    await press.press(checkbox());

    await press.press(cta());
    await press.press(cta());

    expect(acceptCalls()).toHaveLength(1);
    expect(
      screen.root?.queryAll((node) => node.type === "ActivityIndicator"),
    ).toHaveLength(1);

    resolveAccept(json(200, { ...user, rulesAccepted: true }));
    await waitFor(() => expect(setSession).toHaveBeenCalled());
  });

  it("outdated: unticks and accepts the new version", async () => {
    let version = 3;
    let acceptAttempts = 0;
    serve({
      rules: () => json(200, { version, rules: [ruleOf(version)] }),
      accept: () => {
        acceptAttempts += 1;

        if (acceptAttempts === 1) {
          version = 4;

          return json(409, {
            errors: ["schoolRules.version.outdated"],
            details: { currentVersion: 4 },
          });
        }

        return json(200, { ...user, rulesAccepted: true });
      },
    });
    const press = userEvent.setup();
    await renderStep();
    await screen.findByText("Title 3");
    await press.press(checkbox());

    await press.press(cta());

    expect(await screen.findByText("Title 4")).toBeOnTheScreen();
    expect(mockShow).toHaveBeenCalledWith(
      "The rules changed. Read them again and accept.",
    );
    expect(checkbox()).not.toBeChecked();
    expect(cta()).toBeDisabled();
    expect(setSession).not.toHaveBeenCalled();

    await press.press(checkbox());
    await press.press(cta());

    await waitFor(() => expect(setSession).toHaveBeenCalled());
    expect(acceptCalls()[1][1].body).toBe(JSON.stringify({ version: 4 }));
  });

  it("keeps the box ticked after a failed accept", async () => {
    serve({
      rules: () => json(200, { version: 3, rules: [ruleOf(1)] }),
      accept: () => json(500, {}),
    });
    const press = userEvent.setup();
    await renderStep();
    await screen.findByText("Title 1");
    await press.press(checkbox());

    await press.press(cta());

    await waitFor(() => expect(mockShow).toHaveBeenCalled());
    expect(checkbox()).toBeChecked();
    expect(cta()).toBeEnabled();
  });

  it.each([
    [
      "en-US",
      "I have read and accept the rules and terms of Rocha's Surf School.",
    ],
    ["pt-BR", "Li e aceito as regras e os termos da Rocha's Surf School."],
    [
      "es-ES",
      "He leído y acepto las normas y los términos de Rocha's Surf School.",
    ],
  ])("shows the checkbox label in %s", async (locale, accept) => {
    await i18n.changeLanguage(locale);
    serve({ rules: () => json(200, { version: 3, rules: [ruleOf(1)] }) });
    await renderStep();

    expect(screen.getByText(accept)).toBeOnTheScreen();
    // The rules' text is shown as written, in every language.
    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
  });
});

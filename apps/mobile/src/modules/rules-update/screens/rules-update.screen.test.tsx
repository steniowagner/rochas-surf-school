import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { ReactNode, useState } from "react";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminRoute from "@/app/(private)/admin/index";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorRoute from "@/app/(private)/instructor/index";
import StudentLayout from "@/app/(private)/student/_layout";
import StudentRoute from "@/app/(private)/student/index";
import RulesUpdateLayout from "@/app/(rules-update)/rules-update/_layout";
import RulesUpdateRoute from "@/app/(rules-update)/rules-update/index";
import Index from "@/app/index";
import { routes } from "@/constants/routes";
import { RootNavigator } from "@/navigation/root-navigator/root-navigator.component";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import i18n from "@/i18n";
import { SessionContext } from "@/providers/session/session.context";

import { RulesUpdateScreen } from "./rules-update.screen";

const fetchMock = jest.fn();
const mockShow = jest.fn();
const setSession = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  ...jest.requireActual("@/providers/alert-message"),
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
  rulesAcceptedBefore: true,
  denialReason: null,
  reactivationStatus: null,
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

const serve = ({
  rules,
  accept,
}: {
  rules?: () => unknown;
  accept?: () => unknown;
}) =>
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith("/acceptances") ? accept?.() : rules?.(),
  );

const acceptCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url.endsWith("/acceptances"));

const renderScreen = () =>
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
          user,
          tokens,
          setSession,
          clearSession: jest.fn(),
          isRestoring: false,
          updateUser: jest.fn(),
        }}
      >
        <RulesUpdateScreen />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );

const checkbox = () => screen.getByRole("checkbox");
const cta = () => screen.getByRole("button", { name: "Accept and continue" });

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  fetchMock.mockReset();
  mockShow.mockReset();
  setSession.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("RulesUpdateScreen", () => {
  it("shows the updated rules", async () => {
    serve({
      rules: () => json(200, { version: 5, rules: [ruleOf(1), ruleOf(2)] }),
    });
    await renderScreen();

    expect(screen.getByText("Rules updated")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "School rules" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "We updated the school rules. Read and accept them to keep using the app.",
      ),
    ).toBeOnTheScreen();
    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    expect(screen.getByText("Title 2")).toBeOnTheScreen();
    expect(screen.getByText("01")).toBeOnTheScreen();
    expect(screen.getByText("02")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "I have read and accept the rules and terms of Rocha's Surf School.",
      ),
    ).toBeOnTheScreen();
    expect(checkbox()).not.toBeChecked();
    expect(cta()).toBeDisabled();
  });

  it("enables the CTA only when ticked", async () => {
    serve({ rules: () => json(200, { version: 5, rules: [ruleOf(1)] }) });
    const press = userEvent.setup();
    await renderScreen();
    await screen.findByText("Title 1");

    await press.press(checkbox());

    expect(checkbox()).toBeChecked();
    expect(cta()).toBeEnabled();

    await press.press(checkbox());

    expect(cta()).toBeDisabled();
  });

  it("accepts the version it shows, even an empty list", async () => {
    serve({
      rules: () => json(200, { version: 6, rules: [] }),
      accept: () => json(200, { ...user, rulesAccepted: true }),
    });
    const press = userEvent.setup();
    await renderScreen();

    expect(
      await screen.findByText("The school has no rules yet."),
    ).toBeOnTheScreen();

    await press.press(checkbox());
    await press.press(cta());

    await waitFor(() => expect(setSession).toHaveBeenCalled());
    expect(acceptCalls()[0][1].body).toBe(JSON.stringify({ version: 6 }));
  });

  it("retries a failed load", async () => {
    let attempts = 0;
    serve({
      rules: () => {
        attempts += 1;

        return attempts === 1
          ? json(500, {})
          : json(200, { version: 5, rules: [ruleOf(1)] });
      },
    });
    const press = userEvent.setup();
    await renderScreen();

    expect(
      await screen.findByText("Couldn't load the rules."),
    ).toBeOnTheScreen();
    expect(checkbox()).toBeDisabled();
    expect(cta()).toBeDisabled();

    await press.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
  });

  it("outdated: unticks, reloads the rules and shows the toast", async () => {
    let version = 5;
    serve({
      rules: () => json(200, { version, rules: [ruleOf(version)] }),
      accept: () => {
        version = 6;

        return json(409, {
          errors: ["schoolRules.version.outdated"],
          details: { currentVersion: 6 },
        });
      },
    });
    const press = userEvent.setup();
    await renderScreen();
    await screen.findByText("Title 5");
    await press.press(checkbox());

    await press.press(cta());

    expect(await screen.findByText("Title 6")).toBeOnTheScreen();
    expect(mockShow).toHaveBeenCalledWith(
      "The rules changed. Read them again and accept.",
    );
    expect(checkbox()).not.toBeChecked();
    expect(setSession).not.toHaveBeenCalled();
  });

  it("has no way back: no back or sign-out button", async () => {
    serve({ rules: () => json(200, { version: 5, rules: [ruleOf(1)] }) });
    await renderScreen();
    await screen.findByText("Title 1");

    expect(screen.queryByLabelText(/back|voltar|volver/i)).toBeNull();
    expect(screen.queryByText(/sign out|sair|salir|cerrar sesión/i)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it.each([
    [
      "pt-BR",
      "Regras atualizadas",
      "Regras da escola",
      "Atualizamos as regras da escola. Leia e aceite para continuar usando o app.",
      "Li e aceito as regras e os termos da Rocha's Surf School.",
      "Aceitar e continuar",
    ],
    [
      "es-ES",
      "Normas actualizadas",
      "Normas de la escuela",
      "Actualizamos las normas de la escuela. Léelas y acéptalas para seguir usando la app.",
      "He leído y acepto las normas y los términos de Rocha's Surf School.",
      "Aceptar y continuar",
    ],
    [
      "en-US",
      "Rules updated",
      "School rules",
      "We updated the school rules. Read and accept them to keep using the app.",
      "I have read and accept the rules and terms of Rocha's Surf School.",
      "Accept and continue",
    ],
  ])(
    "shows the copy in %s",
    async (locale, eyebrow, title, description, accept, submit) => {
      await i18n.changeLanguage(locale);
      serve({ rules: () => json(200, { version: 5, rules: [ruleOf(1)] }) });
      await renderScreen();

      expect(screen.getByText(eyebrow)).toBeOnTheScreen();
      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
      expect(screen.getByText(description)).toBeOnTheScreen();
      expect(screen.getByText(accept)).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: submit })).toBeOnTheScreen();
      // The rules' text is the same in every language.
      expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    },
  );
});

describe("RulesUpdateScreen on its route", () => {
  let initialUser: SessionUser;

  function TestSessionProvider({ children }: { children: ReactNode }) {
    const [session, setSessionState] = useState<{
      user: SessionUser;
      tokens: typeof tokens;
    } | null>({ user: initialUser, tokens });

    return (
      <SessionContext.Provider
        value={{
          user: session?.user ?? null,
          tokens: session?.tokens ?? null,
          setSession: setSessionState,
          clearSession: () => setSessionState(null),
          isRestoring: false,
          updateUser: jest.fn(),
        }}
      >
        {children}
      </SessionContext.Provider>
    );
  }

  function TestRootLayout() {
    return (
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false, gcTime: Infinity } },
          })
        }
      >
        <TestSessionProvider>
          <RootNavigator />
        </TestSessionProvider>
      </QueryClientProvider>
    );
  }

  const routeTree = {
    _layout: TestRootLayout,
    index: Index,
    "(rules-update)/rules-update/_layout": RulesUpdateLayout,
    "(rules-update)/rules-update/index": RulesUpdateRoute,
    "(private)/student/_layout": StudentLayout,
    "(private)/student/index": StudentRoute,
    "(private)/instructor/_layout": InstructorLayout,
    "(private)/instructor/index": InstructorRoute,
    "(private)/admin/_layout": AdminLayout,
    "(private)/admin/index": AdminRoute,
  };

  it.each([
    { role: "student", path: routes.student.home, name: "Student" },
    { role: "instructor", path: routes.instructor.home, name: "Instructor" },
    { role: "admin", path: routes.admin.home, name: "Admin" },
  ])(
    "opens the role home after accepting ($role)",
    async ({ role, path, name }) => {
      initialUser = { ...user, role };
      serve({
        rules: () => json(200, { version: 5, rules: [ruleOf(1)] }),
        accept: () => json(200, { ...initialUser, rulesAccepted: true }),
      });
      const press = userEvent.setup();
      const app = renderRouter(routeTree, { initialUrl: "/" });
      await app;

      expect(app.getPathname()).toBe(routes.rulesUpdate.home);
      await screen.findByText("Title 1");

      await press.press(checkbox());
      await press.press(cta());

      expect(await screen.findByRole("header", { name })).toBeOnTheScreen();
      expect(app.getPathname()).toBe(path);
      expect(router.canGoBack()).toBe(false);
    },
  );
});

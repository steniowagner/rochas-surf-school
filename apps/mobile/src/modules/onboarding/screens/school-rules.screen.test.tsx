import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";
import { userEvent } from "@testing-library/react-native";
import { ReactNode } from "react";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminRoute from "@/app/(private)/admin/(tabs)/index";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/index";
import StudentLayout from "@/app/(private)/student/_layout";
import StudentRoute from "@/app/(private)/student/(tabs)/index";
import OnboardingLayout from "@/app/(onboarding)/onboarding/_layout";
import OnboardingRoute from "@/app/(onboarding)/onboarding/index";
import SchoolRulesRoute from "@/app/(onboarding)/onboarding/school-rules";
import AuthLayout from "@/app/(public)/auth/_layout";
import AuthRoute from "@/app/(public)/auth/index";
import Index from "@/app/index";
import { routes } from "@/constants/routes";
import { RootNavigator } from "@/navigation/root-navigator/root-navigator.component";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";
import type { SessionTokens } from "@/providers/session/session.types";
import { hydrateSession } from "@/services/session/session.store";

const fetchMock = jest.fn();

const TOKENS: SessionTokens = {
  accessToken: "access-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "refresh-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const accountOf = (role: string, rulesAccepted: boolean): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role,
  status: "approved",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: "+5585999998888",
  whatsappVisible: false,
  rulesAccepted,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
});

function TestSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
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
      <AlertMessageProvider>
        <TestSessionProvider>
          <RootNavigator />
        </TestSessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>
  );
}

const routeTree = {
  _layout: TestRootLayout,
  index: Index,
  "(public)/auth/_layout": AuthLayout,
  "(public)/auth/index": AuthRoute,
  "(onboarding)/onboarding/_layout": OnboardingLayout,
  "(onboarding)/onboarding/index": OnboardingRoute,
  "(onboarding)/onboarding/school-rules": SchoolRulesRoute,
  "(private)/student/_layout": StudentLayout,
  "(private)/student/(tabs)/index": StudentRoute,
  "(private)/instructor/_layout": InstructorLayout,
  "(private)/instructor/(tabs)/index": InstructorRoute,
  "(private)/admin/_layout": AdminLayout,
  "(private)/admin/(tabs)/index": AdminRoute,
};

const json = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("SchoolRulesScreen", () => {
  it.each([
    { role: "student", path: routes.student.home, name: "Schedule" },
    { role: "instructor", path: routes.instructor.home, name: "Dashboard" },
    { role: "admin", path: routes.admin.home, name: "School tools" },
  ])(
    "opens the role home after accepting ($role)",
    async ({ role, path, name }) => {
      hydrateSession({ user: accountOf(role, false), tokens: TOKENS });
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith("/registrations")
          ? json({ items: [] })
          : url.endsWith("/acceptances")
            ? json(accountOf(role, true))
            : json({
                version: 3,
                rules: [
                  { id: "r1", title: "Rule", description: "Text", index: 0 },
                ],
              }),
      );
      const press = userEvent.setup();
      const app = renderRouter(routeTree, { initialUrl: "/" });
      await app;

      expect(app.getPathname()).toBe(routes.onboarding.schoolRules);
      await screen.findByText("Rule");

      await press.press(screen.getByRole("checkbox"));
      await press.press(screen.getByRole("button", { name: "Enter the app" }));

      expect(await screen.findByRole("header", { name })).toBeOnTheScreen();
      expect(app.getPathname()).toBe(path);

      // The onboarding screens left the history with their guard: going back doesn't return to them.
      expect(router.canGoBack()).toBe(false);
    },
  );
});

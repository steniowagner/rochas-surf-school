import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { userEvent } from "@testing-library/react-native";
import { Href, router } from "expo-router";
import { act, renderRouter, screen } from "expo-router/testing-library";
import { createRef, ReactNode, useImperativeHandle } from "react";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminHomeLayout from "@/app/(private)/admin/(tabs)/(home)/_layout";
import AdminRoute from "@/app/(private)/admin/(tabs)/(home)/index";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorHomeLayout from "@/app/(private)/instructor/(tabs)/(home)/_layout";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/(home)/index";
import StudentLayout from "@/app/(private)/student/_layout";
import AgendaLayout from "@/app/(private)/student/(tabs)/(agenda)/_layout";
import StudentRoute from "@/app/(private)/student/(tabs)/(agenda)/index";
import OffboardingLayout from "@/app/(offboarding)/offboarding/_layout";
import DeniedRoute from "@/app/(offboarding)/offboarding/denied";
import RemovedRoute from "@/app/(offboarding)/offboarding/removed";
import PendingLayout from "@/app/(pending)/pending/_layout";
import PendingRoute from "@/app/(pending)/pending/index";
import OnboardingLayout from "@/app/(onboarding)/onboarding/_layout";
import OnboardingRoute from "@/app/(onboarding)/onboarding/index";
import SchoolRulesRoute from "@/app/(onboarding)/onboarding/school-rules";
import AuthLayout from "@/app/(public)/auth/_layout";
import ConfirmCodeRoute from "@/app/(public)/auth/confirm-code";
import CreateAccountRoute from "@/app/(public)/auth/create-account";
import AuthRoute from "@/app/(public)/auth/index";
import RulesUpdateLayout from "@/app/(rules-update)/rules-update/_layout";
import RulesUpdateRoute from "@/app/(rules-update)/rules-update/index";
import ReactivationLayout from "@/app/(reactivation)/reactivation/_layout";
import ReactivationRoute from "@/app/(reactivation)/reactivation/index";
import Index from "@/app/index";
import { routes } from "@/constants/routes";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider, useSession } from "@/providers/session";
import type {
  SessionContextValue,
  SessionTokens,
} from "@/providers/session/session.types";
import { hydrateSession } from "@/services/session/session.store";

import { RootNavigator } from "./root-navigator.component";

// The test seeds the real session store and changes it through `session.current`.
const TOKENS: SessionTokens = {
  accessToken: "access-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "refresh-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};
const session = createRef<SessionContextValue>();

// Exposes the real session (the store behind SessionProvider) to the tests through `session.current`.
function SessionHandle() {
  const value = useSession();

  useImperativeHandle(session, () => value);

  return null;
}

function TestSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionHandle />
      {children}
    </SessionProvider>
  );
}

// The app's root layout without the fonts and splash screen: the providers the routes need and the navigator.
function TestRootLayout() {
  return (
    <QueryClientProvider client={new QueryClient()}>
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
  "(public)/auth/create-account": CreateAccountRoute,
  "(public)/auth/confirm-code": ConfirmCodeRoute,
  "(pending)/pending/_layout": PendingLayout,
  "(pending)/pending/index": PendingRoute,
  "(onboarding)/onboarding/_layout": OnboardingLayout,
  "(onboarding)/onboarding/index": OnboardingRoute,
  "(onboarding)/onboarding/school-rules": SchoolRulesRoute,
  "(rules-update)/rules-update/_layout": RulesUpdateLayout,
  "(rules-update)/rules-update/index": RulesUpdateRoute,
  "(reactivation)/reactivation/_layout": ReactivationLayout,
  "(reactivation)/reactivation/index": ReactivationRoute,
  "(offboarding)/offboarding/_layout": OffboardingLayout,
  "(offboarding)/offboarding/denied": DeniedRoute,
  "(offboarding)/offboarding/removed": RemovedRoute,
  "(private)/student/_layout": StudentLayout,
  "(private)/student/(tabs)/(agenda)/_layout": AgendaLayout,
  "(private)/student/(tabs)/(agenda)/index": StudentRoute,
  "(private)/instructor/_layout": InstructorLayout,
  "(private)/instructor/(tabs)/(home)/_layout": InstructorHomeLayout,
  "(private)/instructor/(tabs)/(home)/index": InstructorRoute,
  "(private)/admin/_layout": AdminLayout,
  "(private)/admin/(tabs)/(home)/_layout": AdminHomeLayout,
  "(private)/admin/(tabs)/(home)/index": AdminRoute,
};

const account = (
  status: string,
  role = "student",
  whatsappNumber: string | null = null,
  rulesAccepted = false,
  rulesAcceptedBefore = false,
): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role,
  status,
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber,
  whatsappVisible: false,
  rulesAccepted,
  rulesAcceptedBefore,
  denialReason: null,
  reactivationStatus: null,
});

// An approved account that finished onboarding: it has a WhatsApp number and accepted the rules.
const onboardedAccount = (role: string): SessionUser =>
  account("approved", role, "+5585999998888", true);

// RNTL 14's render is async, so renderRouter returns a promise; its route helpers (getPathname…) sit on that promise.
let app: ReturnType<typeof renderRouter>;

const openApp = async (user: SessionUser | null, initialUrl = "/") => {
  if (user) {
    hydrateSession({ user, tokens: TOKENS });
  }

  app = renderRouter(routeTree, { initialUrl });
  await app;
};

const navigate = async (path: Href) => {
  await act(async () => router.navigate(path));
};

const expectSignIn = () => {
  expect(app.getPathname()).toBe(routes.auth.signIn);
  expect(screen.getByText("Continue with email")).toBeOnTheScreen();
};

const expectFlowScreen = (path: string, name: string) => {
  expect(app.getPathname()).toBe(path);
  expect(screen.getByRole("header", { name })).toBeOnTheScreen();
};

const CREATE_ACCOUNT_PATH = "/auth/create-account";

const FLOW_PATHS = [
  routes.pending.home,
  routes.onboarding.whatsapp,
  routes.rulesUpdate.home,
  routes.reactivation.home,
  routes.offboarding.denied,
  routes.offboarding.removed,
  routes.student.home,
  routes.instructor.home,
  routes.admin.home,
];

describe("RootNavigator", () => {
  describe("onboarding steps", () => {
    it.each(["student", "instructor", "admin"])(
      "approved without a number opens the WhatsApp step for a %s",
      async (role) => {
        await openApp(account("approved", role));

        expect(app.getPathname()).toBe(routes.onboarding.whatsapp);
      },
    );

    it.each(["student", "instructor", "admin"])(
      "approved with a number opens school rules for a %s",
      async (role) => {
        await openApp(account("approved", role, "+5585999998888"));

        expectFlowScreen(routes.onboarding.schoolRules, "School rules");
      },
    );

    it.each([routes.student.home, routes.instructor.home, routes.admin.home])(
      "keeps an approved account with a number out of %s",
      async (path) => {
        await openApp(account("approved", "student", "+5585999998888"));

        await navigate(path);

        expectFlowScreen(routes.onboarding.schoolRules, "School rules");
      },
    );

    it("moves from the WhatsApp step to school rules once the number is saved", async () => {
      await openApp(account("approved"));

      await act(async () =>
        session.current!.setSession({
          user: account("approved", "student", "+5585999998888"),
          tokens: TOKENS,
        }),
      );
      await navigate(routes.onboarding.schoolRules);

      expectFlowScreen(routes.onboarding.schoolRules, "School rules");
    });

    it("keeps the other flows on their own screens", async () => {
      await openApp(account("pending", "student"));

      expectFlowScreen(routes.pending.home, "Waiting for approval");
    });
  });

  describe("onboarding completed", () => {
    it.each(["student", "instructor", "admin"])(
      "opens school rules for a %s with a number and rulesAccepted false",
      async (role) => {
        await openApp(account("approved", role, "+5585999998888", false));

        expectFlowScreen(routes.onboarding.schoolRules, "School rules");
      },
    );

    it.each([
      { role: "student", path: routes.student.home, name: "Ana" },
      { role: "instructor", path: routes.instructor.home, name: "Dashboard" },
      { role: "admin", path: routes.admin.home, name: "School tools" },
    ])(
      "opens the $role home with a number and rulesAccepted true",
      async ({ role, path, name }) => {
        await openApp(onboardedAccount(role));

        expectFlowScreen(path, name);
      },
    );

    it.each([true, false])(
      "opens the WhatsApp step without a number whatever rulesAccepted is (%s)",
      async (rulesAccepted) => {
        await openApp(account("approved", "student", null, rulesAccepted));

        expect(app.getPathname()).toBe(routes.onboarding.whatsapp);
      },
    );
  });

  describe("rules update", () => {
    const updatedAccount = (role: string) =>
      account("approved", role, "+5585999998888", false, true);

    const serveRules = (role: string) =>
      (globalThis.fetch = jest.fn().mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          url.endsWith("/registrations")
            ? { items: [] }
            : url.endsWith("/classes/teaching")
              ? { items: [], teachesAny: false }
              : url.endsWith("/acceptances")
                ? { ...updatedAccount(role), rulesAccepted: true }
                : {
                    version: 5,
                    rules: [
                      { id: "r1", title: "Rule", description: "Text", index: 0 },
                    ],
                  },
      })));

    beforeEach(() => {
      process.env.EXPO_PUBLIC_API_URL = "http://api.test";
    });

    it.each(["student", "instructor", "admin"])(
      "opens rules update for a %s that accepted before and missed a change",
      async (role) => {
        serveRules(role);
        await openApp(updatedAccount(role));

        expectFlowScreen(routes.rulesUpdate.home, "School rules");
        expect(screen.getByText("Rules updated")).toBeOnTheScreen();
      },
    );

    it.each([
      routes.student.home,
      routes.instructor.home,
      routes.admin.home,
      routes.onboarding.whatsapp,
      routes.onboarding.schoolRules,
      routes.auth.signIn,
      routes.pending.home,
    ])("keeps the account on rules update for %s", async (path) => {
      serveRules("student");
      await openApp(updatedAccount("student"));

      await navigate(path);

      expectFlowScreen(routes.rulesUpdate.home, "School rules");
      expect(screen.getByText("Rules updated")).toBeOnTheScreen();
    });

    it.each([
      { role: "student", path: routes.student.home, name: "Ana" },
      { role: "instructor", path: routes.instructor.home, name: "Dashboard" },
      { role: "admin", path: routes.admin.home, name: "School tools" },
    ])(
      "opens the $role home after accepting, with no way back",
      async ({ role, path, name }) => {
        serveRules(role);
        const user = userEvent.setup();
        await openApp(updatedAccount(role));
        await screen.findByText("Rule");

        await user.press(screen.getByRole("checkbox"));
        await user.press(
          screen.getByRole("button", { name: "Accept and continue" }),
        );

        expect(await screen.findByRole("header", { name })).toBeOnTheScreen();
        expect(app.getPathname()).toBe(path);
        expect(router.canGoBack()).toBe(false);
      },
    );

    it("opens the onboarding step, not the update, for a first acceptance", async () => {
      await openApp(account("approved", "student", "+5585999998888", false));

      expectFlowScreen(routes.onboarding.schoolRules, "School rules");
      expect(screen.getByText("Last step")).toBeOnTheScreen();
    });

    it("opens the WhatsApp step without a number even after an earlier acceptance", async () => {
      await openApp(account("approved", "student", null, false, true));

      expect(app.getPathname()).toBe(routes.onboarding.whatsapp);
    });
  });

  describe("signed out", () => {
    it("opens on sign-in when signed out", async () => {
      await openApp(null);

      expectSignIn();
    });

    it.each(FLOW_PATHS)(
      "redirects %s to sign-in when signed out",
      async (path) => {
        await openApp(null, path);

        expectSignIn();
      },
    );

    it.each(FLOW_PATHS)(
      "redirects %s to sign-in when signed out and navigating",
      async (path) => {
        await openApp(null);

        await navigate(path);

        expectSignIn();
      },
    );

    it("keeps Create account and Confirm email reachable", async () => {
      await openApp(null);

      await navigate(routes.auth.createAccount());
      expect(app.getPathname()).toBe(CREATE_ACCOUNT_PATH);
      expect(
        screen.getByRole("header", { name: "Create account" }),
      ).toBeOnTheScreen();

      await act(async () =>
        router.push(
          routes.auth.confirmCode({
            email: "ana.silva@gmail.com",
            name: "Ana Silva",
          }),
        ),
      );
      expect(app.getPathname()).toBe("/auth/confirm-code");
      expect(
        screen.getByRole("header", { name: "Confirm your email" }),
      ).toBeOnTheScreen();
    });
  });

  describe("signed in", () => {
    it.each([
      {
        state: "pending",
        user: account("pending"),
        path: routes.pending.home,
        name: "Waiting for approval",
      },
      {
        state: "deleted",
        user: account("deleted"),
        path: routes.reactivation.home,
        name: "This account is no longer active",
      },
      {
        state: "denied",
        user: account("denied"),
        path: routes.offboarding.denied,
        name: "Not this time",
      },
      {
        state: "removed",
        user: account("removed"),
        path: routes.offboarding.removed,
        name: "You no longer have access to the app",
      },
      {
        state: "approved student",
        user: onboardedAccount("student"),
        path: routes.student.home,
        name: "Ana",
      },
      {
        state: "approved instructor",
        user: onboardedAccount("instructor"),
        path: routes.instructor.home,
        name: "Dashboard",
      },
      {
        state: "approved admin",
        user: onboardedAccount("admin"),
        path: routes.admin.home,
        name: "School tools",
      },
    ])(
      "opens $name on $path for a $state account",
      async ({ user, path, name }) => {
        await openApp(user);

        expectFlowScreen(path, name);
      },
    );

    it("opens pending after a pending account signs in", async () => {
      await openApp(
        null,
        "/auth/confirm-code?email=ana.silva%40gmail.com&name=Ana%20Silva",
      );
      expect(
        screen.getByRole("header", { name: "Confirm your email" }),
      ).toBeOnTheScreen();

      await act(async () =>
        session.current!.setSession({
          user: account("pending"),
          tokens: TOKENS,
        }),
      );

      expectFlowScreen(routes.pending.home, "Waiting for approval");
    });

    it.each([
      routes.auth.signIn,
      routes.auth.createAccount(),
      routes.onboarding.whatsapp,
      routes.student.home,
      routes.instructor.home,
      routes.admin.home,
      routes.reactivation.home,
      routes.offboarding.denied,
      routes.offboarding.removed,
    ])("keeps a pending account on pending for %s", async (path) => {
      await openApp(account("pending"));

      await navigate(path);

      expectFlowScreen(routes.pending.home, "Waiting for approval");
    });

    it("returns to sign-in after signing out from pending", async () => {
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => ({}),
      });
      process.env.EXPO_PUBLIC_API_URL = "http://api.test";
      const user = userEvent.setup();
      await openApp(account("pending"));

      await user.press(screen.getByRole("button", { name: "Sign out" }));

      expectSignIn();

      await navigate(routes.pending.home);

      expectSignIn();
    });

    it.each([
      routes.pending.home,
      routes.admin.home,
      routes.instructor.home,
      routes.onboarding.whatsapp,
      routes.reactivation.home,
      routes.offboarding.denied,
      routes.offboarding.removed,
      routes.auth.signIn,
    ])("keeps a student on student for %s", async (path) => {
      await openApp(onboardedAccount("student"));

      await navigate(path);

      expectFlowScreen(routes.student.home, "Ana");
    });

    it("can't go back to auth after signing in", async () => {
      await openApp(null);
      await navigate(routes.auth.createAccount());
      await act(async () =>
        router.push(
          routes.auth.confirmCode({
            email: "ana.silva@gmail.com",
            name: "Ana Silva",
          }),
        ),
      );

      await act(async () =>
        session.current!.setSession({
          user: onboardedAccount("student"),
          tokens: TOKENS,
        }),
      );
      expectFlowScreen(routes.student.home, "Ana");

      // The auth screens left the history with their guard, so there is nothing to go back to.
      expect(router.canGoBack()).toBe(false);
    });

    it.each([
      {
        state: "denied",
        other: routes.offboarding.removed,
        path: routes.offboarding.denied,
        name: "Not this time",
      },
      {
        state: "removed",
        other: routes.offboarding.denied,
        path: routes.offboarding.removed,
        name: "You no longer have access to the app",
      },
    ])(
      "keeps denied and removed on their own screen ($state)",
      async ({ state, other, path, name }) => {
        await openApp(account(state));

        await navigate(other);

        expectFlowScreen(path, name);
      },
    );

    it.each([
      account("pending"),
      account("deleted"),
      account("denied"),
      account("removed"),
      onboardedAccount("student"),
      onboardedAccount("instructor"),
      onboardedAccount("admin"),
    ])(
      "returns to sign-in when the session is cleared ($status $role)",
      async (user) => {
        await openApp(user);

        await act(async () => session.current!.clearSession());

        expectSignIn();
      },
    );
  });
});

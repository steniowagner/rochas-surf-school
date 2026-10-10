import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { userEvent } from "@testing-library/react-native";
import { Href, router } from "expo-router";
import { act, renderRouter, screen } from "expo-router/testing-library";
import { createRef, ReactNode, useImperativeHandle, useState } from "react";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminRoute from "@/app/(private)/admin/index";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorRoute from "@/app/(private)/instructor/index";
import StudentLayout from "@/app/(private)/student/_layout";
import StudentRoute from "@/app/(private)/student/index";
import OffboardingLayout from "@/app/(offboarding)/offboarding/_layout";
import DeniedRoute from "@/app/(offboarding)/offboarding/denied";
import RemovedRoute from "@/app/(offboarding)/offboarding/removed";
import PendingLayout from "@/app/(pending)/pending/_layout";
import PendingRoute from "@/app/(pending)/pending/index";
import OnboardingLayout from "@/app/(onboarding)/onboarding/_layout";
import OnboardingRoute from "@/app/(onboarding)/onboarding/index";
import AuthLayout from "@/app/(public)/auth/_layout";
import ConfirmCodeRoute from "@/app/(public)/auth/confirm-code";
import CreateAccountRoute from "@/app/(public)/auth/create-account";
import AuthRoute from "@/app/(public)/auth/index";
import ReactivationLayout from "@/app/(reactivation)/reactivation/_layout";
import ReactivationRoute from "@/app/(reactivation)/reactivation/index";
import Index from "@/app/index";
import { routes } from "@/constants/routes";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionContext } from "@/providers/session/session.context";
import type {
  Session,
  SessionContextValue,
  SessionTokens,
} from "@/providers/session/session.types";

import { RootNavigator } from "./root-navigator.component";

// The test owns the session: it starts with `initialUser` and is changed through `session.current`.
let initialUser: SessionUser | null = null;
const TOKENS: SessionTokens = {
  accessToken: "access-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "refresh-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};
const session = createRef<SessionContextValue>();

function TestSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(initialUser);
  const [tokens, setTokens] = useState<SessionTokens | null>(
    initialUser ? TOKENS : null,
  );
  const value = {
    user,
    tokens,
    setSession: (next: Session) => {
      setUser(next.user);
      setTokens(next.tokens);
    },
    clearSession: () => {
      setUser(null);
      setTokens(null);
    },
  };

  useImperativeHandle(session, () => value);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
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
  "(reactivation)/reactivation/_layout": ReactivationLayout,
  "(reactivation)/reactivation/index": ReactivationRoute,
  "(offboarding)/offboarding/_layout": OffboardingLayout,
  "(offboarding)/offboarding/denied": DeniedRoute,
  "(offboarding)/offboarding/removed": RemovedRoute,
  "(private)/student/_layout": StudentLayout,
  "(private)/student/index": StudentRoute,
  "(private)/instructor/_layout": InstructorLayout,
  "(private)/instructor/index": InstructorRoute,
  "(private)/admin/_layout": AdminLayout,
  "(private)/admin/index": AdminRoute,
};

const account = (status: string, role = "student"): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role,
  status,
  createdAt: "2026-10-10T12:00:00.000Z",
});

// RNTL 14's render is async, so renderRouter returns a promise; its route helpers (getPathname…) sit on that promise.
let app: ReturnType<typeof renderRouter>;

const openApp = async (user: SessionUser | null, initialUrl = "/") => {
  initialUser = user;
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

const FLOW_PATHS = [
  routes.pending.home,
  routes.onboarding.home,
  routes.reactivation.home,
  routes.offboarding.denied,
  routes.offboarding.removed,
  routes.student.home,
  routes.instructor.home,
  routes.admin.home,
];

describe("RootNavigator", () => {
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

      await navigate(routes.auth.createAccount);
      expect(app.getPathname()).toBe(routes.auth.createAccount);
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
        name: "Reactivation",
      },
      {
        state: "denied",
        user: account("denied"),
        path: routes.offboarding.denied,
        name: "Registration denied",
      },
      {
        state: "removed",
        user: account("removed"),
        path: routes.offboarding.removed,
        name: "Access removed",
      },
      {
        state: "approved student",
        user: account("approved", "student"),
        path: routes.student.home,
        name: "Student",
      },
      {
        state: "approved instructor",
        user: account("approved", "instructor"),
        path: routes.instructor.home,
        name: "Instructor",
      },
      {
        state: "approved admin",
        user: account("approved", "admin"),
        path: routes.admin.home,
        name: "Admin",
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
      routes.auth.createAccount,
      routes.onboarding.home,
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
      routes.onboarding.home,
      routes.reactivation.home,
      routes.offboarding.denied,
      routes.offboarding.removed,
      routes.auth.signIn,
    ])("keeps a student on student for %s", async (path) => {
      await openApp(account("approved", "student"));

      await navigate(path);

      expectFlowScreen(routes.student.home, "Student");
    });

    it("can't go back to auth after signing in", async () => {
      await openApp(null);
      await navigate(routes.auth.createAccount);
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
          user: account("approved", "student"),
          tokens: TOKENS,
        }),
      );
      expectFlowScreen(routes.student.home, "Student");

      // The auth screens left the history with their guard, so there is nothing to go back to.
      expect(router.canGoBack()).toBe(false);
    });

    it.each([
      {
        state: "denied",
        other: routes.offboarding.removed,
        path: routes.offboarding.denied,
        name: "Registration denied",
      },
      {
        state: "removed",
        other: routes.offboarding.denied,
        path: routes.offboarding.removed,
        name: "Access removed",
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
      account("approved", "student"),
      account("approved", "instructor"),
      account("approved", "admin"),
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

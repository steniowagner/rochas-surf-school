import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { act, renderRouter, screen, waitFor } from "expo-router/testing-library";
import { ReactNode } from "react";

import OffboardingLayout from "@/app/(offboarding)/offboarding/_layout";
import DeniedRoute from "@/app/(offboarding)/offboarding/denied";
import OnboardingLayout from "@/app/(onboarding)/onboarding/_layout";
import OnboardingRoute from "@/app/(onboarding)/onboarding/index";
import PendingLayout from "@/app/(pending)/pending/_layout";
import PendingRoute from "@/app/(pending)/pending/index";
import AuthLayout from "@/app/(public)/auth/_layout";
import AuthRoute from "@/app/(public)/auth/index";
import Index from "@/app/index";
import { routes } from "@/constants/routes";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { RootNavigator } from "@/navigation/root-navigator";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";
import { getSession, hydrateSession } from "@/services/session/session.store";

const TOKENS = {
  accessToken: "access-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "refresh-1",
  refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
};

const queryClient = new QueryClient();
const invalidate = jest.spyOn(queryClient, "invalidateQueries");

function TestRootLayout(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <AlertMessageProvider>
        <SessionProvider>
          <RootNavigator />
        </SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>
  );
}

const routeTree = {
  _layout: TestRootLayout,
  index: Index,
  "(public)/auth/_layout": AuthLayout,
  "(public)/auth/index": AuthRoute,
  "(pending)/pending/_layout": PendingLayout,
  "(pending)/pending/index": PendingRoute,
  "(onboarding)/onboarding/_layout": OnboardingLayout,
  "(onboarding)/onboarding/index": OnboardingRoute,
  "(offboarding)/offboarding/_layout": OffboardingLayout,
  "(offboarding)/offboarding/denied": DeniedRoute,
};

const account = (status: string, role = "student"): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role,
  status,
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: status === "denied" ? "Sorry" : null,
  reactivationStatus: null,
});

const push = (type: string | undefined) =>
  ({
    request: { identifier: "r1", content: { data: { type } } },
  }) as unknown as Notifications.Notification;

const fetchMock = jest.fn();
let app: ReturnType<typeof renderRouter>;

const meCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/me"));

const answerMe = (me: SessionUser | Error) => {
  fetchMock.mockImplementation(async () => {
    if (me instanceof Error) {
      throw me;
    }

    return { ok: true, status: 200, json: async () => me };
  });
};

const openApp = async (user: SessionUser | null) => {
  if (user) {
    hydrateSession({ user, tokens: TOKENS });
  }

  app = renderRouter(routeTree, { initialUrl: "/" });
  await app;
  await waitFor(() =>
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled(),
  );
};

const receive = async (notification: Notifications.Notification) => {
  const listener = jest.mocked(Notifications.addNotificationReceivedListener)
    .mock.calls.at(-1)![0];

  await act(async () => listener(notification));
};

describe("useNotificationReceived", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
    invalidate.mockClear();
    jest.mocked(Notifications.addNotificationReceivedListener).mockClear();
  });

  it("moves a pending person to onboarding when the approval arrives", async () => {
    answerMe(account("approved"));
    await openApp(account("pending"));
    expect(app.getPathname()).toBe(routes.pending.home);

    await receive(push("registration.approved"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.onboarding.whatsapp));
    expect(getSession()?.user.status).toBe("approved");
  });

  it("moves a pending person to the Denied screen when the denial arrives", async () => {
    answerMe(account("denied"));
    await openApp(account("pending"));

    await receive(push("registration.denied"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.offboarding.denied));
  });

  it("refetches the registrations when a new one arrives, without touching the account", async () => {
    answerMe(account("approved", "admin"));
    await openApp(account("approved", "admin"));

    await receive(push("registration.pending"));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["registrations"] });
    expect(meCalls()).toHaveLength(0);
  });

  it("reloads the weeks when a class assignment arrives", async () => {
    answerMe(account("approved", "instructor"));
    await openApp(account("approved", "instructor"));

    await receive(push("class.assigned"));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["classes", "week"] });
    expect(meCalls()).toHaveLength(0);
  });

  it.each([
    "class.edited",
    "class.unassigned",
    "class.cancelled",
    "class.deleted",
    "class.noInstructor",
    "enrolment.requested",
    "enrolment.expired",
  ])(
    "reloads every cached class when a %s push arrives",
    async (type) => {
      answerMe(account("approved", "instructor"));
      await openApp(account("approved", "instructor"));

      await receive(push(type));

      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["classes"] });
      expect(meCalls()).toHaveLength(0);
    },
  );

  it("reloads the classes and the locations when a location.changed push arrives, without navigating", async () => {
    answerMe(account("approved", "instructor"));
    await openApp(account("approved", "instructor"));
    const pathname = app.getPathname();

    await receive(push("location.changed"));

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["classes"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["locations"] });
    expect(app.getPathname()).toBe(pathname);
    expect(meCalls()).toHaveLength(0);
  });

  it.each([undefined, "something.else"])(
    "shows nothing more for the type %s",
    async (type) => {
      answerMe(account("approved"));
      await openApp(account("pending"));

      await receive(push(type));

      expect(invalidate).not.toHaveBeenCalled();
      expect(meCalls()).toHaveLength(0);
      expect(app.getPathname()).toBe(routes.pending.home);
    },
  );

  it("keeps the screen as it was when the refresh fails", async () => {
    answerMe(new TypeError("offline"));
    await openApp(account("pending"));

    await receive(push("registration.approved"));

    expect(meCalls()).toHaveLength(1);
    expect(app.getPathname()).toBe(routes.pending.home);
    expect(getSession()?.user.status).toBe("pending");
  });

  it("does not refresh without a session", async () => {
    answerMe(account("approved"));
    await openApp(null);

    await receive(push("registration.approved"));

    expect(meCalls()).toHaveLength(0);
  });

  it("ignores an expired session while refreshing", async () => {
    answerMe(account("pending"));
    await openApp(account("pending"));
    fetchMock.mockReset().mockImplementation(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ errors: ["auth.token.invalid"] }),
    }));

    await receive(push("registration.approved"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.auth.signIn));
  });

  it("stops listening when the app unmounts", async () => {
    answerMe(account("pending"));
    await openApp(account("pending"));
    const subscriptions = jest
      .mocked(Notifications.addNotificationReceivedListener)
      .mock.results.map((result) => result.value as { remove: jest.Mock });

    await act(async () => screen.unmount());

    expect(subscriptions.every((item) => item.remove.mock.calls.length > 0)).toBe(true);
  });
});

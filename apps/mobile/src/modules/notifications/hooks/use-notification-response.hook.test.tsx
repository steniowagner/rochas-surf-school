import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { act, renderRouter, waitFor } from "expo-router/testing-library";
import { ReactNode } from "react";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminHomeLayout from "@/app/(private)/admin/(tabs)/(home)/_layout";
import AdminRoute from "@/app/(private)/admin/(tabs)/(home)/index";
import AdminClassesRoute from "@/app/(private)/admin/(tabs)/classes";
import AdminClassRequestsRoute from "@/app/(private)/admin/class-requests";
import AdminRegistrationsRoute from "@/app/(private)/admin/registrations";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorClassesRoute from "@/app/(private)/instructor/(tabs)/classes";
import InstructorHomeLayout from "@/app/(private)/instructor/(tabs)/(home)/_layout";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/(home)/index";
import StudentLayout from "@/app/(private)/student/_layout";
import AgendaLayout from "@/app/(private)/student/(tabs)/(agenda)/_layout";
import StudentRoute from "@/app/(private)/student/(tabs)/(agenda)/index";
import OffboardingLayout from "@/app/(offboarding)/offboarding/_layout";
import DeniedRoute from "@/app/(offboarding)/offboarding/denied";
import PendingLayout from "@/app/(pending)/pending/_layout";
import PendingRoute from "@/app/(pending)/pending/index";
import OnboardingLayout from "@/app/(onboarding)/onboarding/_layout";
import OnboardingRoute from "@/app/(onboarding)/onboarding/index";
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

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AlertMessageProvider>
        <SessionProvider>{children}</SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>
  );
}

function TestRootLayout() {
  return (
    <Providers>
      <RootNavigator />
    </Providers>
  );
}

const ClassStub = () => null;

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
  "(private)/student/_layout": StudentLayout,
  "(private)/student/(tabs)/(agenda)/_layout": AgendaLayout,
  "(private)/student/(tabs)/(agenda)/index": StudentRoute,
  "(private)/student/class/[id]": ClassStub,
  "(private)/admin/_layout": AdminLayout,
  "(private)/admin/(tabs)/(home)/_layout": AdminHomeLayout,
  "(private)/admin/(tabs)/(home)/index": AdminRoute,
  "(private)/admin/registrations": AdminRegistrationsRoute,
  "(private)/admin/class-requests": AdminClassRequestsRoute,
  "(private)/admin/(tabs)/classes": AdminClassesRoute,
  "(private)/instructor/_layout": InstructorLayout,
  "(private)/instructor/(tabs)/(home)/_layout": InstructorHomeLayout,
  "(private)/instructor/(tabs)/(home)/index": InstructorRoute,
  "(private)/instructor/(tabs)/classes": InstructorClassesRoute,
  "(private)/instructor/class/[id]": ClassStub,
  "(private)/admin/class/[id]": ClassStub,
};

const account = (
  status: string,
  role = "student",
  onboarded = false,
): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role,
  status,
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: onboarded ? "+5585999998888" : null,
  whatsappVisible: false,
  rulesAccepted: onboarded,
  rulesAcceptedBefore: false,
  denialReason: status === "denied" ? "Sorry" : null,
  reactivationStatus: null,
});

const response = (type: string | undefined, id = "n1", classId?: string) =>
  ({
    notification: {
      request: {
        identifier: `request-${id}`,
        content: { data: { type, notificationId: id, classId } },
      },
    },
  }) as unknown as Notifications.NotificationResponse;

const fetchMock = jest.fn();
let app: ReturnType<typeof renderRouter>;

/** `GET /auth/me` answers `me`; every other call (the admin's list) answers an empty list. */
const answerMe = (me: SessionUser | Error) => {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith("/auth/me")) {
      if (me instanceof Error) {
        throw me;
      }

      return { ok: true, status: 200, json: async () => me };
    }

    return { ok: true, status: 200, json: async () => ({ items: [] }) };
  });
};

const meCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/me"));

const openApp = async (user: SessionUser | null) => {
  if (user) {
    hydrateSession({ user, tokens: TOKENS });
  }

  app = renderRouter(routeTree, { initialUrl: "/" });
  await app;
  await waitFor(() =>
    expect(
      Notifications.addNotificationResponseReceivedListener,
    ).toHaveBeenCalled(),
  );
};

const tap = async (pushResponse: Notifications.NotificationResponse) => {
  const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener)
    .mock.calls.at(-1)![0];

  await act(async () => listener(pushResponse));
};

describe("useNotificationResponse", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
    jest.mocked(Notifications.getLastNotificationResponse).mockReset().mockReturnValue(null);
    jest.mocked(Notifications.addNotificationResponseReceivedListener).mockClear();
  });

  it("opens Join the school when an admin taps a new-registration push", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));
    expect(app.getPathname()).toBe(routes.admin.home);

    await tap(response("registration.pending"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.registrations));
    expect(meCalls()).toHaveLength(1);
  });

  it("opens the Aulas tab for a class assignment", async () => {
    answerMe(account("approved", "instructor", true));
    await openApp(account("approved", "instructor", true));
    expect(app.getPathname()).toBe(routes.instructor.home);

    await tap(response("class.assigned"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.instructor.classes));
    expect(meCalls()).toHaveLength(1);
  });

  it("opens the admin's Aulas tab for a class assignment", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("class.assigned"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.classes));
  });

  it("opens the Aulas tab of an instructor who taps a class.deleted push, which names no class", async () => {
    answerMe(account("approved", "instructor", true));
    await openApp(account("approved", "instructor", true));
    expect(app.getPathname()).toBe(routes.instructor.home);

    await tap(response("class.deleted"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.instructor.classes));
    expect(meCalls()).toHaveLength(1);
  });

  it("opens the Aulas tab of an instructor who taps a location.changed push", async () => {
    answerMe(account("approved", "instructor", true));
    await openApp(account("approved", "instructor", true));
    expect(app.getPathname()).toBe(routes.instructor.home);

    await tap(response("location.changed"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.instructor.classes));
    expect(meCalls()).toHaveLength(1);
  });

  it("opens the admin's Aulas tab for a location.changed push", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("location.changed"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.classes));
  });

  it("opens the admin's Aulas tab for a class.deleted push", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("class.deleted"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.classes));
  });

  it("goes to the resolved flow when a class.deleted push is tapped by someone who is now a student", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "instructor", true));

    await tap(response("class.deleted"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
  });

  it("goes to the resolved flow when a class assignment is tapped by someone who is now a student", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "instructor", true));

    await tap(response("class.assigned"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
  });

  it.each(["class.edited", "class.unassigned", "class.cancelled"])(
    "opens the class details of an instructor who taps a %s push",
    async (type) => {
      answerMe(account("approved", "instructor", true));
      await openApp(account("approved", "instructor", true));

      await tap(response(type, "n1", "c-1"));

      await waitFor(() => expect(app.getPathname()).toBe("/instructor/class/c-1"));
      expect(meCalls()).toHaveLength(1);
    },
  );

  it.each(["class.edited", "class.unassigned", "class.cancelled"])(
    "opens the class details of an admin who taps a %s push",
    async (type) => {
      answerMe(account("approved", "admin", true));
      await openApp(account("approved", "admin", true));

      await tap(response(type, "n1", "c-1"));

      await waitFor(() => expect(app.getPathname()).toBe("/admin/class/c-1"));
    },
  );

  it("goes to the resolved flow when a class.edited push without a class is tapped by a student", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "student", true));

    await tap(response("class.edited"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
  });

  it.each([
    ["student", "/student/class/c-1"],
    ["instructor", "/instructor/class/c-1"],
    ["admin", "/admin/class/c-1"],
  ])("opens the class details of a %s who taps a class.reminder push", async (role, pathname) => {
    answerMe(account("approved", role, true));
    await openApp(account("approved", role, true));

    await tap(response("class.reminder", "n1", "c-1"));

    await waitFor(() => expect(app.getPathname()).toBe(pathname));
    expect(meCalls()).toHaveLength(1);
  });

  it.each([
    ["student", routes.student.home],
    ["instructor", routes.instructor.home],
    ["admin", routes.admin.home],
  ])("goes to the resolved flow when a %s taps a class.reminder push without a class", async (role, home) => {
    answerMe(account("approved", role, true));
    await openApp(account("approved", role, true));

    const replace = jest.spyOn(router, "replace");

    await tap(response("class.reminder"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(routes.home));
    await waitFor(() => expect(app.getPathname()).toBe(home));
    replace.mockRestore();
  });

  it("opens the Agenda of a student who taps a location.changed push", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "student", true));

    const push = jest.spyOn(router, "push");

    await tap(response("location.changed"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
    expect(push).toHaveBeenCalledWith(routes.student.home);
    expect(meCalls()).toHaveLength(1);
    push.mockRestore();
  });

  it.each([
    "enrolment.expired",
    "enrolment.approved",
    "enrolment.denied",
    "enrolment.enrolled",
    "enrolment.takenOut",
    "class.cancelled",
    "class.edited",
  ])(
    "opens the class details of a student who taps a %s push",
    async (type) => {
      answerMe(account("approved", "student", true));
      await openApp(account("approved", "student", true));

      await tap(response(type, "n1", "c-1"));

      await waitFor(() => expect(app.getPathname()).toBe("/student/class/c-1"));
      expect(meCalls()).toHaveLength(1);
    },
  );

  it("goes to the resolved flow when a class.cancelled push is tapped by someone who is now a student without the class", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "instructor", true));

    await tap(response("class.cancelled"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
  });

  it("opens the class details of an instructor who taps an enrolment.requested push", async () => {
    answerMe(account("approved", "instructor", true));
    await openApp(account("approved", "instructor", true));

    await tap(response("enrolment.requested", "n1", "c-1"));

    await waitFor(() => expect(app.getPathname()).toBe("/instructor/class/c-1"));
  });

  it.each([["c-1"], [undefined]])(
    "opens the class requests tool of an admin who taps an enrolment.requested push (class %s)",
    async (classId) => {
      answerMe(account("approved", "admin", true));
      await openApp(account("approved", "admin", true));

      await tap(response("enrolment.requested", "n1", classId));

      await waitFor(() => expect(app.getPathname()).toBe(routes.admin.classRequests));
    },
  );

  it.each([
    ["instructor", "/instructor/class/c-1"],
    ["admin", "/admin/class/c-1"],
  ] as const)("opens the class details of the %s who taps an enrolment.cancelled push", async (role, path) => {
    answerMe(account("approved", role, true));
    await openApp(account("approved", role, true));

    await tap(response("enrolment.cancelled", "n1", "c-1"));

    await waitFor(() => expect(app.getPathname()).toBe(path));
  });

  it("goes to the resolved flow when an enrolment.cancelled push has no class id", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("enrolment.cancelled"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.home));
  });

  it.each(["enrolment.approved", "enrolment.denied", "enrolment.expired", "enrolment.enrolled", "enrolment.takenOut"])(
    "goes to the resolved flow when a %s push has no class id",
    async (type) => {
      answerMe(account("approved", "admin", true));
      await openApp(account("approved", "admin", true));

      await tap(response(type));

      await waitFor(() => expect(app.getPathname()).toBe(routes.admin.home));
    },
  );

  it("goes to the resolved flow when an enrolment.requested push is tapped by someone who is now a student", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "admin", true));

    await tap(response("enrolment.requested", "n1", "c-1"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
  });

  it("opens the class details of an admin who taps a class.noInstructor push, after refreshing the account", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("class.noInstructor", "n1", "c-1"));

    await waitFor(() => expect(app.getPathname()).toBe("/admin/class/c-1"));
    expect(meCalls()).toHaveLength(1);
  });

  it("goes to the resolved flow when a class.noInstructor push is tapped by someone who is no longer an admin", async () => {
    answerMe(account("approved", "instructor", true));
    await openApp(account("approved", "admin", true));

    await tap(response("class.noInstructor", "n1", "c-1"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.instructor.home));
  });

  it("goes home when a class.noInstructor push has no class id", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("class.noInstructor"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.home));
  });

  it("goes home when a class.cancelled push has no class id", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response("class.cancelled"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.home));
    expect(app.getPathname()).not.toContain("class/");
  });

  it("goes home when a class.unassigned push has no class id", async () => {
    answerMe(account("approved", "instructor", true));
    await openApp(account("approved", "instructor", true));

    await tap(response("class.unassigned"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.instructor.home));
    expect(app.getPathname()).not.toContain("class/");
  });

  it("opens the onboarding WhatsApp step when a pending person taps the approval push", async () => {
    answerMe(account("approved"));
    await openApp(account("pending"));
    expect(app.getPathname()).toBe(routes.pending.home);

    await tap(response("registration.approved"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.onboarding.whatsapp));
    expect(getSession()?.user.status).toBe("approved");
  });

  it("opens the Denied screen when the denial push is tapped", async () => {
    answerMe(account("denied"));
    await openApp(account("pending"));

    await tap(response("registration.denied"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.offboarding.denied));
  });

  it("goes to the resolved flow when the new-registration push is tapped by a non-admin", async () => {
    answerMe(account("approved", "student", true));
    await openApp(account("approved", "student", true));
    await tap(response("registration.pending"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.student.home));
  });

  it("goes to the resolved flow for a push of an unknown type", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));

    await tap(response(undefined));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.home));
  });

  it("navigates with the stored account when the refresh fails offline", async () => {
    answerMe(new TypeError("offline"));
    await openApp(account("approved", "admin", true));

    await tap(response("registration.pending"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.registrations));
    expect(getSession()?.user.status).toBe("approved");
  });

  it("opens sign-in when there is no session, without calling the API", async () => {
    answerMe(account("approved"));
    await openApp(null);

    await tap(response("registration.approved"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.auth.signIn));
    expect(meCalls()).toHaveLength(0);
  });

  it("handles the tap that launched the app once, even when the listener gets it again", async () => {
    answerMe(account("approved", "admin", true));
    jest
      .mocked(Notifications.getLastNotificationResponse)
      .mockReturnValue(response("registration.pending", "launch"));

    await openApp(account("approved", "admin", true));
    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.registrations));
    await tap(response("registration.pending", "launch"));

    expect(meCalls()).toHaveLength(1);
  });

  it("identifies a push without a notification id by its request id", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));
    const withoutId = {
      notification: {
        request: {
          identifier: "request-only",
          content: { data: { type: "registration.pending" } },
        },
      },
    } as unknown as Notifications.NotificationResponse;

    await tap(withoutId);
    await waitFor(() => expect(app.getPathname()).toBe(routes.admin.registrations));
    await tap(withoutId);

    expect(meCalls()).toHaveLength(1);
  });

  it("leaves an expired session to the sign-in guard", async () => {
    answerMe(account("approved", "admin", true));
    await openApp(account("approved", "admin", true));
    fetchMock.mockReset().mockImplementation(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ errors: ["auth.token.invalid"] }),
    }));

    await tap(response("registration.pending"));

    await waitFor(() => expect(app.getPathname()).toBe(routes.auth.signIn));
    expect(getSession()).toBeNull();
  });

  describe("marking the notification read", () => {
    const markCalls = () =>
      fetchMock.mock.calls.filter(([url]) => /\/notifications\/[^/]+\/read$/.test(String(url)));

    it("marks the tapped notification read and opens its class as before", async () => {
      answerMe(account("approved", "student", true));
      await openApp(account("approved", "student", true));

      await tap(response("enrolment.approved", "n-42", "c-1"));

      await waitFor(() => expect(app.getPathname()).toBe("/student/class/c-1"));
      expect(markCalls()).toHaveLength(1);
      expect(markCalls()[0][0]).toBe("http://api.test/notifications/n-42/read");
      expect(markCalls()[0][1]).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer access-1" }),
      });
    });

    it("marks nothing for a push without a notification id", async () => {
      answerMe(account("approved", "admin", true));
      await openApp(account("approved", "admin", true));
      const withoutId = {
        notification: {
          request: {
            identifier: "request-only",
            content: { data: { type: "registration.pending" } },
          },
        },
      } as unknown as Notifications.NotificationResponse;

      await tap(withoutId);

      await waitFor(() => expect(app.getPathname()).toBe(routes.admin.registrations));
      expect(markCalls()).toHaveLength(0);
    });

    it("routes as before when the mark fails", async () => {
      answerMe(account("approved", "student", true));
      const answer = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
        if (String(url).endsWith("/read")) {
          return { ok: false, status: 500, json: async () => ({ errors: ["INTERNAL_SERVER_ERROR"] }) };
        }

        return answer(url, init);
      });
      await openApp(account("approved", "student", true));

      await tap(response("enrolment.approved", "n-42", "c-1"));

      await waitFor(() => expect(app.getPathname()).toBe("/student/class/c-1"));
      expect(markCalls()).toHaveLength(1);
    });

    it("sends one mark when the same response is handled twice", async () => {
      answerMe(account("approved", "student", true));
      await openApp(account("approved", "student", true));

      await tap(response("enrolment.approved", "n-42", "c-1"));
      await waitFor(() => expect(app.getPathname()).toBe("/student/class/c-1"));
      await tap(response("enrolment.approved", "n-42", "c-1"));

      expect(markCalls()).toHaveLength(1);
    });

    it("sends nothing without a session", async () => {
      answerMe(account("approved"));
      await openApp(null);

      await tap(response("registration.approved", "n-42"));

      await waitFor(() => expect(app.getPathname()).toBe(routes.auth.signIn));
      expect(markCalls()).toHaveLength(0);
    });
  });
});

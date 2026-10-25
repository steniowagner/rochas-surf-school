import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { router, Slot } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminHomeLayout from "@/app/(private)/admin/(tabs)/(home)/_layout";
import AdminRoute from "@/app/(private)/admin/(tabs)/(home)/index";
import AdminCancellationRulesRoute from "@/app/(private)/admin/cancellation-rules";
import AdminNewClassRoute from "@/app/(private)/admin/new-class";
import AdminSchoolSettingsRoute from "@/app/(private)/admin/school-settings";
import AdminPeopleRoute from "@/app/(private)/admin/people";
import AdminClassRequestsRoute from "@/app/(private)/admin/class-requests";
import AdminEnrolStudentRoute from "@/app/(private)/admin/enrol-student";
import AdminManageSchoolRulesRoute from "@/app/(private)/admin/manage-school-rules";
import AdminMyClassesRoute from "@/app/(private)/admin/my-classes";
import AdminRegistrationsRoute from "@/app/(private)/admin/registrations";
import AdminWeeklyOccupancyRoute from "@/app/(private)/admin/weekly-occupancy";
import { routes } from "@/constants/routes";
import { buildClassItem } from "@/modules/classes/classes.test-utils";
import { underTransparentHeader } from "@/navigation/stack-header/header-inset.test-utils";
import { SessionProvider } from "@/providers/session";
import { hydrateSession } from "@/services/session/session.store";

const fetchMock = jest.fn();

const SCHOOL_RULES = {
  version: 1,
  rules: Array.from({ length: 6 }, (_, index) => ({
    id: `r-${index + 1}`,
    title: `Rule ${index + 1}`,
    description: `Explanation ${index + 1}`,
    index: index + 1,
  })),
};

// What `GET /classes/teaching` answers: nothing taught unless a test says otherwise; `null` fails.
const NOT_TEACHING = { items: [], teachesAny: false };
const TEACHING = {
  items: [
    buildClassItem("c-1", "2099-10-15T11:00:00.000Z", "2099-10-15T12:00:00.000Z"),
    buildClassItem("c-2", "2099-10-16T11:00:00.000Z", "2099-10-16T12:00:00.000Z", {
      cancelledAt: "2099-10-01T12:00:00.000Z",
    }),
  ],
  teachesAny: true,
};
let teaching: typeof TEACHING | typeof NOT_TEACHING | null = NOT_TEACHING;

// The Rules and My classes rows ask for the school rules and the classes taught on their own: they are answered here,
// so `fetchMock` sees only the home's other requests.
const fetchWithSchoolRules = (url: string, init: RequestInit) =>
  String(url).endsWith("/school-rules")
    ? Promise.resolve({ ok: true, status: 200, json: async () => SCHOOL_RULES })
    : String(url).endsWith("/classes/teaching")
      ? teaching
        ? Promise.resolve({ ok: true, status: 200, json: async () => teaching })
        : Promise.resolve({ ok: false, status: 500, json: async () => ({ errors: [] }) })
      : fetchMock(url, init);

// The bell asks for the unread count on its own: the home's requests are the others.
const homeCalls = () =>
  fetchMock.mock.calls.filter(([url]) => !String(url).endsWith("/notifications/unread-count"));

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

function TestRootLayout({ children }: { children?: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

const person = (id: string) => ({
  id,
  name: `Person ${id}`,
  email: `${id}@example.com`,
  createdAt: "2026-10-12T10:00:00.000Z",
});

const respondWith = (items: ReturnType<typeof person>[]) =>
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items }),
  });

/** Answers the registrations of the home and what the Nova aula screen loads. */
const respondForNewClass = () =>
  fetchMock.mockImplementation(async (url: string) => {
    const path = String(url).replace("http://api.test", "");
    const body = path.startsWith("/people")
      ? { items: [], page: 1, perPage: 50, total: 0 }
      : { items: [] };

    return { ok: true, status: 200, json: async () => body };
  });

async function openAdminHome() {
  const app = renderRouter(
    {
      _layout: () => (
        <TestRootLayout>
          <Slot />
        </TestRootLayout>
      ),
      "(private)/admin/_layout": AdminLayout,
      "(private)/admin/(tabs)/(home)/_layout": AdminHomeLayout,
      "(private)/admin/(tabs)/(home)/index": AdminRoute,
      "(private)/admin/cancellation-rules": AdminCancellationRulesRoute,
      "(private)/admin/new-class": AdminNewClassRoute,
      "(private)/admin/people": AdminPeopleRoute,
      "(private)/admin/school-settings": AdminSchoolSettingsRoute,
      "(private)/admin/registrations": AdminRegistrationsRoute,
      "(private)/admin/class-requests": AdminClassRequestsRoute,
      "(private)/admin/enrol-student": AdminEnrolStudentRoute,
      "(private)/admin/manage-school-rules": AdminManageSchoolRulesRoute,
      "(private)/admin/my-classes": AdminMyClassesRoute,
      "(private)/admin/weekly-occupancy": AdminWeeklyOccupancyRoute,
    },
    { initialUrl: routes.admin.home },
  );
  await app;

  return { getPathname: () => app.getPathname() };
}

beforeEach(() => {
  hydrateSession({
    user: {
      id: "admin-1",
      name: "Marta Rocha",
      role: "admin",
      status: "approved",
    } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
    },
  });
  teaching = NOT_TEACHING;
  fetchMock.mockReset();
  globalThis.fetch = fetchWithSchoolRules as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("AdminScreen", () => {
  it("shows the user header with the first name and the bell with the unread count", async () => {
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).endsWith("/notifications/unread-count") ? { count: 3 } : { items: [] },
    }));
    await openAdminHome();

    expect(screen.getByText("Marta")).toBeOnTheScreen();
    expect(screen.getByText("MR")).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeOnTheScreen();
  });

  it("shows the title and the row with the pending count", async () => {
    respondWith([person("a"), person("b"), person("c")]);
    await openAdminHome();

    expect(
      screen.getByRole("header", { name: "School tools" }),
    ).toBeOnTheScreen();
    expect(await screen.findByText("3 waiting")).toBeOnTheScreen();
    expect(screen.getByText("Join the school")).toBeOnTheScreen();
  });

  it("shows the Tools and School sections, with the People row and its placeholder count", async () => {
    respondWith([]);
    await openAdminHome();

    expect(screen.getByText("Tools")).toBeOnTheScreen();
    expect(screen.getByText("School")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /People/ })).toBeOnTheScreen();
    expect(screen.getByText("9 on the platform")).toBeOnTheScreen();
  });

  it("shows the Weekly occupancy card between People and School settings, and opens the screen", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/classes?date=")
          ? { weekStart: "2026-10-19", items: [] }
          : { items: [] },
    }));
    const app = await openAdminHome();
    const buttons = screen.getAllByRole("button");
    const indexOf = (name: string | RegExp) =>
      buttons.indexOf(screen.getByRole("button", { name }));
    const people = indexOf(/People/);

    expect(screen.getByText("Seats taken and free per class")).toBeOnTheScreen();
    expect(indexOf("Weekly occupancy")).toBe(people + 1);
    expect(indexOf(/School settings/)).toBe(people + 2);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/classes?date="))).toBe(false);

    await user.press(screen.getByRole("button", { name: "Weekly occupancy" }));

    expect(app.getPathname()).toBe(routes.admin.weeklyOccupancy);
    expect(screen.getByRole("header", { name: "WEEKLY OCCUPANCY" })).toBeOnTheScreen();
  });

  it("scrolls the home above the tab bar, so every School card can be reached", async () => {
    fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) }));
    await openAdminHome();

    const scroll = screen.getByTestId("admin-home-scroll");
    expect(scroll.props.contentInsetAdjustmentBehavior).toBe("automatic");
    // Under the opaque header the content already starts below it.
    expect(scroll.props.contentContainerStyle).toMatchObject({ paddingTop: 16 });
    expect(within(scroll).getByRole("button", { name: "Weekly occupancy" })).toBeOnTheScreen();
    expect(within(scroll).getByRole("button", { name: /School settings/ })).toBeOnTheScreen();
  });

  it("starts the home 16 pt below the transparent user header, which the automatic inset clears only up to the safe area", async () => {
    fetchMock.mockImplementation(async () => ({ ok: true, status: 200, json: async () => ({ items: [] }) }));
    const insets = jest.mocked(useSafeAreaInsets);
    const defaultInsets = insets.getMockImplementation();
    insets.mockReturnValue({ top: 62, right: 0, bottom: 34, left: 0 });

    try {
      await underTransparentHeader(126, openAdminHome);

      // The automatic inset adds the 62 pt safe area; the padding adds the rest of the 126 pt header, then 16 pt.
      expect(screen.getByTestId("admin-home-scroll").props.contentContainerStyle).toMatchObject({
        paddingTop: 126 - 62 + 16,
      });
    } finally {
      insets.mockImplementation(defaultInsets);
    }
  });

  it("opens the people directory, and its back button returns to the admin home", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/people")
          ? { items: [], page: 1, perPage: 20, total: 0 }
          : { items: [] },
    }));
    const app = await openAdminHome();

    await user.press(screen.getByRole("button", { name: /People/ }));

    expect(app.getPathname()).toBe(routes.admin.people);
    expect(await screen.findByText("No one found")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe(routes.admin.home);
  });

  it("shows the Criar aulas (Create classes) row below Join the school, and opens the Nova aula screen", async () => {
    const user = userEvent.setup();
    respondForNewClass();
    const app = await openAdminHome();

    expect(screen.getByText("Create classes")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: /Create classes/ }));

    expect(app.getPathname()).toBe("/admin/new-class");
    expect(screen.getByRole("header", { name: "Discipline" })).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe(routes.admin.home);
  });

  it("opens the cancellation rules screen from its row (cancellation rules)", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/cancellation-rules")
          ? { surf: "Surf rule.", skate: null }
          : { items: [] },
    }));
    const app = await openAdminHome();

    expect(screen.getByText("One for surf, one for skate")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Cancellation rules" }));

    expect(app.getPathname()).toBe(routes.admin.cancellationRules);
    expect(await screen.findByDisplayValue("Surf rule.")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe(routes.admin.home);
  });

  it("shows zero waiting", async () => {
    respondWith([]);
    await openAdminHome();

    expect(await screen.findByText("0 waiting")).toBeOnTheScreen();
  });

  it("shows the row without a count while loading", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await openAdminHome();

    expect(screen.getByText("Join the school")).toBeOnTheScreen();
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it("shows the row without a count after an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });
    await openAdminHome();

    await waitFor(() => expect(homeCalls()).toHaveLength(2));
    expect(screen.getByText("Join the school")).toBeOnTheScreen();
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it("opens the tool, and its back button returns to the admin home", async () => {
    const user = userEvent.setup();
    respondWith([person("a")]);
    const app = await openAdminHome();
    await screen.findByText("1 waiting");

    await user.press(screen.getByRole("button", { name: /Join the school/ }));

    expect(app.getPathname()).toBe(routes.admin.registrations);
    expect(await screen.findByText("Person a")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe(routes.admin.home);
    expect(await screen.findByText("1 waiting")).toBeOnTheScreen();
  });

  it("shows one less waiting after a decision, back on the home", async () => {
    const user = userEvent.setup();
    const items = [person("a"), person("b")];
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "POST") {
        items.shift();
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "a", status: "approved" }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [...items] }),
      };
    });
    await openAdminHome();
    await screen.findByText("2 waiting");

    await user.press(screen.getByRole("button", { name: /Join the school/ }));
    await screen.findByText("Person a");
    await user.press(screen.getAllByRole("button", { name: "Approve" })[0]);
    await waitFor(() => expect(screen.queryByText("Person a")).toBeNull());
    await act(async () => router.back());

    expect(await screen.findByText("1 waiting")).toBeOnTheScreen();
  });

  describe("the class enrolments row", () => {
    const pendingClass = {
      id: "c-1",
      discipline: "surf",
      level: "beginner",
      startsAt: "2026-10-21T11:00:00.000Z",
      endsAt: "2026-10-21T12:00:00.000Z",
      capacity: 8,
      seatsTaken: 1,
      location: { name: "Praia do Futuro" },
      requests: [
        { id: "r-1", requestedAt: "2026-10-19T12:12:00.000Z", student: { id: "s-1", name: "Ana Souza", photoUrl: null } },
        { id: "r-2", requestedAt: "2026-10-19T13:00:00.000Z", student: { id: "s-2", name: "Bruno Lima", photoUrl: null } },
      ],
    };

    const servePending = (body: unknown) =>
      fetchMock.mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () => (String(url).includes("/enrolments/pending") ? body : { items: [] }),
      }));

    it("sits below Join the school, above Create classes, and shows how many requests wait", async () => {
      servePending({ total: 2, classes: [pendingClass] });
      await openAdminHome();

      expect(await screen.findByText("2 requests")).toBeOnTheScreen();
      const rows = screen.getAllByText(/^(Join the school|Class enrolments|Create classes)$/);
      expect(rows.map((row) => row.props.children)).toEqual(["Join the school", "Class enrolments", "Create classes"]);
    });

    it("says one request in the singular", async () => {
      servePending({ total: 1, classes: [{ ...pendingClass, requests: [pendingClass.requests[0]] }] });
      await openAdminHome();

      expect(await screen.findByText("1 request")).toBeOnTheScreen();
    });

    it("hides the count when nothing waits, while loading and after an error", async () => {
      servePending({ total: 0, classes: [] });
      await openAdminHome();

      await waitFor(() => expect(homeCalls()).toHaveLength(2));
      expect(screen.getByText("Class enrolments")).toBeOnTheScreen();
      expect(screen.queryByText(/request/)).toBeNull();
    });

    it("opens the tool, and its back button returns to the admin home", async () => {
      const user = userEvent.setup();
      servePending({ total: 2, classes: [pendingClass] });
      const app = await openAdminHome();
      await screen.findByText("2 requests");

      await user.press(screen.getByRole("button", { name: /Class enrolments/ }));

      expect(app.getPathname()).toBe(routes.admin.classRequests);
      expect(await screen.findByText("Ana Souza")).toBeOnTheScreen();

      await act(async () => router.back());

      expect(app.getPathname()).toBe(routes.admin.home);
    });
  });

  describe("Enrol a student row", () => {
    it("sits under the tools, after the class enrolments, and opens the tool", async () => {
      const user = userEvent.setup();
      respondWith([]);
      const app = await openAdminHome();

      const rows = screen.getAllByText(/^(Class enrolments|Enrol a student|Create classes)$/);
      expect(rows.map((row) => row.props.children)).toEqual(["Class enrolments", "Enrol a student", "Create classes"]);

      await user.press(screen.getByRole("button", { name: /Enrol a student/ }));

      expect(app.getPathname()).toBe(routes.admin.enrolStudent);
      expect(await screen.findByRole("button", { name: "Choose class" })).toBeOnTheScreen();
    });
  });

  it("shows the Rules row first under School, above People, with the rule count, and opens the rules management screen", async () => {
    const user = userEvent.setup();
    respondWith([]);
    const app = await openAdminHome();

    expect(await screen.findByText("6 rules in students' onboarding")).toBeOnTheScreen();
    const rows = screen.getAllByText(/^(School|Rules|People|School settings)$/);
    expect(rows.map((row) => row.props.children)).toEqual(["School", "Rules", "People", "School settings"]);

    await user.press(screen.getByRole("button", { name: /Rules/ }));

    expect(app.getPathname()).toBe(routes.admin.manageSchoolRules);
    expect(await screen.findByRole("button", { name: "Move rule 1 down" })).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe(routes.admin.home);
  });

  it("opens the school settings screen from its row under School", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/school-settings")
          ? { whatsappNumber: null, waitingListEnabled: false }
          : { items: [] },
    }));
    const app = await openAdminHome();

    await user.press(screen.getByRole("button", { name: /School settings/ }));

    expect(app.getPathname()).toBe(routes.admin.schoolSettings);
    expect(await screen.findByText("Waiting list for full classes")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe(routes.admin.home);
  });

  describe("My classes", () => {
    it("is the first row under School when the admin teaches, counts the classes not cancelled, and opens the screen", async () => {
      const user = userEvent.setup();
      teaching = TEACHING;
      respondWith([]);
      const app = await openAdminHome();

      expect(await screen.findByText("1 class assigned to you")).toBeOnTheScreen();
      const rows = screen.getAllByText(/^(School|My classes|Rules|People|School settings)$/);
      expect(rows.map((row) => row.props.children)).toEqual([
        "School",
        "My classes",
        "Rules",
        "People",
        "School settings",
      ]);

      await user.press(screen.getByRole("button", { name: /My classes/ }));

      expect(app.getPathname()).toBe(routes.admin.myClasses);
      expect(await screen.findByRole("header", { name: "MY CLASSES" })).toBeOnTheScreen();
    });

    it("isn't shown when the admin teaches nothing, nor after a failed request", async () => {
      respondWith([]);
      await openAdminHome();
      expect(await screen.findByText("6 rules in students' onboarding")).toBeOnTheScreen();
      expect(screen.queryByText("My classes")).not.toBeOnTheScreen();

      teaching = null;
      await openAdminHome();
      expect(await screen.findByText("6 rules in students' onboarding")).toBeOnTheScreen();
      expect(screen.queryByText("My classes")).not.toBeOnTheScreen();
    });

    it("isn't shown while the request loads", async () => {
      teaching = TEACHING;
      respondWith([]);
      const pending = new Promise<never>(() => undefined);
      globalThis.fetch = ((url: string, init: RequestInit) =>
        String(url).endsWith("/classes/teaching") ? pending : fetchWithSchoolRules(url, init)) as typeof fetch;
      await openAdminHome();

      expect(await screen.findByText("6 rules in students' onboarding")).toBeOnTheScreen();
      expect(screen.queryByText("My classes")).not.toBeOnTheScreen();
    });

    it("appears back on the home once the admin teaches a class, without restarting the app", async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string) => ({
        ok: true,
        status: 200,
        json: async () =>
          String(url).includes("/people") ? { items: [], page: 1, perPage: 20, total: 0 } : { items: [] },
      }));
      await openAdminHome();
      expect(await screen.findByText("6 rules in students' onboarding")).toBeOnTheScreen();
      expect(screen.queryByText("My classes")).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: /People/ }));
      expect(await screen.findByText("No one found")).toBeOnTheScreen();
      teaching = TEACHING;
      await act(async () => router.back());

      expect(await screen.findByText("1 class assigned to you")).toBeOnTheScreen();
    });
  });
});

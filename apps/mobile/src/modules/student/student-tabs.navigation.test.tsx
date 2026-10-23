import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, userEvent } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";

import StudentTabsLayout from "@/app/(private)/student/(tabs)/_layout";
import AgendaLayout from "@/app/(private)/student/(tabs)/(agenda)/_layout";
import StudentRoute from "@/app/(private)/student/(tabs)/(agenda)/index";
import MyClassesLayout from "@/app/(private)/student/(tabs)/my-classes/_layout";
import MyClassesRoute from "@/app/(private)/student/(tabs)/my-classes/index";
import ProfileRoute from "@/app/(private)/student/(tabs)/profile";
import SchoolLayout from "@/app/(private)/student/(tabs)/school/_layout";
import SchoolRoute from "@/app/(private)/student/(tabs)/school/index";
import StudentClassRoute from "@/app/(private)/student/class/[id]";
import StudentLayout from "@/app/(private)/student/_layout";
import StudentNotificationsRoute from "@/app/(private)/student/notifications";
import {
  selectedTabLabel,
  tabLabels,
} from "@/components/role-tabs/role-tabs.test-utils";
import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";
import { hydrateSession } from "@/services/session/session.store";

// The classes start an hour from "now": fix the clock, or from 23:00 in Fortaleza they fall on the next day.
jest.useFakeTimers({
  now: new Date("2026-10-16T15:00:00.000Z"),
  doNotFake: [
    "nextTick",
    "setImmediate",
    "clearImmediate",
    "setInterval",
    "clearInterval",
    "setTimeout",
    "clearTimeout",
    "queueMicrotask",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "requestIdleCallback",
    "cancelIdleCallback",
    "performance",
    "hrtime",
  ],
});

afterAll(() => jest.useRealTimers());


const routeTree = {
  _layout: () => (
    <QueryClientProvider client={new QueryClient()}>
      <AlertMessageProvider>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>
  ),
  "(private)/student/_layout": StudentLayout,
  "(private)/student/(tabs)/_layout": StudentTabsLayout,
  "(private)/student/(tabs)/(agenda)/_layout": AgendaLayout,
  "(private)/student/(tabs)/(agenda)/index": StudentRoute,
  "(private)/student/(tabs)/my-classes/_layout": MyClassesLayout,
  "(private)/student/(tabs)/my-classes/index": MyClassesRoute,
  "(private)/student/(tabs)/school/_layout": SchoolLayout,
  "(private)/student/(tabs)/school/index": SchoolRoute,
  "(private)/student/(tabs)/profile": ProfileRoute,
  "(private)/student/class/[id]": StudentClassRoute,
  "(private)/student/notifications": StudentNotificationsRoute,
};

const aClass = {
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  capacity: 8,
  notes: null,
  location: { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000" },
  instructors: [{ id: "i-1", name: "Carla Dias" }],
  seatsTaken: 0,
  students: [],
  guests: [],
};

const people = {
  items: [
    {
      id: "p-1",
      name: "Bruno Lima",
      role: "instructor",
      createdAt: "2026-07-15T12:00:00.000Z",
      whatsappNumber: null,
    },
  ],
  page: 1,
  perPage: 20,
  total: 1,
};

const respond = (url: string) => {
  // The bell's badge, and an empty "Avisos".
  if (url.endsWith("/notifications/unread-count")) {
    return { count: 3 };
  }

  if (url.includes("/notifications?")) {
    return { items: [], page: 1, perPage: 20, total: 0 };
  }

  // The class details read the school rules for the count on their rules row.
  if (url.includes("/school-rules")) {
    return { version: 1, rules: [] };
  }

  if (url.includes("/classes?date=")) {
    return { weekStart: "x", items: [aClass] };
  }

  return url.includes("/classes/") ? aClass : people;
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => respond(String(url)),
  }));
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  hydrateSession({
    user: {
      id: "user-1",
      name: "Ana Souza",
      role: "student",
      status: "approved",
    } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
    },
  });
});

const open = async () => {
  const app = renderRouter(routeTree, { initialUrl: routes.student.home });
  await app;

  return { getPathname: () => app.getPathname() };
};

describe("student tabs", () => {
  it("student opens on Agenda and switches tabs", async () => {
    const app = await open();

    expect(tabLabels()).toEqual([
      "Schedule",
      "My classes",
      "School",
      "Profile",
    ]);
    expect(app.getPathname()).toBe("/student");
    expect(selectedTabLabel()).toBe("Schedule");
    // The user header takes the place of the "Schedule" title.
    expect(screen.queryByText("SCHEDULE")).not.toBeOnTheScreen();
    expect(screen.getByText("Ana")).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeOnTheScreen();
    expect(await screen.findByText("Praia do Futuro")).toBeOnTheScreen();

    await act(async () => router.navigate(routes.student.myClasses));
    expect(app.getPathname()).toBe("/student/my-classes");
    expect(selectedTabLabel()).toBe("My classes");

    await act(async () => router.navigate(routes.student.school));
    expect(app.getPathname()).toBe("/student/school");
    expect(selectedTabLabel()).toBe("School");

    await act(async () => router.navigate(routes.student.profile));
    expect(app.getPathname()).toBe("/student/profile");
    expect(selectedTabLabel()).toBe("Profile");
    expect(screen.getByRole("header", { name: "Ana Souza" })).toBeOnTheScreen();
  });

  it("opens a class above the tabs, and back returns to the Agenda with the tab bar", async () => {
    const user = userEvent.setup();
    const app = await open();

    await user.press(await screen.findByText("Praia do Futuro"));

    expect(app.getPathname()).toBe("/student/class/c-1");
    expect(await screen.findByText("Max. 8 students · 8 spots left")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe("/student");
    expect(selectedTabLabel()).toBe("Schedule");
  });

  it("opens Notifications above the tabs from the bell, and back reloads the badge on the Agenda", async () => {
    const user = userEvent.setup();
    const app = await open();
    const countCalls = () =>
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/notifications/unread-count"));

    await user.press(await screen.findByRole("button", { name: "Notifications, 3 unread" }));

    expect(app.getPathname()).toBe(routes.student.notifications);
    expect(await screen.findByText("No notifications yet")).toBeOnTheScreen();
    const callsBeforeBack = countCalls().length;

    await act(async () => router.back());

    expect(app.getPathname()).toBe("/student");
    expect(selectedTabLabel()).toBe("Schedule");
    expect(countCalls().length).toBeGreaterThan(callsBeforeBack);
  });

  it("the Escola tab shows the people directory", async () => {
    const app = await open();

    await act(async () => router.navigate(routes.student.school));

    expect(app.getPathname()).toBe("/student/school");
    expect(selectedTabLabel()).toBe("School");
    expect(screen.getByText("PEOPLE")).toBeOnTheScreen();
    expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeOnTheScreen();
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await open();

    expect(tabLabels()).toEqual(["Agenda", "Minhas aulas", "Escola", "Perfil"]);
  });
});

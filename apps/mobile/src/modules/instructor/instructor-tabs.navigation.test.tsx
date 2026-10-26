import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen, userEvent } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import InstructorTabsLayout from "@/app/(private)/instructor/(tabs)/_layout";
import ClassesLayout from "@/app/(private)/instructor/(tabs)/classes/_layout";
import ClassesRoute from "@/app/(private)/instructor/(tabs)/classes/index";
import InstructorHomeLayout from "@/app/(private)/instructor/(tabs)/(home)/_layout";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/(home)/index";
import ProfileRoute from "@/app/(private)/instructor/(tabs)/profile";
import InstructorClassRoute from "@/app/(private)/instructor/class/[id]";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorPeopleRoute from "@/app/(private)/instructor/people";
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
  "(private)/instructor/_layout": InstructorLayout,
  "(private)/instructor/(tabs)/_layout": InstructorTabsLayout,
  "(private)/instructor/(tabs)/(home)/_layout": InstructorHomeLayout,
  "(private)/instructor/(tabs)/(home)/index": InstructorRoute,
  "(private)/instructor/(tabs)/classes/_layout": ClassesLayout,
  "(private)/instructor/(tabs)/classes/index": ClassesRoute,
  "(private)/instructor/(tabs)/profile": ProfileRoute,
  "(private)/instructor/people": InstructorPeopleRoute,
  "(private)/instructor/class/[id]": InstructorClassRoute,
};

const aClass = {
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  capacity: 8,
  notes: null,
  location: {
    id: "l-1",
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 1000",
  },
  instructors: [{ id: "i-1", name: "Bruno Lima" }],
  seatsTaken: 0,
  students: [],
  guests: [],
};

const respond = (url: string) => {
  // The class details read the school rules for the count on their rules row.
  if (url.includes("/school-rules")) {
    return { version: 1, rules: [] };
  }

  if (url.includes("/classes?date=")) {
    return { weekStart: "x", items: [aClass] };
  }

  // The home's "My classes" row: nothing taught.
  if (url.endsWith("/classes/teaching")) {
    return { items: [], teachesAny: false };
  }

  return url.includes("/classes/")
    ? aClass
    : { items: [], page: 1, perPage: 20, total: 0 };
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
      role: "instructor",
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
  const app = renderRouter(routeTree, { initialUrl: routes.instructor.home });
  await app;

  return { getPathname: () => app.getPathname() };
};

describe("instructor tabs", () => {
  it("instructor opens on Panel and switches tabs", async () => {
    const app = await open();

    expect(tabLabels()).toEqual(["Panel", "Classes", "Profile"]);
    expect(app.getPathname()).toBe("/instructor");
    expect(selectedTabLabel()).toBe("Panel");
    expect(screen.getByRole("header", { name: "School" })).toBeOnTheScreen();

    await act(async () => router.navigate(routes.instructor.classes));
    expect(app.getPathname()).toBe("/instructor/classes");
    expect(selectedTabLabel()).toBe("Classes");
    expect(screen.queryByText("CLASSES")).not.toBeOnTheScreen();
    expect(await screen.findByText("Praia do Futuro")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "New class" }),
    ).not.toBeOnTheScreen();

    await act(async () => router.navigate(routes.instructor.profile));
    expect(app.getPathname()).toBe("/instructor/profile");
    expect(selectedTabLabel()).toBe("Profile");
    expect(screen.getByRole("header", { name: "Ana Souza" })).toBeOnTheScreen();
  });

  it("opens a class above the tabs, and back returns to Classes with the tab bar", async () => {
    const user = userEvent.setup();
    const app = await open();
    await act(async () => router.navigate(routes.instructor.classes));

    await user.press(await screen.findByText("Praia do Futuro"));

    expect(app.getPathname()).toBe("/instructor/class/c-1");
    expect(
      await screen.findByText("Max. 8 students · 8 spots left"),
    ).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe("/instructor/classes");
    expect(selectedTabLabel()).toBe("Classes");
  });

  it("/instructor/people shows the people directory", async () => {
    const app = await open();

    await act(async () => router.push(routes.instructor.people));

    expect(app.getPathname()).toBe("/instructor/people");
    expect(screen.getByRole("header", { name: "People" })).toBeOnTheScreen();
    expect(await screen.findByText("No one found")).toBeOnTheScreen();
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await open();

    expect(tabLabels()).toEqual(["Painel", "Aulas", "Perfil"]);
  });
});

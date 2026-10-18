import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen, userEvent } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import AdminTabsLayout from "@/app/(private)/admin/(tabs)/_layout";
import ClassesRoute from "@/app/(private)/admin/(tabs)/classes";
import AdminRoute from "@/app/(private)/admin/(tabs)/index";
import ProfileRoute from "@/app/(private)/admin/(tabs)/profile";
import AdminLayout from "@/app/(private)/admin/_layout";
import AdminClassRoute from "@/app/(private)/admin/class/[id]";
import AdminCancellationRulesRoute from "@/app/(private)/admin/cancellation-rules";
import AdminNewClassRoute from "@/app/(private)/admin/new-class";
import AdminPeopleRoute from "@/app/(private)/admin/people";
import AdminRegistrationsRoute from "@/app/(private)/admin/registrations";
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


const fetchMock = jest.fn();

const person = (id: string) => ({
  id,
  name: `Person ${id}`,
  email: `${id}@example.com`,
  createdAt: "2026-10-12T10:00:00.000Z",
});

const aClass = {
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  capacity: 8,
  notes: null,
  location: { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000" },
  instructors: [{ id: "i-1", name: "Bruno Lima" }],
};

const routeTree = {
  _layout: () => (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AlertMessageProvider>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>
  ),
  "(private)/admin/_layout": AdminLayout,
  "(private)/admin/(tabs)/_layout": AdminTabsLayout,
  "(private)/admin/(tabs)/index": AdminRoute,
  "(private)/admin/(tabs)/classes": ClassesRoute,
  "(private)/admin/(tabs)/profile": ProfileRoute,
  "(private)/admin/cancellation-rules": AdminCancellationRulesRoute,
  "(private)/admin/new-class": AdminNewClassRoute,
  "(private)/admin/people": AdminPeopleRoute,
  "(private)/admin/registrations": AdminRegistrationsRoute,
  "(private)/admin/class/[id]": AdminClassRoute,
};

const open = async () => {
  const app = renderRouter(routeTree, { initialUrl: routes.admin.home });
  await app;

  return { getPathname: () => app.getPathname() };
};

beforeEach(() => {
  hydrateSession({
    user: {
      id: "admin-1",
      name: "Ana Souza",
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
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items: [person("a"), person("b")] }),
  });
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      String(url).includes("/classes?date=")
        ? { weekStart: "x", items: [aClass] }
        : String(url).includes("/classes/")
          ? aClass
          : { items: [person("a"), person("b")] },
  }));
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("admin tabs", () => {
  it("admin opens on Home with the school tools and the pending count", async () => {
    const app = await open();

    expect(tabLabels()).toEqual(["Home", "Classes", "Profile"]);
    expect(app.getPathname()).toBe("/admin");
    expect(selectedTabLabel()).toBe("Home");
    expect(screen.getByText("School tools")).toBeOnTheScreen();
    expect(await screen.findByText("2 waiting")).toBeOnTheScreen();
  });

  it("switches between the tabs", async () => {
    const app = await open();

    await act(async () => router.navigate(routes.admin.classes));
    expect(app.getPathname()).toBe("/admin/classes");
    expect(selectedTabLabel()).toBe("Classes");
    expect(await screen.findByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "New class" })).toBeOnTheScreen();

    await act(async () => router.navigate(routes.admin.profile));
    expect(app.getPathname()).toBe("/admin/profile");
    expect(selectedTabLabel()).toBe("Profile");
    expect(screen.getByRole("header", { name: "Ana Souza" })).toBeOnTheScreen();
  });

  it("opens Join the school above the tabs, and back returns to Home with the tab bar", async () => {
    const user = userEvent.setup();
    const app = await open();

    await user.press(screen.getByText("Join the school"));
    expect(app.getPathname()).toBe("/admin/registrations");

    await act(async () => router.back());
    expect(app.getPathname()).toBe("/admin");
    expect(selectedTabLabel()).toBe("Home");
    expect(tabLabels()).toEqual(["Home", "Classes", "Profile"]);
  });

  it("opens the new class screen above the tabs, and back returns to Home with the tab bar", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/people?")
          ? { items: [], page: 1, perPage: 50, total: 0 }
          : { items: [] },
    }));
    const app = await open();

    await user.press(screen.getByText("Create classes"));

    expect(app.getPathname()).toBe("/admin/new-class");
    expect(screen.getByRole("header", { name: "New class" })).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe("/admin");
    expect(selectedTabLabel()).toBe("Home");
    expect(tabLabels()).toEqual(["Home", "Classes", "Profile"]);
  });

  it("opens the cancellation rules above the tabs, and back returns to Home with the tab bar (cancellation rules)", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/cancellation-rules")
          ? { surf: null, skate: null }
          : { items: [] },
    }));
    const app = await open();

    await user.press(screen.getByText("One for surf, one for skate"));

    expect(app.getPathname()).toBe("/admin/cancellation-rules");
    expect(await screen.findByText("No rule for surf yet")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe("/admin");
    expect(selectedTabLabel()).toBe("Home");
    expect(tabLabels()).toEqual(["Home", "Classes", "Profile"]);
  });

  it("opens a class above the tabs, and back returns to Classes with the tab bar", async () => {
    const user = userEvent.setup();
    const app = await open();
    await act(async () => router.navigate(routes.admin.classes));

    await user.press(await screen.findByText("Praia do Futuro"));

    expect(app.getPathname()).toBe("/admin/class/c-1");
    expect(await screen.findByText("Max. 8 students")).toBeOnTheScreen();

    await act(async () => router.back());

    expect(app.getPathname()).toBe("/admin/classes");
    expect(selectedTabLabel()).toBe("Classes");
  });

  it("opens Nova aula with the day from the Aulas tab", async () => {
    const user = userEvent.setup();
    const app = await open();
    await act(async () => router.navigate(routes.admin.classes));
    await screen.findByText("Praia do Futuro");

    await user.press(screen.getByRole("button", { name: "Create class on this day" }));

    expect(app.getPathname()).toBe("/admin/new-class");
  });

  it("/admin/people shows the people directory", async () => {
    const app = await open();

    await act(async () => router.push(routes.admin.people));

    expect(app.getPathname()).toBe("/admin/people");
    expect(screen.getByRole("header", { name: "People" })).toBeOnTheScreen();

    await act(async () => router.back());
    expect(app.getPathname()).toBe("/admin");
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("es-ES");
    await open();

    expect(tabLabels()).toEqual(["Inicio", "Clases", "Perfil"]);
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen, userEvent } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import AdminTabsLayout from "@/app/(private)/admin/(tabs)/_layout";
import ClassesRoute from "@/app/(private)/admin/(tabs)/classes";
import AdminRoute from "@/app/(private)/admin/(tabs)/index";
import ProfileRoute from "@/app/(private)/admin/(tabs)/profile";
import AdminLayout from "@/app/(private)/admin/_layout";
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

const fetchMock = jest.fn();

const person = (id: string) => ({
  id,
  name: `Person ${id}`,
  email: `${id}@example.com`,
  createdAt: "2026-10-12T10:00:00.000Z",
});

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
  "(private)/admin/registrations": AdminRegistrationsRoute,
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

    await user.press(await screen.findByRole("button", { name: "Back" }));
    expect(app.getPathname()).toBe("/admin");
    expect(selectedTabLabel()).toBe("Home");
    expect(tabLabels()).toEqual(["Home", "Classes", "Profile"]);
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("es-ES");
    await open();

    expect(tabLabels()).toEqual(["Inicio", "Clases", "Perfil"]);
  });
});

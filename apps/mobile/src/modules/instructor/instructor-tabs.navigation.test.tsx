import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import InstructorTabsLayout from "@/app/(private)/instructor/(tabs)/_layout";
import ClassesRoute from "@/app/(private)/instructor/(tabs)/classes";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/index";
import ProfileRoute from "@/app/(private)/instructor/(tabs)/profile";
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
  "(private)/instructor/(tabs)/index": InstructorRoute,
  "(private)/instructor/(tabs)/classes": ClassesRoute,
  "(private)/instructor/(tabs)/profile": ProfileRoute,
  "(private)/instructor/people": InstructorPeopleRoute,
};

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items: [], page: 1, perPage: 20, total: 0 }),
  });
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
  it("instructor opens on Home and switches tabs", async () => {
    const app = await open();

    expect(tabLabels()).toEqual(["Home", "Classes", "Profile"]);
    expect(app.getPathname()).toBe("/instructor");
    expect(selectedTabLabel()).toBe("Home");
    expect(
      screen.getByRole("header", { name: "Instructor" }),
    ).toBeOnTheScreen();

    await act(async () => router.navigate(routes.instructor.classes));
    expect(app.getPathname()).toBe("/instructor/classes");
    expect(selectedTabLabel()).toBe("Classes");

    await act(async () => router.navigate(routes.instructor.profile));
    expect(app.getPathname()).toBe("/instructor/profile");
    expect(selectedTabLabel()).toBe("Profile");
    expect(screen.getByRole("header", { name: "Ana Souza" })).toBeOnTheScreen();
  });

  it("/instructor/people shows the people directory", async () => {
    const app = await open();

    await act(async () => router.push(routes.instructor.people));

    expect(app.getPathname()).toBe("/instructor/people");
    expect(screen.getByRole("header", { name: "People" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(await screen.findByText("No one found")).toBeOnTheScreen();
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await open();

    expect(tabLabels()).toEqual(["Início", "Aulas", "Perfil"]);
  });
});

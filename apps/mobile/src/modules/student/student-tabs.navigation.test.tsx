import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";

import StudentTabsLayout from "@/app/(private)/student/(tabs)/_layout";
import StudentRoute from "@/app/(private)/student/(tabs)/index";
import MyClassesRoute from "@/app/(private)/student/(tabs)/my-classes";
import ProfileRoute from "@/app/(private)/student/(tabs)/profile";
import SchoolRoute from "@/app/(private)/student/(tabs)/school";
import StudentLayout from "@/app/(private)/student/_layout";
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
  "(private)/student/_layout": StudentLayout,
  "(private)/student/(tabs)/_layout": StudentTabsLayout,
  "(private)/student/(tabs)/index": StudentRoute,
  "(private)/student/(tabs)/my-classes": MyClassesRoute,
  "(private)/student/(tabs)/school": SchoolRoute,
  "(private)/student/(tabs)/profile": ProfileRoute,
};

beforeEach(() => {
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
    expect(screen.getByRole("header", { name: "Student" })).toBeOnTheScreen();

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

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await open();

    expect(tabLabels()).toEqual(["Agenda", "Minhas aulas", "Escola", "Perfil"]);
  });
});

import { act, screen } from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import InstructorTabsLayout from "@/app/(private)/instructor/(tabs)/_layout";
import ClassesRoute from "@/app/(private)/instructor/(tabs)/classes";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/index";
import ProfileRoute from "@/app/(private)/instructor/(tabs)/profile";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import {
  selectedTabLabel,
  tabLabels,
} from "@/components/role-tabs/role-tabs.test-utils";
import { routes } from "@/constants/routes";
import i18n from "@/i18n";

const routeTree = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  "(private)/instructor/_layout": InstructorLayout,
  "(private)/instructor/(tabs)/_layout": InstructorTabsLayout,
  "(private)/instructor/(tabs)/index": InstructorRoute,
  "(private)/instructor/(tabs)/classes": ClassesRoute,
  "(private)/instructor/(tabs)/profile": ProfileRoute,
};

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
    expect(screen.getByText("Instructor")).toBeOnTheScreen();

    await act(async () => router.navigate(routes.instructor.classes));
    expect(app.getPathname()).toBe("/instructor/classes");
    expect(selectedTabLabel()).toBe("Classes");

    await act(async () => router.navigate(routes.instructor.profile));
    expect(app.getPathname()).toBe("/instructor/profile");
    expect(selectedTabLabel()).toBe("Profile");
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await open();

    expect(tabLabels()).toEqual(["Início", "Aulas", "Perfil"]);
  });
});

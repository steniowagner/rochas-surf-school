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

const routeTree = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  "(private)/student/_layout": StudentLayout,
  "(private)/student/(tabs)/_layout": StudentTabsLayout,
  "(private)/student/(tabs)/index": StudentRoute,
  "(private)/student/(tabs)/my-classes": MyClassesRoute,
  "(private)/student/(tabs)/school": SchoolRoute,
  "(private)/student/(tabs)/profile": ProfileRoute,
};

const open = async () => {
  const app = renderRouter(routeTree, { initialUrl: routes.student.home });
  await app;

  return { getPathname: () => app.getPathname() };
};

describe("student tabs", () => {
  it("student opens on Agenda and switches tabs", async () => {
    const app = await open();

    expect(tabLabels()).toEqual(["Schedule", "My classes", "School", "Profile"]);
    expect(app.getPathname()).toBe("/student");
    expect(selectedTabLabel()).toBe("Schedule");
    expect(screen.getByText("Student")).toBeOnTheScreen();

    await act(async () => router.navigate(routes.student.myClasses));
    expect(app.getPathname()).toBe("/student/my-classes");
    expect(selectedTabLabel()).toBe("My classes");

    await act(async () => router.navigate(routes.student.school));
    expect(app.getPathname()).toBe("/student/school");
    expect(selectedTabLabel()).toBe("School");

    await act(async () => router.navigate(routes.student.profile));
    expect(app.getPathname()).toBe("/student/profile");
    expect(selectedTabLabel()).toBe("Profile");
  });

  it("labels the tabs in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await open();

    expect(tabLabels()).toEqual(["Agenda", "Minhas aulas", "Escola", "Perfil"]);
  });
});

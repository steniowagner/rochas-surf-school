import { router } from "expo-router";

import { routes } from "@/constants/routes";

import { pushScreen } from "./push-screen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

describe("pushScreen", () => {
  it("pushes the href as a singular route", () => {
    pushScreen(routes.admin.classDetail("class-1"));

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(
      routes.admin.classDetail("class-1"),
      {
        dangerouslySingular: true,
      },
    );
  });
});

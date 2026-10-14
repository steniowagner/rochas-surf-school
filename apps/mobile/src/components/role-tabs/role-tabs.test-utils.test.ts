import { screen } from "expo-router/testing-library";

import { selectedTabLabel, tabLabels } from "./role-tabs.test-utils";

jest.mock("expo-router/testing-library", () => ({
  screen: { toJSON: jest.fn() },
}));

const tab = (title: string, pointerEvents: string) => ({
  type: "RNSTabsScreenIOS",
  props: { title, pointerEvents },
  children: ["text", { type: "View", props: {}, children: null }],
});

describe("role-tabs test utils", () => {
  it("reads the tab labels and the selected tab from the rendered tree", () => {
    jest.mocked(screen.toJSON).mockReturnValue({
      type: "View",
      props: {},
      children: [tab("Home", "box-none"), tab("Profile", "none")],
    } as never);

    expect(tabLabels()).toEqual(["Home", "Profile"]);
    expect(selectedTabLabel()).toBe("Home");
  });

  it("accepts a tree with several roots and no selected tab", () => {
    jest
      .mocked(screen.toJSON)
      .mockReturnValue([tab("Home", "none"), tab("Profile", "none")] as never);

    expect(tabLabels()).toEqual(["Home", "Profile"]);
    expect(selectedTabLabel()).toBeUndefined();
  });
});

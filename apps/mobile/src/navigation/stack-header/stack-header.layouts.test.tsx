import { render } from "@testing-library/react-native";
import { Stack } from "expo-router";

import AuthLayout from "@/app/(public)/auth/_layout";
import AdminLayout from "@/app/(private)/admin/_layout";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import StudentLayout from "@/app/(private)/student/_layout";

jest.mock("expo-router", () => {
  const Stack = jest.fn(() => null);
  (Stack as unknown as { Screen: jest.Mock }).Screen = jest.fn(() => null);
  return { Stack };
});

const layouts = [
  ["auth", AuthLayout, "index"],
  ["admin", AdminLayout, "(tabs)"],
  ["instructor", InstructorLayout, "(tabs)"],
  ["student", StudentLayout, "(tabs)"],
] as const;

describe.each(layouts)("%s layout", (_name, Layout, hiddenScreen) => {
  it("uses the shared header and hides it on the root screen", async () => {
    await render(<Layout />);

    const [props] = (Stack as unknown as jest.Mock).mock.calls.at(-1)!;
    expect(props.screenOptions).toMatchObject({
      headerShown: true,
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
    });
    const screen = props.children;
    expect(screen.props).toEqual({
      name: hiddenScreen,
      options: { headerShown: false },
    });
  });
});

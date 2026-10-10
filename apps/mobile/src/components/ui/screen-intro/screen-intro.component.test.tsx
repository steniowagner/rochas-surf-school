import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { ScreenIntro } from "./screen-intro.component";

describe("ScreenIntro", () => {
  it("renders the icon, the title as a header and a string description", async () => {
    await render(
      <ScreenIntro
        icon={<Text>icon</Text>}
        title="Create account"
        description="Tell us your name"
      />,
    );

    expect(screen.getByText("icon")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Create account" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Tell us your name")).toBeOnTheScreen();
  });

  it("renders a description given as elements", async () => {
    await render(
      <ScreenIntro
        icon={null}
        title="Title"
        description={
          <>
            Check <Text>ana@gmail.com</Text> now
          </>
        }
      />,
    );

    expect(screen.getByText("ana@gmail.com")).toBeOnTheScreen();
  });

  it("renders the eyebrow only when given", async () => {
    const { rerender } = await render(
      <ScreenIntro icon={null} title="Title" description="Text" />,
    );
    expect(screen.queryByText("Account created")).not.toBeOnTheScreen();

    await rerender(
      <ScreenIntro
        icon={null}
        title="Title"
        description="Text"
        eyebrow="Account created"
        iconTileClassName="bg-warn-tint"
      />,
    );
    expect(screen.getByText("Account created")).toBeOnTheScreen();
  });
});

import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { FormSection } from "./form-section.component";

describe("FormSection", () => {
  it("shows the label, the hint and the content", async () => {
    await render(
      <FormSection label="Level" hint="label only">
        <Text>content</Text>
      </FormSection>,
    );

    expect(screen.getByRole("header", { name: "Level" })).toBeTruthy();
    expect(screen.getByText("label only")).toBeTruthy();
    expect(screen.getByText("content")).toBeTruthy();
  });

  it("shows no hint when there is none", async () => {
    await render(
      <FormSection label="Level">
        <Text>content</Text>
      </FormSection>,
    );

    expect(screen.queryByText("label only")).toBeNull();
  });
});

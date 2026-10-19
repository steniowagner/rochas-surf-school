import { render, screen } from "@testing-library/react-native";

import { StackHeaderTitle } from "./stack-header-title.component";

describe("StackHeaderTitle", () => {
  it("shows the title in uppercase", async () => {
    await render(<StackHeaderTitle title="New class" />);

    expect(screen.getByText("NEW CLASS")).toBeTruthy();
  });

  it("shows the subtitle only when given", async () => {
    const { rerender } = await render(
      <StackHeaderTitle title="People" subtitle="3 on the platform" />,
    );
    expect(screen.getByText("3 on the platform")).toBeTruthy();

    await rerender(<StackHeaderTitle title="People" />);
    expect(screen.queryByText("3 on the platform")).toBeNull();
  });
});

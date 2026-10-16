import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { TimeRangeHint } from "./time-range-hint.component";

describe("TimeRangeHint", () => {
  it("shows the rule next to an info icon", async () => {
    await render(<TimeRangeHint>{"Times can overlap"}</TimeRangeHint>);

    expect(screen.getByText("Times can overlap")).toBeTruthy();
  });

  it("accepts any text content", async () => {
    await render(
      <TimeRangeHint>
        <Text>Nested</Text>
      </TimeRangeHint>,
    );

    expect(screen.getByText("Nested")).toBeTruthy();
  });
});

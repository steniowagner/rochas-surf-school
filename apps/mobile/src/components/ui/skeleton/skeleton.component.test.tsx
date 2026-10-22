import { render, screen } from "@testing-library/react-native";

import { Skeleton } from "./skeleton.component";

describe("Skeleton", () => {
  it("draws a sand block with the measures it is given, at full opacity to start", async () => {
    await render(<Skeleton className="h-[22px] w-[52px] rounded-full" />);

    expect(screen.root?.props.className).toBe(
      "bg-sand h-[22px] w-[52px] rounded-full",
    );
    expect(screen.root).toHaveStyle({ opacity: 1 });
  });

  it("draws a surface block on a dim background", async () => {
    await render(<Skeleton className="h-[15px] w-24" tone="surface" />);

    expect(screen.root?.props.className).toBe("bg-surface h-[15px] w-24");
  });
});

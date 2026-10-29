import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleSkeleton } from "./people-skeleton.component";

describe("PeopleSkeleton", () => {
  it("draws five rows of an avatar, two lines and a chip", () => {
    render(<PeopleSkeleton />);

    expect(screen.getByTestId("people-skeleton").children).toHaveLength(5);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(20);
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

import { SessionProvider } from "@/providers/session";

import { PendingScreen } from "./pending.screen";

describe("PendingScreen", () => {
  it("shows the pending approval content", async () => {
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <SessionProvider>
          <PendingScreen />
        </SessionProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("header", { name: "Waiting for approval" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
  });
});

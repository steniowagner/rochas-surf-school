import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";

import { WhatsappScreen } from "./whatsapp.screen";

describe("WhatsappScreen", () => {
  it("shows the WhatsApp step", async () => {
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <AlertMessageProvider>
          <SessionProvider>
            <WhatsappScreen />
          </SessionProvider>
        </AlertMessageProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Account approved")).toBeOnTheScreen();
    expect(screen.getByText("WhatsApp number")).toBeOnTheScreen();
  });
});

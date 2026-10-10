import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { userEvent } from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter, screen } from "expo-router/testing-library";

import AuthLayout from "@/app/(public)/auth/_layout";
import ConfirmCodeRoute from "@/app/(public)/auth/confirm-code";
import CreateAccountRoute from "@/app/(public)/auth/create-account";
import EmailRoute from "@/app/(public)/auth/email";
import EmailSignInRoute from "@/app/(public)/auth/email-sign-in";
import AuthRoute from "@/app/(public)/auth/index";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";

function TestRootLayout() {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <AlertMessageProvider>
        <SessionProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>
  );
}

const routeTree = {
  _layout: TestRootLayout,
  "auth/_layout": AuthLayout,
  "auth/index": AuthRoute,
  "auth/email": EmailRoute,
  "auth/email-sign-in": EmailSignInRoute,
  "auth/create-account": CreateAccountRoute,
  "auth/confirm-code": ConfirmCodeRoute,
};

// RNTL 14's render is async, so renderRouter returns a promise; its route helpers (getPathname…) sit on that promise.
let app: ReturnType<typeof renderRouter>;

const openApp = async (initialUrl: string) => {
  app = renderRouter(routeTree, { initialUrl });
  await app;
};

const press = async (name: string) => {
  const user = userEvent.setup();

  await user.press(screen.getByRole("button", { name }));
};

// The sign-in screen's buttons carry no accessibility role, so they are found by their text.
const pressText = async (text: string) => {
  const user = userEvent.setup();

  await user.press(screen.getByText(text));
};

describe("email authentication navigation", () => {
  it("opens Choose from Continue with email", async () => {
    await openApp("/auth");

    await pressText("Continue with email");

    expect(app.getPathname()).toBe("/auth/email");
    expect(
      screen.getByRole("header", { name: "Continue with email" }),
    ).toBeOnTheScreen();
  });

  it("goes back to sign-in from Choose", async () => {
    await openApp("/auth");
    await pressText("Continue with email");

    await press("Back");

    expect(app.getPathname()).toBe("/auth");
  });

  it("opens sign in with email from I have an account", async () => {
    await openApp("/auth/email");

    await press("I have an account");

    expect(app.getPathname()).toBe("/auth/email-sign-in");
    expect(screen.getByRole("header", { name: "Sign in" })).toBeOnTheScreen();
  });

  it("opens create account from I'm new here and goes back to Choose", async () => {
    await openApp("/auth");
    await pressText("Continue with email");

    await press("I'm new here");

    expect(app.getPathname()).toBe("/auth/create-account");
    expect(screen.getByPlaceholderText("you@email.com")).toHaveDisplayValue("");

    await press("Back");

    expect(app.getPathname()).toBe("/auth/email");
  });
});

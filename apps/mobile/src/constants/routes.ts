import type { Href } from "expo-router";

/** Every app route in one place. `as const` keeps the paths typed by Expo Router's typed routes. */
export const routes = {
  auth: {
    signIn: "/auth",
    createAccount: "/auth/create-account",
    confirmCode: (params: { email: string; name: string }): Href => ({
      pathname: "/auth/confirm-code",
      params,
    }),
  },
} as const;

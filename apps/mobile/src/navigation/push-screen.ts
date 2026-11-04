import { Href, router } from "expo-router";

/**
 * Opens a screen with a singular push (spec 087): a route with the same path params already in the stack is
 * brought to the top instead of being pushed again, so a second tap during the slide-in opens nothing new.
 * ESLint rejects a direct `router.push` everywhere else.
 */
export const pushScreen = (href: Href) =>
  router.push(href, { dangerouslySingular: true });

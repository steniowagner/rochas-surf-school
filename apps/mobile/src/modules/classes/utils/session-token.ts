/**
 * A UUID v4 for the session of address suggestions (Google bills autocomplete by session). It only groups requests,
 * it protects nothing, so `Math.random` is enough and no crypto polyfill is needed.
 */
export const newSessionToken = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random % 4) + 8;

    return value.toString(16);
  });

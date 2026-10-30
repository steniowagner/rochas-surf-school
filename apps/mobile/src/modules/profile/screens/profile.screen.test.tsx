import {
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { openBrowserAsync } from "expo-web-browser";
import { router } from "expo-router";
import { Appearance, Platform, Text } from "react-native";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { useSession } from "@/providers/session";
import { setThemePreference } from "@/services/preferences/theme-preference";
import * as api from "@/services/api/api.client";
import { readPushEnabledPreference } from "@/services/preferences/preferences.storage";
import * as push from "@/services/push/push.service";

import {
  account,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "../profile.test-utils";

import { ProfileScreen } from "./profile.screen";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));
jest.mock("@/services/api/api.client");
jest.mock("@/services/push/push.service");
jest.useFakeTimers();

const fetchMock = setupFetch();

const apiDelete = jest.mocked(api.apiDelete);
const getPushToken = jest.mocked(push.getPushToken);

function SessionState() {
  const { user } = useSession();

  return <Text>{user ? `signed in as ${user.name}` : "signed out"}</Text>;
}

const open = async (overrides: Parameters<typeof account>[0] = {}) => {
  seedSession(account(overrides));
  await renderWithProviders(
    <>
      <ProfileScreen />
      <SessionState />
    </>,
  );

  return userEvent.setup();
};

// The bottom sheet's mock keeps its content mounted, so only the first buttons are the rows of the page.
const ROW_COUNT = 11;

const rowLabels = () =>
  screen
    .getAllByRole("button")
    .slice(0, ROW_COUNT)
    .map((button) => button.props.accessibilityLabel);

const signOutRow = () => screen.getAllByRole("button", { name: "Sign out" })[0];

describe("ProfileScreen", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_WEB_URL = "http://localhost:3000";
    jest
      .mocked(openBrowserAsync)
      .mockReset()
      .mockResolvedValue({ type: "dismiss" } as never);
    jest.mocked(router.push).mockClear();
    apiDelete.mockReset().mockResolvedValue(undefined);
    getPushToken.mockReset().mockResolvedValue("ExponentPushToken[abc]");
    jest.mocked(push.isPushPermissionDenied).mockResolvedValue(false);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    });
  });

  it("shows the account's photo, and the initials when it fails to load", async () => {
    await open({ photoUrl: "https://img.test/ana.jpg" });

    expect(screen.queryByText("AS")).toBeNull();

    await fireEvent(screen.getByTestId("profile-avatar-photo"), "error", {
      nativeEvent: { error: "404" },
    });

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.queryByTestId("profile-avatar-photo")).toBeNull();
  });

  it.each([
    ["student", "Student"],
    ["instructor", "Instructor"],
    ["admin", "Admin"],
  ])("shows the header and the rows of a %s", async (role, chip) => {
    await open({ role });

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Ana Souza" })).toBeOnTheScreen();
    expect(screen.getByText(chip)).toBeOnTheScreen();
    expect(rowLabels()).toEqual([
      "Edit profile",
      "WhatsApp",
      "Theme",
      "Language",
      "School rules",
      "Cancellation rules",
      "About the app",
      "Privacy policy",
      "Terms of use",
      "Sign out",
      "Remove account",
    ]);
    expect(
      screen.getByRole("switch", { name: "Push notifications" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/Notifications always stay in the app/),
    ).toBeOnTheScreen();
  });

  it("renders on Android, where the screen adds its own status bar room", async () => {
    const original = Platform.OS;
    Platform.OS = "android";
    await open();

    expect(screen.getByRole("header", { name: "Ana Souza" })).toBeOnTheScreen();
    Platform.OS = original;
  });

  it("shows one initial for a one-word name", async () => {
    await open({ name: "Madonna" });

    expect(screen.getByText("M")).toBeOnTheScreen();
  });

  it("shows Hidden or Visible on the WhatsApp row from the session", async () => {
    await open({ whatsappVisible: false });
    expect(screen.getByText("Hidden")).toBeOnTheScreen();
  });

  it("shows Visible when the number is visible", async () => {
    await open({ whatsappVisible: true });
    expect(screen.getByText("Visible")).toBeOnTheScreen();
  });

  it.each([
    ["student", routes.student],
    ["instructor", routes.instructor],
    ["admin", routes.admin],
  ])("opens the inner screens of a %s above the tabs", async (role, paths) => {
    const user = await open({ role });

    await user.press(screen.getByRole("button", { name: "Edit profile" }));
    await user.press(screen.getByRole("button", { name: "WhatsApp" }));
    await user.press(screen.getByRole("button", { name: "School rules" }));

    expect(router.push).toHaveBeenNthCalledWith(1, paths.editProfile);
    expect(router.push).toHaveBeenNthCalledWith(2, paths.whatsapp);
    expect(router.push).toHaveBeenNthCalledWith(3, paths.schoolRules);
  });

  it.each(["student", "instructor", "admin"] as const)(
    "shows both cancellation rules in a sheet to a %s and closes it",
    async (role) => {
      jest.mocked(api.apiGet).mockResolvedValue({
        surf: "Até 12 horas antes do início.",
        skate: null,
      });
      const user = await open({ role });

      await user.press(
        screen.getByRole("button", { name: "Cancellation rules" }),
      );

      expect(
        await screen.findByText("Até 12 horas antes do início."),
      ).toBeOnTheScreen();
      expect(
        screen.getByText("The school hasn't written this rule yet."),
      ).toBeOnTheScreen();
      expect(api.apiGet).toHaveBeenCalledWith("/cancellation-rules", {
        authenticated: true,
      });
      expect(screen.queryByText("Coming soon.")).toBeNull();
      expect(router.push).not.toHaveBeenCalled();

      await user.press(screen.getAllByRole("button", { name: "Close" })[0]);
    },
  );

  describe("about and web pages", () => {
    it("opens the About sheet with the mocked content and no legal links", async () => {
      const user = await open();

      await user.press(screen.getByRole("button", { name: "About the app" }));

      expect(screen.getAllByText("Rocha's Surf School").length).toBeGreaterThan(
        0,
      );
      expect(screen.getByText("Version 0.9 · beta")).toBeOnTheScreen();
      expect(screen.getByText("Stenio Wagner")).toBeOnTheScreen();
    });

    it("opens the privacy policy and the terms in the app language", async () => {
      await i18n.changeLanguage("pt-BR");
      const user = await open();

      await user.press(
        screen.getByRole("button", { name: "Política de privacidade" }),
      );
      await user.press(screen.getByRole("button", { name: "Termos de uso" }));

      expect(openBrowserAsync).toHaveBeenNthCalledWith(
        1,
        "http://localhost:3000/pt-br/privacy-policy",
      );
      expect(openBrowserAsync).toHaveBeenNthCalledWith(
        2,
        "http://localhost:3000/pt-br/terms-of-use",
      );
    });

    it("shows the generic toast when the browser can't open", async () => {
      jest.mocked(openBrowserAsync).mockRejectedValue(new Error("no browser"));
      const user = await open();

      await user.press(screen.getByRole("button", { name: "Privacy policy" }));

      expect(
        await screen.findByText("Something went wrong. Please try again."),
      ).toBeOnTheScreen();
    });

    it("hides both rows without the web address", async () => {
      delete process.env.EXPO_PUBLIC_WEB_URL;
      await open();

      expect(
        screen.queryByRole("button", { name: "Privacy policy" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "Terms of use" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "About the app" }),
      ).toBeOnTheScreen();
      expect(signOutRow()).toBeOnTheScreen();
    });
  });

  describe("theme and language", () => {
    beforeEach(() => {
      jest
        .spyOn(Appearance, "setColorScheme")
        .mockImplementation(() => undefined);
      setThemePreference("system");
    });

    afterEach(() => jest.restoreAllMocks());

    it("shows the current theme choice and language on their rows", async () => {
      await open();

      expect(
        within(screen.getByRole("button", { name: "Theme" })).getByText(
          "Same as phone",
        ),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByRole("button", { name: "Language" })).getByText(
          "English",
        ),
      ).toBeOnTheScreen();
    });

    it("picks a theme from its sheet and shows it on the row", async () => {
      const user = await open();

      await user.press(screen.getByRole("button", { name: "Theme" }));
      expect(
        screen.getByText(
          "Until you choose, the app follows your phone's theme.",
        ),
      ).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: /Dark/ }));

      expect(Appearance.setColorScheme).toHaveBeenCalledWith("dark");
      expect(screen.getByRole("button", { name: "Theme" })).toBeOnTheScreen();
      expect(
        within(screen.getByRole("button", { name: "Theme" })).getByText("Dark"),
      ).toBeOnTheScreen();
    });

    it("picks a language from its sheet and shows the profile in it", async () => {
      const user = await open();

      await user.press(screen.getByRole("button", { name: "Language" }));
      await user.press(screen.getByRole("button", { name: /Español/ }));

      const languageRow = await screen.findByRole("button", { name: "Idioma" });
      expect(
        screen.getByRole("button", { name: "Editar perfil" }),
      ).toBeOnTheScreen();
      expect(within(languageRow).getByText("Español")).toBeOnTheScreen();
      expect(SecureStore.getItem("prefs.locale")).toBe("es-ES");
    });
  });

  describe("push switch", () => {
    const pushSwitch = () =>
      screen.getByRole("switch", { name: "Push notifications" });

    it("is on by default, and turning it off stores it and deletes the token", async () => {
      await open();
      expect(pushSwitch().props.value).toBe(true);

      await fireEvent(pushSwitch(), "valueChange", false);

      await waitFor(() => expect(pushSwitch().props.value).toBe(false));
      expect(readPushEnabledPreference()).toBe(false);
      await waitFor(() =>
        expect(apiDelete).toHaveBeenCalledWith(
          "/notifications/push-token",
          { token: "ExponentPushToken[abc]" },
          { authenticated: true },
        ),
      );
    });

    it("turns off again when the OS permission is denied, with the toast", async () => {
      await open();
      await fireEvent(pushSwitch(), "valueChange", false);
      await waitFor(() => expect(pushSwitch().props.value).toBe(false));
      getPushToken.mockResolvedValue(null);
      jest.mocked(push.isPushPermissionDenied).mockResolvedValue(true);

      await fireEvent(pushSwitch(), "valueChange", true);

      expect(
        await screen.findByText(
          "Allow notifications for the app in your phone's settings.",
        ),
      ).toBeOnTheScreen();
      expect(pushSwitch().props.value).toBe(false);
    });
  });

  describe("remove account", () => {
    const removeRow = () =>
      screen.getAllByRole("button", { name: "Remove account" })[0];

    it("asks first, and Cancel keeps the account", async () => {
      const user = await open();

      await user.press(removeRow());

      expect(screen.getByText("Remove your account?")).toBeOnTheScreen();
      const cancels = screen.getAllByRole("button", { name: "Cancel" });
      await user.press(cancels[0]);

      expect(screen.getByText("signed in as Ana Souza")).toBeOnTheScreen();
      expect(apiDelete).not.toHaveBeenCalled();
    });

    it("closes the account on the backend and signs out when confirmed", async () => {
      const user = await open();

      await user.press(removeRow());
      const confirms = screen.getAllByRole("button", {
        name: "Remove account",
      });
      await user.press(confirms[confirms.length - 1]);

      await waitFor(() =>
        expect(apiDelete).toHaveBeenCalledWith(
          "/auth/me",
          {},
          { authenticated: true },
        ),
      );
      expect(await screen.findByText("signed out")).toBeOnTheScreen();
    });

    it("ignores another confirmation while the request is running", async () => {
      apiDelete.mockReturnValue(new Promise(() => {}));
      const user = await open();

      await user.press(removeRow());
      const confirms = screen.getAllByRole("button", {
        name: "Remove account",
      });
      const confirm = confirms[confirms.length - 1];
      await user.press(confirm);
      await fireEvent.press(confirm);

      expect(apiDelete).toHaveBeenCalledTimes(1);
    });

    it("stays signed in and shows the toast when the backend refuses", async () => {
      apiDelete.mockRejectedValue(new Error("boom"));
      const user = await open();

      await user.press(removeRow());
      const confirms = screen.getAllByRole("button", {
        name: "Remove account",
      });
      await user.press(confirms[confirms.length - 1]);

      expect(
        await screen.findByText("Something went wrong. Please try again."),
      ).toBeOnTheScreen();
      expect(screen.getByText("signed in as Ana Souza")).toBeOnTheScreen();
    });
  });

  describe("sign out", () => {
    it("opens the sheet, and Cancel keeps the session", async () => {
      const user = await open();

      await user.press(signOutRow());

      expect(screen.getByText("Sign out?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "To come back, just sign in again with the same account.",
        ),
      ).toBeOnTheScreen();

      const cancels = screen.getAllByRole("button", { name: "Cancel" });
      await user.press(cancels[cancels.length - 1]);

      expect(screen.getByText("signed in as Ana Souza")).toBeOnTheScreen();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("clears the session and tells the backend when confirmed", async () => {
      const user = await open();

      await user.press(signOutRow());
      const buttons = screen.getAllByRole("button", { name: "Sign out" });
      await user.press(buttons[buttons.length - 1]);

      expect(await screen.findByText("signed out")).toBeOnTheScreen();
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/sign-out");
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        refreshToken: "rt-1",
      });
    });
  });
});

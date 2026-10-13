import {
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";

import { routes } from "@/constants/routes";
import { useSession } from "@/providers/session";
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
const ROW_COUNT = 5;

const rowLabels = () =>
  screen
    .getAllByRole("button")
    .slice(0, ROW_COUNT)
    .map((button) => button.props.accessibilityLabel);

const signOutRow = () => screen.getAllByRole("button", { name: "Sign out" })[0];

describe("ProfileScreen", () => {
  beforeEach(() => {
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
      "School rules",
      "Cancellation rules",
      "Sign out",
    ]);
    expect(
      screen.getByRole("switch", { name: "Push notifications" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/Notifications always stay in the app/),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Remove/i)).toBeNull();
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

  it("says coming soon for the cancellation rules and stays on the profile", async () => {
    const user = await open();

    await user.press(
      screen.getByRole("button", { name: "Cancellation rules" }),
    );

    expect(await screen.findByText("Coming soon.")).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
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

      await user.press(screen.getByRole("button", { name: "Cancel" }));

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

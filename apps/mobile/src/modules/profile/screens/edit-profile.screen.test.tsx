import {
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";

import { useSession } from "@/providers/session";

import { NetworkError } from "@/services/api";

import {
  account,
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "../profile.test-utils";

import { EditProfileScreen } from "./edit-profile.screen";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.useFakeTimers();

const fetchMock = setupFetch();

function SessionName() {
  const { user } = useSession();

  return <Text>{`session name: ${user?.name}`}</Text>;
}

const open = async () => {
  seedSession();
  await renderWithProviders(
    <>
      <EditProfileScreen />
      <SessionName />
    </>,
  );
};

const nameField = () => screen.getByLabelText("Name");
const save = () => screen.getByRole("button", { name: "Save" });

describe("EditProfileScreen", () => {
  beforeEach(() => jest.mocked(router.back).mockClear());

  it("shows the avatar, the name, the read-only email and a disabled Save", async () => {
    await open();

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Change profile photo" }),
    ).toBeOnTheScreen();
    expect(nameField()).toHaveDisplayValue("Ana Souza");
    expect(screen.getByLabelText("Email")).toHaveDisplayValue(
      "ana@example.com",
    );
    expect(screen.getByLabelText("Email")).not.toBeEnabled();
    expect(screen.getByText("Your email can't be changed.")).toBeOnTheScreen();
    expect(save()).toBeDisabled();
  });

  it("enables Save for a new name, sends it trimmed, and goes back", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(200, account({ name: "Ana Clara Souza" })),
    );
    await open();

    await user.clear(nameField());
    await user.type(nameField(), "  Ana Clara Souza ");
    expect(save()).toBeEnabled();
    await user.press(save());

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(screen.getByText("session name: Ana Clara Souza")).toBeOnTheScreen();
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/me/name");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: "Ana Clara Souza",
    });
  });

  it("keeps Save disabled for the unchanged name and for a name the rules refuse", async () => {
    const user = userEvent.setup();
    await open();

    await user.clear(nameField());
    await user.type(nameField(), "  Ana Souza ");
    expect(save()).toBeDisabled();

    await user.clear(nameField());
    await user.type(nameField(), "A1");
    expect(save()).toBeDisabled();
  });

  it("shows the name error after leaving an invalid name", async () => {
    const user = userEvent.setup();
    await open();

    await user.clear(nameField());
    await user.type(nameField(), "A1");
    await fireEvent(nameField(), "blur");

    expect(
      await screen.findByText("Enter your first and last name."),
    ).toBeOnTheScreen();
  });

  it("shows the name toast on a 422 and stays on the screen", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(422, { errors: ["user.name.personName"] }),
    );
    await open();

    await user.clear(nameField());
    await user.type(nameField(), "Ana Clara");
    await user.press(save());

    expect(
      await screen.findByText("Enter your first and last name."),
    ).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("shows the no-connection toast", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new NetworkError());
    await open();

    await user.clear(nameField());
    await user.type(nameField(), "Ana Clara");
    await user.press(save());

    expect(
      await screen.findByText(
        "No connection. Check your internet and try again.",
      ),
    ).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("shows the generic toast for any other error", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(500, { errors: [] }));
    await open();

    await user.clear(nameField());
    await user.type(nameField(), "Ana Clara");
    await user.press(save());

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeOnTheScreen();
  });

  it("says coming soon when the camera button is pressed, and nothing else", async () => {
    const user = userEvent.setup();
    await open();

    await user.press(
      screen.getByRole("button", { name: "Change profile photo" }),
    );

    expect(await screen.findByText("Coming soon.")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

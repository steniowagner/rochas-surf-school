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

import { ProfileWhatsappScreen } from "./profile-whatsapp.screen";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.useFakeTimers();

const fetchMock = setupFetch();

function SessionVisibility() {
  const { user } = useSession();

  return <Text>{`visible: ${user?.whatsappVisible}`}</Text>;
}

const open = async (overrides = {}) => {
  seedSession(
    account({
      whatsappNumber: "+5585999990000",
      whatsappVisible: false,
      ...overrides,
    }),
  );
  await renderWithProviders(
    <>
      <ProfileWhatsappScreen />
      <SessionVisibility />
    </>,
  );

  return userEvent.setup();
};

const numberInput = () => screen.getByLabelText("WhatsApp number");
const save = () => screen.getByRole("button", { name: "Save" });
const hideSwitch = () => screen.getByRole("switch", { name: "Hide my number" });

describe("ProfileWhatsappScreen", () => {
  beforeEach(() => jest.mocked(router.back).mockClear());

  it("opens with the stored number and visibility, and Save disabled", async () => {
    await open();

    expect(screen.getByRole("header", { name: "WhatsApp" })).toBeOnTheScreen();
    expect(screen.getByText(/Admins always see your number/)).toBeOnTheScreen();
    expect(screen.getByText("BR +55")).toBeOnTheScreen();
    expect(numberInput().props.value).toBe("(85) 99999-0000");
    expect(hideSwitch().props.value).toBe(true);
    expect(save()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it("saves the new visibility, updates the session and goes back", async () => {
    const user = await open();
    fetchMock.mockResolvedValue(
      jsonResponse(
        200,
        account({ whatsappNumber: "+5585999990000", whatsappVisible: true }),
      ),
    );

    await fireEvent(hideSwitch(), "valueChange", false);
    await user.press(save());

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/me/whatsapp");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      whatsappNumber: "+5585999990000",
      whatsappVisible: true,
    });
    expect(screen.getByText("visible: true")).toBeOnTheScreen();
  });

  it("opens a number without an account number as an empty Brazilian form", async () => {
    await open({ whatsappNumber: null, whatsappVisible: false });

    expect(numberInput().props.value).toBe("");
    expect(save()).toBeDisabled();
  });

  it("shows the no-connection toast and stays", async () => {
    const user = await open();
    fetchMock.mockRejectedValue(new NetworkError());

    await fireEvent(hideSwitch(), "valueChange", false);
    await user.press(save());

    expect(
      await screen.findByText(
        "No connection. Check your internet and try again.",
      ),
    ).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("shows the invalid-number toast on the onboarding's error key", async () => {
    const user = await open();
    fetchMock.mockResolvedValue(
      jsonResponse(422, { errors: ["user.whatsappNumber.phone"] }),
    );

    await fireEvent(hideSwitch(), "valueChange", false);
    await user.press(save());

    expect(
      await screen.findAllByText("Invalid WhatsApp number."),
    ).not.toHaveLength(0);
  });
});

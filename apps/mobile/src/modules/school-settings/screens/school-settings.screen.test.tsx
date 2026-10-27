import {
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";

import {
  account,
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "@/modules/profile/profile.test-utils";

import { SchoolSettingsScreen } from "./school-settings.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the header's title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => <>{options.headerTitle()}</>,
  },
}));
jest.useFakeTimers();

const fetchMock = setupFetch();

const ON_TEXT =
  "In a full class, students can join the waiting list. If a seat opens, the request goes to you for approval.";
const OFF_TEXT =
  'Off — in a full class, students see "Class full" and can\'t ask for a seat.';

const open = async (
  settings = { whatsappNumber: "+5585999998888", waitingListEnabled: true },
) => {
  fetchMock.mockResolvedValue(jsonResponse(200, settings));
  seedSession(account({ role: "admin" }));
  await renderWithProviders(<SchoolSettingsScreen />);
  await screen.findByText("Waiting list");

  return userEvent.setup();
};

const saveButton = () => screen.getByRole("button", { name: "Save" });
const toggle = () =>
  screen.getByRole("switch", { name: "Waiting list for full classes" });
const turn = (value: boolean) => fireEvent(toggle(), "valueChange", value);
const numberField = () => screen.getByLabelText("School WhatsApp");

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can only load modules with require */
jest.mock("@/components/ui/toast", () =>
  require("@/components/ui/toast/toast.test-utils"),
);
/* eslint-enable @typescript-eslint/no-require-imports */

describe("SchoolSettingsScreen", () => {
  it("shows the loading indicator, and neither the form nor the error, before the settings arrive", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    seedSession(account({ role: "admin" }));

    await renderWithProviders(<SchoolSettingsScreen />);

    expect(screen.getByTestId("school-settings-loading")).toBeOnTheScreen();
    expect(screen.getByLabelText("Loading the settings")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "SCHOOL SETTINGS" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Waiting list")).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Try again")).not.toBeOnTheScreen();
  });

  it("shows both sections with the saved values and Save off", async () => {
    await open();

    expect(
      screen.getByRole("header", { name: "School settings" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Waiting list for full classes")).toBeOnTheScreen();
    expect(screen.getByText(ON_TEXT)).toBeOnTheScreen();
    expect(toggle().props.value).toBe(true);
    expect(screen.getByText("School WhatsApp")).toBeOnTheScreen();
    expect(
      screen.getByText(
        'This is the number behind the "Contact the school" button.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue("(85) 99999-8888")).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("describes the switch off and back on, turning Save on only while it differs", async () => {
    await open();

    await turn(false);

    expect(screen.getByText(OFF_TEXT)).toBeOnTheScreen();
    expect(saveButton()).toBeEnabled();

    await turn(true);

    expect(screen.getByText(ON_TEXT)).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("saves only the switch, shows the toast and stays on the screen", async () => {
    const user = await open();
    await turn(false);
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        whatsappNumber: "+5585999998888",
        waitingListEnabled: false,
      }),
    );

    await user.press(saveButton());

    expect(await screen.findByText("Settings saved")).toBeOnTheScreen();
    expect(screen.getByText("tone:success")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://api.test/school-settings/waiting-list",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer at-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: false }),
      },
    );
    expect(saveButton()).toBeDisabled();
    expect(screen.getByText(OFF_TEXT)).toBeOnTheScreen();
  });

  it("saves only the number when just it changed", async () => {
    const user = await open();
    await user.clear(numberField());
    await user.type(numberField(), "85988887777");
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        whatsappNumber: "+5585988887777",
        waitingListEnabled: true,
      }),
    );

    await user.press(saveButton());

    expect(await screen.findByText("Settings saved")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://api.test/school-settings/whatsapp",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer at-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ whatsappNumber: "+5585988887777" }),
      },
    );
  });

  it("saves the switch and the number, one request each", async () => {
    const user = await open();
    await turn(false);
    await user.clear(numberField());
    await user.type(numberField(), "85988887777");
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        whatsappNumber: "+5585988887777",
        waitingListEnabled: false,
      }),
    );

    await user.press(saveButton());

    expect(await screen.findByText("Settings saved")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.slice(1).map(([url]) => url)).toEqual([
      "http://api.test/school-settings/waiting-list",
      "http://api.test/school-settings/whatsapp",
    ]);
  });

  it("keeps Save off for an invalid number and shows the field's error", async () => {
    const user = await open();

    await user.clear(numberField());
    await user.type(numberField(), "123");
    await turn(false);
    await fireEvent(numberField(), "blur");

    expect(
      await screen.findByText("Invalid WhatsApp number."),
    ).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("starts with an empty field and Brazil when the school has no number", async () => {
    await open({ whatsappNumber: null as never, waitingListEnabled: true });

    expect(screen.getByText("BR +55")).toBeOnTheScreen();
    expect(numberField().props.value).toBe("");
    expect(saveButton()).toBeDisabled();
  });

  it("sets the first number of a school that has none", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { whatsappNumber: null, waitingListEnabled: true }),
    );
    seedSession(account({ role: "admin" }));
    await renderWithProviders(<SchoolSettingsScreen />);
    const user = userEvent.setup();
    await screen.findByText("Waiting list");

    await user.type(numberField(), "85988887777");

    expect(saveButton()).toBeEnabled();
  });

  it("treats an emptied field as no change to the number", async () => {
    const user = await open();

    await user.clear(numberField());

    expect(saveButton()).toBeDisabled();
  });

  it("keeps the edits and shows a toast when the save fails", async () => {
    const user = await open();
    await turn(false);
    fetchMock.mockResolvedValue(jsonResponse(500, { errors: [] }));

    await user.press(saveButton());

    expect(
      await screen.findByText("Something went wrong. Please try again."),
    ).toBeOnTheScreen();
    expect(screen.getByText(OFF_TEXT)).toBeOnTheScreen();
    expect(saveButton()).toBeEnabled();
  });

  it("shows the error with Try again, which reloads", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { errors: [] }));
    seedSession(account({ role: "admin" }));
    await renderWithProviders(<SchoolSettingsScreen />);
    const user = userEvent.setup();

    expect(
      await screen.findByText("Couldn't load the settings"),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "SCHOOL SETTINGS" }),
    ).toBeOnTheScreen();
    fetchMock.mockResolvedValue(
      jsonResponse(200, { whatsappNumber: null, waitingListEnabled: false }),
    );
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText(OFF_TEXT)).toBeOnTheScreen();
  });

  it("does not save from the keyboard's done key when nothing changed", async () => {
    await open();

    await fireEvent(numberField(), "submitEditing");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("saves from the keyboard's done key, and only once while it is saving", async () => {
    await open();
    await turn(false);
    fetchMock.mockReturnValue(new Promise(() => undefined));

    await fireEvent(numberField(), "submitEditing");
    await fireEvent(numberField(), "submitEditing");

    await waitFor(() => expect(saveButton()).toBeDisabled());
    await fireEvent(numberField(), "submitEditing");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";

import { buildPerson } from "../../people.test-utils";

import { PersonSheet } from "./person-sheet.component";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const shared = buildPerson(1, {
  name: "João Pinto",
  role: "instructor",
  whatsappNumber: "+5585999998888",
});

describe("PersonSheet", () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    mockShow.mockReset();
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => openURL.mockRestore());

  it("shows the person and the WhatsApp row with the formatted number", async () => {
    await render(<PersonSheet person={shared} visible onClose={jest.fn()} />);

    expect(screen.getByText("JP")).toBeOnTheScreen();
    expect(screen.getByText("João Pinto")).toBeOnTheScreen();
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
    expect(screen.getByText("+55 85 99999 8888")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
  });

  it("opens the chat on WhatsApp", async () => {
    const user = userEvent.setup();
    await render(<PersonSheet person={shared} visible onClose={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Chat on WhatsApp" }));

    expect(openURL).toHaveBeenCalledWith("https://wa.me/5585999998888");
  });

  it("shows a toast when WhatsApp can't be opened", async () => {
    openURL.mockRejectedValue(new Error("no app"));
    const user = userEvent.setup();
    await render(<PersonSheet person={shared} visible onClose={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Chat on WhatsApp" }));

    expect(mockShow).toHaveBeenCalledWith("Couldn't open WhatsApp.");
  });

  it("shows a disabled WhatsApp row saying the number isn't shared, and a filled Close button", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(
      <PersonSheet person={buildPerson(2, { whatsappNumber: null })} visible onClose={onClose} />,
    );

    expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
    expect(screen.getByText("Number not shared.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Chat on WhatsApp" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });

  it("shows a number that can't be parsed as sent", async () => {
    await render(
      <PersonSheet person={buildPerson(3, { whatsappNumber: "12345" })} visible onClose={jest.fn()} />,
    );

    expect(screen.getByText("12345")).toBeOnTheScreen();
  });

  it("closes with the Close button", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<PersonSheet person={shared} visible onClose={onClose} />);

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders no content without a person", async () => {
    await render(<PersonSheet person={null} visible={false} onClose={jest.fn()} />);

    expect(screen.queryByText("Close")).not.toBeOnTheScreen();
  });
});

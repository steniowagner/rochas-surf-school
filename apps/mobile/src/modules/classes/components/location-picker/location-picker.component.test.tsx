import { render, screen, userEvent } from "@testing-library/react-native";

import { buildLocation } from "../../classes.test-utils";

import { LocationPicker } from "./location-picker.component";

const locations = [
  buildLocation({ id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 5000" }),
  buildLocation({ id: "l-2", name: "Praia de Iracema", address: "Rua dos Tabajaras, 1" }),
];

const props = {
  locations,
  selectedId: null,
  managing: false,
  onSelect: jest.fn(),
  onEditPress: jest.fn(),
  onAddPress: jest.fn(),
};

describe("LocationPicker", () => {
  it("shows each location with its name and address, none selected", async () => {
    await render(<LocationPicker {...props} />);

    expect(screen.getByText("Praia do Futuro")).toBeTruthy();
    expect(screen.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).not.toBeChecked();
  });

  it("marks the selected location and reports a tap on another", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<LocationPicker {...props} selectedId="l-2" onSelect={onSelect} />);

    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toBeChecked();

    await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));

    expect(onSelect).toHaveBeenCalledWith("l-1");
  });

  it("offers only the add button when nothing is saved yet", async () => {
    const onAddPress = jest.fn();
    const user = userEvent.setup();
    await render(<LocationPicker {...props} locations={[]} onAddPress={onAddPress} />);

    expect(screen.queryByRole("radio")).toBeNull();

    await user.press(screen.getByRole("button", { name: "New location" }));

    expect(onAddPress).toHaveBeenCalled();
  });

  it("(manage) opens a row to edit it instead of choosing it, and hides 'New location'", async () => {
    const onSelect = jest.fn();
    const onEditPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <LocationPicker {...props} managing selectedId="l-2" onSelect={onSelect} onEditPress={onEditPress} />,
    );

    await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));

    expect(onEditPress).toHaveBeenCalledWith(locations[0]);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "New location" })).toBeNull();
  });

  it("shows a location removed since the class was saved with the 'Removed' chip, selected", async () => {
    const removed = { ...locations[1], archived: true };
    await render(<LocationPicker {...props} locations={[locations[0], removed]} selectedId="l-2" />);

    expect(screen.getAllByText("Removed")).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toBeChecked();
  });

  it("(manage) does not open a removed location to edit it", async () => {
    const onEditPress = jest.fn();
    const removed = { ...locations[1], archived: true };
    await render(<LocationPicker {...props} managing locations={[removed]} onEditPress={onEditPress} />);

    await userEvent.setup().press(screen.getByRole("radio", { name: "Praia de Iracema" }));

    expect(onEditPress).not.toHaveBeenCalled();
  });
});

import { render, screen, userEvent } from "@testing-library/react-native";

import { LocationPicker } from "./location-picker.component";

const locations = [
  { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 5000" },
  { id: "l-2", name: "Praia de Iracema", address: "Rua dos Tabajaras, 1" },
];

describe("LocationPicker", () => {
  it("shows each location with its name and address, none selected", async () => {
    await render(
      <LocationPicker locations={locations} selectedId={null} onSelect={jest.fn()} onAddPress={jest.fn()} />,
    );

    expect(screen.getByText("Praia do Futuro")).toBeTruthy();
    expect(screen.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Praia do Futuro" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).not.toBeChecked();
  });

  it("marks the selected location and reports a tap on another", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(
      <LocationPicker locations={locations} selectedId="l-2" onSelect={onSelect} onAddPress={jest.fn()} />,
    );

    expect(screen.getByRole("radio", { name: "Praia de Iracema" })).toBeChecked();

    await user.press(screen.getByRole("radio", { name: "Praia do Futuro" }));

    expect(onSelect).toHaveBeenCalledWith("l-1");
  });

  it("offers only the add button when nothing is saved yet", async () => {
    const onAddPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <LocationPicker locations={[]} selectedId={null} onSelect={jest.fn()} onAddPress={onAddPress} />,
    );

    expect(screen.queryByRole("radio")).toBeNull();

    await user.press(screen.getByRole("button", { name: "New location" }));

    expect(onAddPress).toHaveBeenCalled();
  });
});

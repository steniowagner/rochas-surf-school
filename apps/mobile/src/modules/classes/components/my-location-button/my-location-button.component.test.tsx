import { fireEvent, render, screen } from "@testing-library/react-native";

import { StyleSheet } from "react-native";

import i18n from "@/i18n";

import { MyLocationButton } from "./my-location-button.component";

describe("MyLocationButton", () => {
  it("is a button named for what it does, raised over the map", async () => {
    await render(<MyLocationButton onPress={jest.fn()} />);

    const button = screen.getByRole("button", { name: "My location" });

    expect(StyleSheet.flatten(button.props.style).boxShadow).toBe(
      "0 2px 8px rgba(61,46,31,.10)",
    );
  });

  it("is named in Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(<MyLocationButton onPress={jest.fn()} />);

    expect(
      screen.getByRole("button", { name: "Minha localização" }),
    ).toBeTruthy();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(<MyLocationButton onPress={onPress} />);

    await fireEvent.press(screen.getByRole("button", { name: "My location" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

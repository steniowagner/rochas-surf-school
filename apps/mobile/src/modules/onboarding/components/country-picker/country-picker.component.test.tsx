import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { CountryPicker } from "./country-picker.component";

jest.useFakeTimers();

// The sheet itself is covered by BottomModal's tests: here it shows its content and exposes `onClose`.
/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can only load modules with require */
jest.mock("@/components/ui/bottom-modal", () => {
  const { Pressable } = require("react-native");

  return {
    BottomModal: ({ children, onClose }: any) => (
      <>
        <Pressable accessibilityLabel="backdrop" onPress={onClose} />
        {children}
      </>
    ),
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

const renderPicker = async () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  await render(<CountryPicker visible onClose={onClose} onSelect={onSelect} />);

  return { onSelect, onClose, user: userEvent.setup() };
};

const search = (placeholder = "Search country") =>
  screen.getByPlaceholderText(placeholder);

describe("CountryPicker", () => {
  it("shows the title, the search field and the countries in name order", async () => {
    await renderPicker();

    expect(screen.getByRole("header", { name: "Country" })).toBeOnTheScreen();
    expect(search()).toBeOnTheScreen();
    // The list renders its first rows: names come sorted, with their dial codes.
    expect(
      screen.getByRole("button", { name: "Afghanistan +93" }),
    ).toBeOnTheScreen();
  });

  it.each([
    ["en-US", "Country", "Search country", "Spain", "Spain +34"],
    ["pt-BR", "País", "Buscar país", "Espanha", "Espanha +34"],
    ["es-ES", "País", "Buscar país", "España", "España +34"],
  ])(
    "lists the names in %s",
    async (language, title, placeholder, query, name) => {
      await i18n.changeLanguage(language);
      const { user } = await renderPicker();

      await user.type(search(placeholder), query);

      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name })).toBeOnTheScreen();
    },
  );

  it("filters by name", async () => {
    const { user } = await renderPicker();

    await user.type(search(), "portu");

    expect(
      screen.getByRole("button", { name: "Portugal +351" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Afghanistan +93" })).toBeNull();
  });

  it("filters without regard to case or accents", async () => {
    await i18n.changeLanguage("es-ES");
    const { user } = await renderPicker();

    await user.type(search("Buscar país"), "ESPANA");

    expect(screen.getByRole("button", { name: "España +34" })).toBeOnTheScreen();
  });

  it("shows an empty list when nothing matches", async () => {
    const { user } = await renderPicker();

    await user.type(search(), "zzzz");

    expect(screen.queryByRole("button", { name: /\+\d+$/ })).toBeNull();
  });

  it("returns the picked country, closes and clears the search", async () => {
    const { user, onSelect, onClose } = await renderPicker();
    await user.type(search(), "portu");

    await user.press(screen.getByRole("button", { name: "Portugal +351" }));

    expect(onSelect).toHaveBeenCalledWith("PT");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(search().props.value).toBe("");
  });

  it("clears the search and reports the close when dismissed", async () => {
    const { user, onClose, onSelect } = await renderPicker();
    await user.type(search(), "portu");

    await user.press(screen.getByLabelText("backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(search().props.value).toBe("");
  });
});

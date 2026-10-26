import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";

import { AddressSearchField } from "./address-search-field.component";

const suggestions = [
  { placeId: "p1", title: "Praia do Futuro", description: "Fortaleza - CE" },
  { placeId: "p2", title: "Praia de Iracema", description: "Fortaleza - CE" },
];

const input = () => screen.getByLabelText("Address");

async function renderField(
  overrides: Partial<React.ComponentProps<typeof AddressSearchField>> = {},
) {
  const props = {
    value: "",
    onChangeText: jest.fn(),
    maxLength: 200,
    suggestions,
    onPick: jest.fn(),
    ...overrides,
  };

  await render(<AddressSearchField {...props} />);

  return { props };
}

describe("AddressSearchField", () => {
  it("shows the search placeholder, the limit and reports typing", async () => {
    const { props } = await renderField();

    await userEvent.setup().type(input(), "pra");

    expect(input().props.placeholder).toBe("Search for an address or a beach");
    expect(input().props.maxLength).toBe(200);
    expect(props.onChangeText).toHaveBeenCalled();
  });

  it("shows the suggestions only while the field is focused", async () => {
    await renderField();

    expect(screen.queryByText("Praia do Futuro")).toBeNull();

    await fireEvent(input(), "focus");

    expect(screen.getByText("Praia do Futuro")).toBeTruthy();
    expect(screen.getByText("Praia de Iracema")).toBeTruthy();

    await fireEvent(input(), "blur");

    expect(screen.queryByText("Praia do Futuro")).toBeNull();
  });

  it("shows no rows without suggestions", async () => {
    await renderField({ suggestions: [] });

    await fireEvent(input(), "focus");

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("reports the suggestion that was picked", async () => {
    const { props } = await renderField();
    await fireEvent(input(), "focus");

    await userEvent.setup().press(
      screen.getByRole("button", {
        name: "Praia de Iracema, Fortaleza - CE",
      }),
    );

    expect(props.onPick).toHaveBeenCalledWith(suggestions[1]);
  });
});

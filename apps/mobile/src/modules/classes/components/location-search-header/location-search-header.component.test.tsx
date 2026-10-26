import {
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react-native";

import { Dimensions, Platform, StyleSheet } from "react-native";

import { useAddressSuggestions } from "../../hooks/use-address-suggestions.hook";

import { LocationSearchHeader } from "./location-search-header.component";

jest.mock("expo-router", () => ({
  Stack: {
    // Renders the header's title, so the tests can reach the field the component puts there.
    Screen: jest.fn(
      ({ options }: { options: { headerTitle?: () => unknown } }) =>
        options.headerTitle?.() ?? null,
    ),
  },
}));

jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: jest.fn(() => 100),
}));

jest.mock("../../hooks/use-address-suggestions.hook", () => ({
  SUGGESTIONS_MIN_LENGTH: 3,
  useAddressSuggestions: jest.fn(),
}));

const mockSuggestions = jest.mocked(useAddressSuggestions);

const suggestion = (index: number) => ({
  placeId: `p-${index}`,
  title: `Praia ${index}`,
  description: `Fortaleza ${index}`,
});

const answer = (count: number) =>
  mockSuggestions.mockReturnValue({
    data: { items: Array.from({ length: count }, (_, i) => suggestion(i + 1)) },
  } as never);

const onPick = jest.fn();

const renderHeader = () =>
  render(<LocationSearchHeader sessionToken="tok-1" onPick={onPick} />);

const field = () => screen.getByLabelText("Search for an address or a beach");

beforeEach(() => {
  onPick.mockReset();
  answer(2);
});

const fieldWidth = () =>
  StyleSheet.flatten(screen.getByTestId("location-search-field").props.style)
    .width;

describe("LocationSearchHeader", () => {
  it("sizes the field to the header beside the back button, on iOS and on Android", async () => {
    const { width } = Dimensions.get("window");

    await renderHeader();
    expect(fieldWidth()).toBe(width - 84);

    Platform.OS = "android";
    try {
      await renderHeader();
      expect(fieldWidth()).toBe(width - 88);
    } finally {
      Platform.OS = "ios";
    }
  });

  it("puts the search field in the header with its placeholder and no suggestions", async () => {
    await renderHeader();

    expect(field().props.placeholder).toBe("Search for an address or a beach");
    expect(screen.queryByTestId("location-suggestions")).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("asks for suggestions with what was typed and the screen's session token", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "praia");

    expect(mockSuggestions).toHaveBeenLastCalledWith("praia", "tok-1");
  });

  it("shows the suggestions under the header for 3 or more characters", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "pra");

    const list = screen.getByTestId("location-suggestions");

    expect(list.props.style).toEqual(expect.arrayContaining([{ top: 108 }]));
    expect(
      within(list)
        .getAllByRole("button")
        .map((row) => row.props.accessibilityLabel),
    ).toEqual(["Praia 1, Fortaleza 1", "Praia 2, Fortaleza 2"]);
  });

  it("shows at most 6 suggestions when the API answers more", async () => {
    answer(7);
    await renderHeader();
    await fireEvent.changeText(field(), "praia");

    expect(
      within(screen.getByTestId("location-suggestions")).getAllByRole("button"),
    ).toHaveLength(6);
    expect(screen.queryByLabelText("Praia 7, Fortaleza 7")).toBeNull();
  });

  it("shows no suggestions under 3 characters, even with rows of an older text", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "pr ");

    expect(screen.queryByTestId("location-suggestions")).toBeNull();
  });

  it("shows nothing while the suggestions haven't come", async () => {
    mockSuggestions.mockReturnValue({ data: undefined } as never);
    await renderHeader();
    await fireEvent.changeText(field(), "praia");

    expect(screen.queryByTestId("location-suggestions")).toBeNull();
  });

  it("bolds the part of the title that matches what was typed, ignoring case", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "AIA 1");

    const row = screen.getByLabelText("Praia 1, Fortaleza 1");
    const bold = within(row).getByText("aia 1");

    expect(bold.props.className).toContain("font-body-800");
    expect(within(row).getByText("Praia 1", { exact: false })).toBeTruthy();
  });

  it("leaves the title whole when nothing in it matches", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "futuro");

    expect(
      within(screen.getByLabelText("Praia 1, Fortaleza 1")).getByText(
        "Praia 1",
      ),
    ).toBeTruthy();
  });

  it("hands a picked suggestion to the screen, puts its title in the field and closes the list", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "praia");
    await fireEvent.press(screen.getByLabelText("Praia 2, Fortaleza 2"));

    expect(onPick).toHaveBeenCalledWith(suggestion(2));
    expect(field().props.value).toBe("Praia 2");
    expect(screen.queryByTestId("location-suggestions")).toBeNull();
  });

  it("opens the list again when the admin types after a pick", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "praia");
    await fireEvent.press(screen.getByLabelText("Praia 1, Fortaleza 1"));
    await fireEvent.changeText(field(), "praia d");

    expect(screen.getByTestId("location-suggestions")).toBeTruthy();
  });

  it("clears the field and closes the list with the clear button", async () => {
    await renderHeader();
    await fireEvent.changeText(field(), "praia");
    await fireEvent.press(screen.getByRole("button", { name: "Clear" }));

    expect(field().props.value).toBe("");
    expect(screen.queryByTestId("location-suggestions")).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });
});

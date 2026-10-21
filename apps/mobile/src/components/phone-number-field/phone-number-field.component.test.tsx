import {
  act,
  render,
  renderHook,
  screen,
  userEvent,
} from "@testing-library/react-native";

import { PhoneNumberField } from "./phone-number-field.component";
import { usePhoneNumberField } from "./phone-number-field.hook";

jest.useFakeTimers();

// The picker itself is covered by its own tests: here it shows a country to choose when visible.
/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can only load modules with require */
jest.mock("@/components/country-picker", () => {
  const { Pressable, Text } = require("react-native");

  return {
    CountryPicker: ({ visible, onSelect, onClose }: any) =>
      visible ? (
        <Pressable
          accessibilityLabel="pick Portugal"
          onPress={() => {
            onSelect("PT");
            onClose();
          }}
        >
          <Text>Picker</Text>
        </Pressable>
      ) : null,
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

const onSubmitEditing = jest.fn();

function Harness({ initialNumber }: { initialNumber?: string | null }) {
  const phone = usePhoneNumberField({ initialNumber });

  return (
    <PhoneNumberField
      country={phone.country}
      dialCode={phone.dialCode}
      numberInput={phone.numberInput}
      onSelectCountry={phone.onSelectCountry}
      label="WhatsApp"
      onSubmitEditing={onSubmitEditing}
    />
  );
}

const input = () => screen.getByLabelText("WhatsApp");

describe("PhoneNumberField", () => {
  it("starts with Brazil and an empty field", async () => {
    await render(<Harness />);

    expect(screen.getByText("BR +55")).toBeOnTheScreen();
    expect(input().props.value).toBe("");
  });

  it("masks a Brazilian number as it is typed", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.type(input(), "85999990000");

    expect(input().props.value).toBe("(85) 99999-0000");
  });

  it("shows the error of an invalid number once the field is left", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.type(input(), "123");
    await act(async () => input().props.onBlur());

    expect(screen.getByText("Invalid WhatsApp number.")).toBeOnTheScreen();
  });

  it("changes the country through the picker and keeps the typed digits as they are", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByText("BR +55"));
    await user.press(screen.getByLabelText("pick Portugal"));
    await user.type(input(), "912345678");

    expect(screen.getByText("PT +351")).toBeOnTheScreen();
    expect(screen.queryByText("Picker")).toBeNull();
    expect(input().props.value).toBe("912345678");
  });

  it("opens with a stored number split into its country and the rest", async () => {
    await render(<Harness initialNumber="+351912345678" />);

    expect(screen.getByText("PT +351")).toBeOnTheScreen();
    expect(input().props.value).toBe("912345678");
  });

  it("exposes the E.164 number and its validity", async () => {
    const { result } = await renderHook(() =>
      usePhoneNumberField({ initialNumber: "+5585999990000" }),
    );

    expect(result.current.whatsappNumber).toBe("+5585999990000");
    expect(result.current.isNumberValid).toBe(true);

    const empty = await renderHook(() => usePhoneNumberField());
    expect(empty.result.current.whatsappNumber).toBe("");
    expect(empty.result.current.isNumberValid).toBe(false);
  });

  it("submits from the keyboard", async () => {
    await render(<Harness />);

    await act(async () => input().props.onSubmitEditing());

    expect(onSubmitEditing).toHaveBeenCalled();
  });
});

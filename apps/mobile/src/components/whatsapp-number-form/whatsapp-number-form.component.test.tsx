import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Text } from "react-native";

import { WhatsappNumberForm } from "./whatsapp-number-form.component";
import { WhatsappNumberFormProps } from "./whatsapp-number-form.types";

const onSubmit = jest.fn();

const renderForm = async (props: Partial<WhatsappNumberFormProps> = {}) => {
  await render(
    <WhatsappNumberForm
      header={<Text>Header</Text>}
      submitLabel="Save"
      isSaving={false}
      onSubmit={onSubmit}
      {...props}
    />,
  );

  return userEvent.setup();
};

const numberInput = () => screen.getByLabelText("WhatsApp number");
const save = () => screen.getByRole("button", { name: "Save" });
const hideSwitch = () => screen.getByRole("switch", { name: "Hide my number" });

describe("WhatsappNumberForm", () => {
  beforeEach(() => onSubmit.mockReset());

  it("starts with Brazil, an empty field and the number hidden", async () => {
    await renderForm();

    expect(screen.getByText("Header")).toBeOnTheScreen();
    expect(screen.getByText("BR +55")).toBeOnTheScreen();
    expect(numberInput().props.value).toBe("");
    expect(hideSwitch().props.value).toBe(true);
    expect(save()).toBeDisabled();
  });

  it("opens with a stored Brazilian number masked and its visibility", async () => {
    await renderForm({
      initialNumber: "+5585999990000",
      initialVisible: false,
      requireChange: true,
    });

    expect(screen.getByText("BR +55")).toBeOnTheScreen();
    expect(numberInput().props.value).toBe("(85) 99999-0000");
    expect(hideSwitch().props.value).toBe(true);
    expect(save()).toBeDisabled();
  });

  it("opens with another country and the number without its code", async () => {
    await renderForm({
      initialNumber: "+351912345678",
      initialVisible: true,
      requireChange: true,
    });

    expect(screen.getByText("PT +351")).toBeOnTheScreen();
    expect(numberInput().props.value).toBe("912345678");
    expect(hideSwitch().props.value).toBe(false);
  });

  it("enables Save when only the switch changes, and sends both values", async () => {
    const user = await renderForm({
      initialNumber: "+5585999990000",
      initialVisible: false,
      requireChange: true,
    });

    await fireEvent(hideSwitch(), "valueChange", false);
    expect(save()).toBeEnabled();
    await user.press(save());

    expect(onSubmit).toHaveBeenCalledWith({
      whatsappNumber: "+5585999990000",
      whatsappVisible: true,
    });
  });

  it("enables Save when only the number changes, and disables it again when restored", async () => {
    const user = await renderForm({
      initialNumber: "+5585999990000",
      initialVisible: false,
      requireChange: true,
    });

    await user.clear(numberInput());
    await user.type(numberInput(), "85 99999-1111");
    expect(save()).toBeEnabled();

    await user.clear(numberInput());
    await user.type(numberInput(), "85 99999-0000");
    expect(save()).toBeDisabled();
  });

  it("keeps Save disabled while the number is invalid, even if changed", async () => {
    const user = await renderForm({
      initialNumber: "+5585999990000",
      initialVisible: false,
      requireChange: true,
    });

    await user.clear(numberInput());
    await user.type(numberInput(), "123");

    expect(save()).toBeDisabled();
  });

  it("ignores a submit while saving", async () => {
    await renderForm({ initialNumber: "+5585999990000", isSaving: true });

    await fireEvent(numberInput(), "submitEditing");

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

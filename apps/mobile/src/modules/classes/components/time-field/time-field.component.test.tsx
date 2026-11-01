import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Platform } from "react-native";

import { TimeField } from "./time-field.component";

const at = (hours: number, minutes = 0) => new Date(2000, 0, 1, hours, minutes);

const renderField = async () => {
  const onChange = jest.fn();

  await render(
    <TimeField
      testID="start"
      label="Start"
      value={at(12)}
      onChange={onChange}
    />,
  );

  return { onChange, user: userEvent.setup() };
};

describe("TimeField", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  describe("on iOS", () => {
    beforeEach(() => {
      Platform.OS = "ios";
    });

    it("shows the wheels in place", async () => {
      await renderField();

      expect(screen.getByTestId("start").props.value).toEqual(at(12));
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  describe("on Android", () => {
    beforeEach(() => {
      Platform.OS = "android";
    });

    it("shows the time and keeps the dialog closed", async () => {
      await renderField();

      expect(
        screen.getByRole("button", { name: "Start: 12:00" }),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId("start-dialog")).toBeNull();
    });

    it("opens the dialog at the current time", async () => {
      const { user } = await renderField();

      await user.press(screen.getByRole("button", { name: "Start: 12:00" }));

      expect(screen.getByTestId("start-dialog").props.value).toEqual(at(12));
    });

    it("closes the dialog with the time picked on OK", async () => {
      const { onChange, user } = await renderField();
      await user.press(screen.getByRole("button", { name: "Start: 12:00" }));

      await fireEvent(
        screen.getByTestId("start-dialog"),
        "valueChange",
        {},
        at(8, 5),
      );

      expect(onChange).toHaveBeenCalledWith({}, at(8, 5));
      expect(screen.queryByTestId("start-dialog")).toBeNull();
    });

    it("closes the dialog without a change on Cancel", async () => {
      const { onChange, user } = await renderField();
      await user.press(screen.getByRole("button", { name: "Start: 12:00" }));

      await act(async () => {
        screen.getByTestId("start-dialog").props.onDismiss();
      });

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByTestId("start-dialog")).toBeNull();
    });
  });
});

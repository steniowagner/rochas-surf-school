import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { BottomModal } from "./bottom-modal.component";

const mockExpand = jest.fn();
const mockForceClose = jest.fn();

// Unlike the global mock, this one renders the backdrop and exposes the sheet methods.
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("@gorhom/bottom-sheet", () => {
  const { useImperativeHandle } = require("react");
  const { Pressable, View } = require("react-native");

  return {
    __esModule: true,
    default: function MockBottomSheet({
      ref,
      backdropComponent,
      children,
    }: any) {
      useImperativeHandle(ref, () => ({
        expand: mockExpand,
        forceClose: mockForceClose,
      }));

      return (
        <View>
          {backdropComponent({ style: {} })}
          {children}
        </View>
      );
    },
    BottomSheetView: View,
    BottomSheetBackdrop: ({ onPress }: any) => (
      <Pressable accessibilityLabel="backdrop" onPress={onPress} />
    ),
  };
});

/* eslint-enable @typescript-eslint/no-require-imports */

jest.mock("@/hooks/use-color-scheme", () => ({
  useColorScheme: jest.fn(() => "light"),
}));

// `vars()` resolves to nothing under Jest, so the palettes are replaced by distinguishable styles.
jest.mock("@/constants/theme-variables", () => ({
  themeVariables: { light: { opacity: 0.5 }, dark: { opacity: 0.6 } },
}));

describe("BottomModal", () => {
  beforeEach(() => {
    mockExpand.mockClear();
    mockForceClose.mockClear();
  });

  it("shows its content and expands when visible", async () => {
    await render(
      <BottomModal visible onClose={jest.fn()}>
        <Text>Content</Text>
      </BottomModal>,
    );

    expect(screen.getByText("Content")).toBeOnTheScreen();
    expect(mockExpand).toHaveBeenCalledTimes(1);
  });

  it.each(["light", "dark"] as const)(
    "sets the %s palette variables on its content",
    async (scheme) => {
      jest.mocked(useColorScheme).mockReturnValue(scheme);
      await render(
        <BottomModal visible onClose={jest.fn()}>
          <Text>Content</Text>
        </BottomModal>,
      );

      const wrapper = screen.getByText("Content").parent;

      expect(wrapper?.props.style).toEqual({
        opacity: scheme === "dark" ? 0.6 : 0.5,
      });
    },
  );

  it("closes the sheet when it is not visible", async () => {
    await render(
      <BottomModal visible={false} onClose={jest.fn()}>
        <Text>Content</Text>
      </BottomModal>,
    );

    expect(mockForceClose).toHaveBeenCalledTimes(1);
    expect(mockExpand).not.toHaveBeenCalled();
  });

  it("calls onClose when the backdrop is pressed", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(
      <BottomModal visible onClose={onClose}>
        <Text>Content</Text>
      </BottomModal>,
    );

    await user.press(screen.getByLabelText("backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

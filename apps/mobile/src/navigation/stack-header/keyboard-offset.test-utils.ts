import { KeyboardAvoidingView } from "react-native";

/** Renders `ui` with a `KeyboardAvoidingView` that only records the `keyboardVerticalOffset` it was given. */
export const keyboardOffsetOf = async (
  ui: () => Promise<unknown>,
): Promise<unknown> => {
  const offsets: unknown[] = [];
  const render = jest
    .spyOn(KeyboardAvoidingView.prototype, "render")
    .mockImplementation(function (this: KeyboardAvoidingView) {
      offsets.push(this.props.keyboardVerticalOffset);

      return null;
    });

  await ui();
  render.mockRestore();

  return offsets[0];
};

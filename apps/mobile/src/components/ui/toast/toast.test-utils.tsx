// Test double for `@/components/ui/toast`: renders the real toast plus a `tone:<tone>` text, because
// NativeWind compiles the tone's classes away in tests. Use it as `jest.mock("@/components/ui/toast", () =>
// require("@/components/ui/toast/toast.test-utils"))`.
import { Fragment } from "react";
import { Text } from "react-native";

const { Toast: RealToast } = jest.requireActual("@/components/ui/toast");

export function Toast(props: { tone?: string }) {
  return (
    <Fragment>
      <Text>{`tone:${props.tone}`}</Text>
      <RealToast {...props} />
    </Fragment>
  );
}

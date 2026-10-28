import { screen } from "@testing-library/react-native";

/** The labels of the tab bar, left to right. */
export const tabLabels = () =>
  screen.getAllByRole("tab").map((tab) => tab.props.accessibilityLabel);

/** The label of the selected tab. */
export const selectedTabLabel = () =>
  screen
    .getAllByRole("tab")
    .find((tab) => tab.props.accessibilityState?.selected)?.props
    .accessibilityLabel;

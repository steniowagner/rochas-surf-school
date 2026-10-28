export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** A second line under the label, stacked with it beside the box. */
  helper?: string;
  /** `boxed`: inside a box with the ink-2 fill and the buttons' radius, its text in the page color. */
  variant?: "plain" | "boxed";
  disabled?: boolean;
};

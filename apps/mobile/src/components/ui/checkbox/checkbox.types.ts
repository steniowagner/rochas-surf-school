export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** A second line under the label, stacked with it beside the box. */
  helper?: string;
  /** `ink`: inside a box with the ink fill and the buttons' radius, its text in the page color. */
  variant?: "plain" | "ink";
  disabled?: boolean;
};

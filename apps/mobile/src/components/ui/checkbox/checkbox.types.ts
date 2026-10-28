export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** A second line under the label, stacked with it beside the box. */
  helper?: string;
  /** `boxed`: inside a box with the subtle button's fill (`dim`) and the buttons' radius. */
  variant?: "plain" | "boxed";
  disabled?: boolean;
};

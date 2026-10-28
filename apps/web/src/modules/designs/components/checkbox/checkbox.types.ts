export type CheckboxProps = {
  checked: boolean;
  label: string;
  /** A second line under the label. */
  helper?: string;
  variant?: "plain" | "boxed";
  disabled?: boolean;
};

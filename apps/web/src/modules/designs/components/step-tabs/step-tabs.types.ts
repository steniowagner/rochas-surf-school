export type StepTab = {
  key: string;
  label: string;
  value: string;
  /** Shows a check instead of the step number. */
  done: boolean;
  disabled?: boolean;
};

export type StepTabsProps = {
  steps: StepTab[];
  selected: string;
};

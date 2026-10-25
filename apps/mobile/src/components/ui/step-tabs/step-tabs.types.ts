export type StepTab<T extends string> = {
  key: T;
  label: string;
  value: string;
  /** Shows a check instead of the step number. */
  done: boolean;
  /** Dimmed; ignores presses. */
  disabled?: boolean;
};

export type StepTabsProps<T extends string> = {
  steps: StepTab<T>[];
  selected: T;
  onChange: (key: T) => void;
};

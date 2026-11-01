export type TimeFieldProps = {
  label: string;
  value: Date;
  onChange: (event: unknown, date: Date) => void;
  testID?: string;
};

export type UseTimeFieldProps = Pick<TimeFieldProps, "onChange">;

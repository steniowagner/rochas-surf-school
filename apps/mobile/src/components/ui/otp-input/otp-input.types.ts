export type OtpInputStatus = "neutral" | "error";

export type OtpInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  status?: OtpInputStatus;
  editable?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

export type UseOtpInputProps = {
  onChangeText: (value: string) => void;
  length: number;
};

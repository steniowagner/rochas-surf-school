export type PhoneNumberFieldProps = {
  /** The country flag or code, as the button prints it. */
  country: string;
  dialCode: string;
  value?: string;
  placeholder?: string;
  status?: "neutral" | "error";
  errorMessage?: string;
};

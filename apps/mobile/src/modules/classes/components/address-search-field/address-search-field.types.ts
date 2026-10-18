import { AddressSuggestion } from "../../classes.types";

export type AddressSearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  /** The suggestions for what was typed; the rows show while the field is focused. */
  suggestions: AddressSuggestion[];
  onPick: (suggestion: AddressSuggestion) => void;
};

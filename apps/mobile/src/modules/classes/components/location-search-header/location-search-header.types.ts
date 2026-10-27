import { AddressSuggestion } from "../../classes.types";

export type LocationSearchHeaderProps = {
  /** The suggestion session of the screen (Google bills autocomplete by session). */
  sessionToken: string;
  /** A suggestion was picked: the screen looks the place up and fills the form. */
  onPick: (suggestion: AddressSuggestion) => void;
};

export type UseLocationSearchHeaderProps = LocationSearchHeaderProps;

/** A row of the list: the suggestion, and its title split around the part that matches what was typed. */
export type SuggestionRow = {
  suggestion: AddressSuggestion;
  before: string;
  match: string;
  after: string;
};

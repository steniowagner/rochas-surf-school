import { useHeaderHeight } from "expo-router/react-navigation";
import { useState } from "react";
import { Platform, useWindowDimensions } from "react-native";

import { AddressSuggestion } from "../../classes.types";
import {
  SUGGESTIONS_MIN_LENGTH,
  useAddressSuggestions,
} from "../../hooks/use-address-suggestions.hook";

import {
  SuggestionRow,
  UseLocationSearchHeaderProps,
} from "./location-search-header.types";

/** The most suggestions the list shows, whatever the backend answers. */
export const SUGGESTIONS_MAX = 6;

// The room the header leaves the field beside the back button: Android puts the title after the arrow, iOS beside
// the round button.
const headerSides = () => (Platform.OS === "android" ? 88 : 84);

// The gap between the header and the floating list.
const LIST_GAP = 8;

/** The title split around the first part that matches the text, ignoring case; no match leaves it whole. */
const splitTitle = (
  suggestion: AddressSuggestion,
  query: string,
): SuggestionRow => {
  const { title } = suggestion;
  const start = title.toLowerCase().indexOf(query.toLowerCase());

  if (start === -1) {
    return { suggestion, before: title, match: "", after: "" };
  }

  return {
    suggestion,
    before: title.slice(0, start),
    match: title.slice(start, start + query.length),
    after: title.slice(start + query.length),
  };
};

export const useLocationSearchHeader = ({
  sessionToken,
  onPick,
}: UseLocationSearchHeaderProps) => {
  const { width } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState("");
  // The list shows while the admin types, and hides after a pick or a clear.
  const [open, setOpen] = useState(false);
  const suggestionsQuery = useAddressSuggestions(text, sessionToken);
  const query = text.trim();
  // The query lags the text by the debounce: rows of an older text never show for a text too short to search.
  const searching = open && query.length >= SUGGESTIONS_MIN_LENGTH;
  const rows = searching
    ? (suggestionsQuery.data?.items ?? [])
        .slice(0, SUGGESTIONS_MAX)
        .map((suggestion) => splitTitle(suggestion, query))
    : [];

  const changeText = (value: string) => {
    setText(value);
    setOpen(true);
  };

  const clear = () => {
    setText("");
    setOpen(false);
  };

  const pick = (suggestion: AddressSuggestion) => {
    setText(suggestion.title);
    setOpen(false);
    onPick(suggestion);
  };

  return {
    text,
    rows,
    fieldWidth: width - headerSides(),
    listTop: headerHeight + LIST_GAP,
    changeText,
    clear,
    pick,
  };
};

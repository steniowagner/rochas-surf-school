import type { ComponentProps } from "react";

import type { Ionicons } from "@expo/vector-icons";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export type EmptyStateAction = {
  label: string;
  /** The Ionicons glyph before the label. */
  icon?: IoniconName;
  onPress: () => void;
};

export type EmptyStateProps = {
  /** The Ionicons glyph in the tile at the top. */
  icon: IoniconName;
  title: string;
  description: string;
  /** A button under the description, such as "Create class". */
  action?: EmptyStateAction;
};

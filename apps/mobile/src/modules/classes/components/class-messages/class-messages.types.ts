import type { ClassMessageItem } from "../../classes.types";

export type ClassMessagesProps = {
  messages: ClassMessageItem[];
  now: Date;
  onOpenMessage: (message: ClassMessageItem) => void;
};

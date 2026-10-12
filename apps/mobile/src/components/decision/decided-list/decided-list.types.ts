export type DecidedItem = {
  id: string;
  title: string;
  tag: string;
  tone: "ok" | "bad";
};

export type DecidedListProps = {
  title: string;
  items: DecidedItem[];
};

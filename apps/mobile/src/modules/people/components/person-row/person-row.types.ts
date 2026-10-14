import { Person } from "../../people.types";

export type PersonRowProps = {
  person: Person;
  onPress: (person: Person) => void;
  /** Rows form one card: the first rounds the top corners, the last the bottom ones. */
  isFirst?: boolean;
  isLast?: boolean;
};

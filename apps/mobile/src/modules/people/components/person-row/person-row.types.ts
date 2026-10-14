import { Person } from "../../people.types";

export type PersonRowProps = {
  person: Person;
  onPress: (person: Person) => void;
};

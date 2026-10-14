import { Person } from "../people.types";

export type PeopleListItem =
  | { kind: "header"; key: string; letter: string }
  | {
      kind: "person";
      key: string;
      person: Person;
      isFirst: boolean;
      isLast: boolean;
    };

/** The first letter of the name, uppercase and without accent; "#" when the name doesn't start with a letter. */
export const getInitialLetter = (name: string): string => {
  const letter = name
    .trim()
    .charAt(0)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

  return /^[A-Z]$/.test(letter) ? letter : "#";
};

/**
 * People already sorted A–Z, as a flat list for one `FlatList`: a header per first letter, then its people, which form
 * one card (`isFirst` / `isLast` round its corners).
 */
export const groupByInitial = (people: Person[]): PeopleListItem[] => {
  const items: PeopleListItem[] = [];

  people.forEach((person, index) => {
    const letter = getInitialLetter(person.name);
    const startsGroup =
      index === 0 || getInitialLetter(people[index - 1].name) !== letter;
    const endsGroup =
      index === people.length - 1 ||
      getInitialLetter(people[index + 1].name) !== letter;

    if (startsGroup) {
      items.push({ kind: "header", key: `header-${letter}`, letter });
    }

    items.push({
      kind: "person",
      key: person.id,
      person,
      isFirst: startsGroup,
      isLast: endsGroup,
    });
  });

  return items;
};

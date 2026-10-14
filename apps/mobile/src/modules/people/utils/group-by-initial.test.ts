import { buildPerson } from "../people.test-utils";

import { getInitialLetter, groupByInitial } from "./group-by-initial";

describe("getInitialLetter", () => {
  it.each([
    ["Ana", "A"],
    ["álvaro", "A"],
    ["  joão", "J"],
    ["Óscar", "O"],
    ["1st", "#"],
    ["_x", "#"],
    ["", "#"],
  ])("%j starts with %s", (name, letter) => {
    expect(getInitialLetter(name)).toBe(letter);
  });
});

describe("groupByInitial", () => {
  it("answers nothing for nobody", () => {
    expect(groupByInitial([])).toEqual([]);
  });

  it("puts a header before each first letter and marks the first and last person of each group", () => {
    const people = [
      buildPerson(1, { name: "Ana" }),
      buildPerson(2, { name: "Álvaro" }),
      buildPerson(3, { name: "Bruno" }),
      buildPerson(4, { name: "Carla" }),
      buildPerson(5, { name: "Caio" }),
    ];

    const items = groupByInitial(people);

    expect(items.map((item) => (item.kind === "header" ? item.letter : item.person.name))).toEqual([
      "A", "Ana", "Álvaro", "B", "Bruno", "C", "Carla", "Caio",
    ]);
    const flags = items
      .filter((item) => item.kind === "person")
      .map((item) => [item.isFirst, item.isLast]);
    expect(flags).toEqual([
      [true, false],
      [false, true],
      [true, true],
      [true, false],
      [false, true],
    ]);
    expect(items.map((item) => item.key)).toEqual([
      "header-A", "p-1", "p-2", "header-B", "p-3", "header-C", "p-4", "p-5",
    ]);
  });
});

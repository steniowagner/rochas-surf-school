import { ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { GetClass } from "../../../src";
import { buildClassView, FakeClassViewReader, STUDENT } from "../../mock";

const ID = "9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47";

function setup() {
  const reader = new FakeClassViewReader([
    buildClassView({
      id: ID,
      notes: "Ponto de encontro",
      instructors: [
        { id: "i-2", name: "Bruno" },
        { id: "i-1", name: "ana" },
      ],
    }),
  ]);

  return { reader, useCase: new GetClass(reader) };
}

describe("GetClass", () => {
  it("answers one class with its location and sorted instructors", async () => {
    const out = await setup().useCase.execute({ actor: STUDENT, id: ID });

    expect(out).toMatchObject({
      id: ID,
      startsAt: "2026-10-15T11:00:00.000Z",
      notes: "Ponto de encontro",
      location: { name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000" },
      instructors: [
        { id: "i-1", name: "ana" },
        { id: "i-2", name: "Bruno" },
      ],
    });
  });

  it("answers class.notFound for an unknown id", async () => {
    await expect(
      setup().useCase.execute({ actor: STUDENT, id: "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25" }),
    ).rejects.toMatchObject({ constructor: NotFoundError, message: "class.notFound" });
  });

  it("answers class.notFound for a non-UUID without looking it up", async () => {
    const { reader, useCase } = setup();

    await expect(useCase.execute({ actor: STUDENT, id: "not-a-uuid" })).rejects.toMatchObject({
      constructor: NotFoundError,
      message: "class.notFound",
    });
    expect(reader.findByIdCalls).toEqual([]);
  });

  it("refuses a pending account", async () => {
    const { reader, useCase } = setup();

    await expect(
      useCase.execute({ actor: { ...STUDENT, status: "pending" }, id: ID }),
    ).rejects.toThrow(ForbiddenError);
    expect(reader.findByIdCalls).toEqual([]);
  });
});

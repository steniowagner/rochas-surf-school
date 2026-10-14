import { ConflictError, ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { CreateLocation } from "../../../src";
import { ADMIN, buildLocation, FakeLocationRepository, INSTRUCTOR, STUDENT } from "../../mock";

const ADDRESS = "Av. Zezé Diogo, 5000 – Fortaleza";

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("CreateLocation", () => {
  it("creates the location with the trimmed name and address", async () => {
    const repository = new FakeLocationRepository();
    const useCase = new CreateLocation(repository);

    const out = await useCase.execute({
      actor: ADMIN,
      name: " Praia do Futuro ",
      address: ADDRESS,
    });

    expect(out).toEqual({
      id: expect.any(String),
      name: "Praia do Futuro",
      address: ADDRESS,
    });
    expect(await repository.findById(out.id)).not.toBeNull();
  });

  it("refuses a name that matches a saved one ignoring case and accents", async () => {
    const repository = new FakeLocationRepository([buildLocation("Praia do Futuro")]);
    const useCase = new CreateLocation(repository);

    for (const name of ["praia do futuro", "Práia do Futuro"]) {
      const error = await useCase
        .execute({ actor: ADMIN, name, address: ADDRESS })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe("location.name.duplicate");
    }
    expect(await repository.findAll()).toHaveLength(1);
  });

  it.each([
    [{ name: "", address: ADDRESS }, ["location.name.required"]],
    [{ name: "a".repeat(41), address: ADDRESS }, ["location.name.max.length"]],
    [{ name: "x", address: "" }, ["location.address.required"]],
    [{ name: "x", address: "b".repeat(201) }, ["location.address.max.length"]],
    [
      { name: undefined, address: 5 },
      ["location.name.required", "location.address.required"],
    ],
  ])("refuses %j and stores nothing", async (body, keys) => {
    const repository = new FakeLocationRepository();
    const useCase = new CreateLocation(repository);

    expect(await errorsOf(useCase.execute({ actor: ADMIN, ...body }))).toEqual(keys);
    expect(await repository.findAll()).toHaveLength(0);
  });

  it("refuses accounts that are not approved admins", async () => {
    const repository = new FakeLocationRepository();
    const useCase = new CreateLocation(repository);
    const input = { name: "Praia", address: ADDRESS };

    const pending = await useCase
      .execute({ actor: { ...ADMIN, status: "pending" }, ...input })
      .catch((e) => e);
    const student = await useCase.execute({ actor: STUDENT, ...input }).catch((e) => e);
    const instructor = await useCase
      .execute({ actor: INSTRUCTOR, ...input })
      .catch((e) => e);

    expect(pending).toBeInstanceOf(ForbiddenError);
    expect(pending.message).toBe("user.status.notApproved");
    expect(student.message).toBe("user.role.notAdmin");
    expect(instructor.message).toBe("user.role.notAdmin");
    expect(await repository.findAll()).toHaveLength(0);
  });
});

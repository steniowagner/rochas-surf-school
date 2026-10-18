import { ConflictError, ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { CreateLocation } from "../../../src";
import { ADMIN, buildLocation, FakeLocationRepository, INSTRUCTOR, STUDENT } from "../../mock";

const ADDRESS = "Av. Zezé Diogo, 5000 – Fortaleza";
const POINT = { latitude: -3.7442, longitude: -38.4617 };

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
      ...POINT,
    });

    expect(out).toEqual({
      id: expect.any(String),
      name: "Praia do Futuro",
      address: ADDRESS,
      ...POINT,
      upcomingClasses: 0,
    });
    expect(await repository.findById(out.id)).not.toBeNull();
  });

  it("refuses a name that matches a saved one ignoring case and accents", async () => {
    const repository = new FakeLocationRepository([buildLocation("Praia do Futuro")]);
    const useCase = new CreateLocation(repository);

    for (const name of ["praia do futuro", "Práia do Futuro"]) {
      const error = await useCase
        .execute({ actor: ADMIN, name, address: ADDRESS, ...POINT })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe("location.name.duplicate");
    }
    expect(await repository.findActive(new Date())).toHaveLength(1);
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

    expect(await errorsOf(useCase.execute({ actor: ADMIN, ...POINT, ...body }))).toEqual(keys);
    expect(await repository.findActive(new Date())).toHaveLength(0);
  });

  it.each([
    [{}, ["location.point.required"]],
    [{ latitude: null, longitude: null }, ["location.point.required"]],
    [{ latitude: -3.7 }, ["location.point.required"]],
    [{ latitude: "a", longitude: -38.5 }, ["location.point.invalid"]],
    [{ latitude: Number.NaN, longitude: -38.5 }, ["location.point.invalid"]],
    [{ latitude: 91, longitude: -38.5 }, ["location.point.invalid"]],
    [{ latitude: -3.7, longitude: -181 }, ["location.point.invalid"]],
    [
      { name: "", address: "", latitude: 91, longitude: 0 },
      ["location.name.required", "location.address.required", "location.point.invalid"],
    ],
  ])("refuses the point %j (point) and stores nothing", async (body, keys) => {
    const repository = new FakeLocationRepository();
    const useCase = new CreateLocation(repository);

    expect(
      await errorsOf(useCase.execute({ actor: ADMIN, name: "x", address: ADDRESS, latitude: undefined, longitude: undefined, ...body })),
    ).toEqual(keys);
    expect(await repository.findActive(new Date())).toHaveLength(0);
  });

  it("refuses accounts that are not approved admins", async () => {
    const repository = new FakeLocationRepository();
    const useCase = new CreateLocation(repository);
    const input = { name: "Praia", address: ADDRESS, ...POINT };

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
    expect(await repository.findActive(new Date())).toHaveLength(0);
  });
});

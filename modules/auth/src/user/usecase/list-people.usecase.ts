import {
  ForbiddenError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { USER_ROLES, UserRole } from "../model";
import { UserRepository } from "../provider";
import { RegistrationActor } from "./registration-access";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;
const MAX_SEARCH_LENGTH = 80;

export interface ListPeopleIn {
  actor: RegistrationActor;
  page?: string;
  perPage?: string;
  role?: string;
  search?: string;
  teaches?: string;
}

export interface PersonOut {
  id: string;
  name: string;
  role: UserRole;
  isInstructor: boolean;
  createdAt: string;
  whatsappNumber: string | null;
}

export interface ListPeopleOut {
  items: PersonOut[];
  page: number;
  perPage: number;
  total: number;
}

function parseInteger(value: unknown, fallback: number, min: number, max: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;

  const parsed = Number(value);

  return parsed >= min && parsed <= max ? parsed : null;
}

/** `student,admin` → the roles, without repeats; a blank text means every role (`[]`); an unknown role or a non-text is `null`. */
function parseRoles(value: unknown): UserRole[] | null {
  if (value === undefined) return [];
  if (typeof value !== "string") return null;

  const names = value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (!names.every((name) => (USER_ROLES as readonly string[]).includes(name))) return null;

  return [...new Set(names)] as UserRole[];
}

/** Only `"true"` is accepted: it narrows the list to the people who can be assigned to teach. */
function parseTeaches(value: unknown): boolean | null {
  if (value === undefined) return false;

  return value === "true" ? true : null;
}

export class ListPeople implements UseCase<ListPeopleIn, ListPeopleOut> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: ListPeopleIn): Promise<ListPeopleOut> {
    if (input.actor.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }

    const errors: ValidationError[] = [];

    const page = parseInteger(input.page, DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER);
    if (page === null) errors.push(new ValidationError("people.page.invalid"));

    const perPage = parseInteger(input.perPage, DEFAULT_PER_PAGE, 1, MAX_PER_PAGE);
    if (perPage === null) errors.push(new ValidationError("people.perPage.invalid"));

    const roles = parseRoles(input.role);
    if (roles === null) errors.push(new ValidationError("people.role.invalid"));

    const teaches = parseTeaches(input.teaches);
    if (teaches === null) errors.push(new ValidationError("people.teaches.invalid"));

    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    if (search !== undefined && search.length > MAX_SEARCH_LENGTH) {
      errors.push(new ValidationError("people.search.max.length"));
    }

    if (errors.length > 0) throw new ValidationException(errors);

    const result = await this.userRepository.findDirectoryPage({
      page: page as number,
      perPage: perPage as number,
      roles: roles?.length ? roles : undefined,
      search: search || undefined,
      teachers: teaches || undefined,
    });
    const viewerIsAdmin = input.actor.role === "admin";

    return {
      items: result.items.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        isInstructor: user.isInstructor,
        createdAt: user.createdAt.toISOString(),
        whatsappNumber:
          user.whatsappNumber && (user.whatsappVisible || viewerIsAdmin)
            ? user.whatsappNumber
            : null,
      })),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }
}

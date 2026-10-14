import {
  ForbiddenError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { USER_ROLES, UserRole } from "../model";
import { DirectorySort, UserRepository } from "../provider";
import { RegistrationActor } from "./registration-access";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;
const MAX_SEARCH_LENGTH = 80;
const SORTS: readonly DirectorySort[] = ["recent", "name"];

export interface ListPeopleIn {
  actor: RegistrationActor;
  page?: string;
  perPage?: string;
  role?: string;
  search?: string;
  sort?: string;
}

export interface PersonOut {
  id: string;
  name: string;
  role: UserRole;
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

    const roleInvalid =
      input.role !== undefined && !(USER_ROLES as readonly unknown[]).includes(input.role);
    if (roleInvalid) errors.push(new ValidationError("people.role.invalid"));

    const search = typeof input.search === "string" ? input.search.trim() : undefined;
    if (search !== undefined && search.length > MAX_SEARCH_LENGTH) {
      errors.push(new ValidationError("people.search.max.length"));
    }

    const sortInvalid =
      input.sort !== undefined && !(SORTS as readonly unknown[]).includes(input.sort);
    if (sortInvalid) errors.push(new ValidationError("people.sort.invalid"));

    if (errors.length > 0) throw new ValidationException(errors);

    const result = await this.userRepository.findDirectoryPage({
      page: page as number,
      perPage: perPage as number,
      role: input.role as UserRole | undefined,
      search: search || undefined,
      sort: (input.sort as DirectorySort | undefined) ?? "recent",
    });
    const viewerIsAdmin = input.actor.role === "admin";

    return {
      items: result.items.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
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

import { PEOPLE_PAGE_SIZE, PEOPLE_ROLES } from "../constants/people";
import { PeopleFilters } from "../people.types";

/** The path of `GET /people` for a page; the backend sorts A–Z. `role` and `search` are sent only when set. */
export const buildPeoplePagePath = (
  page: number,
  filters: PeopleFilters,
): string => {
  const params = [`page=${page}`, `perPage=${PEOPLE_PAGE_SIZE}`];
  const roles = PEOPLE_ROLES.filter((role) => filters.roles.includes(role));
  const search = filters.search.trim();

  if (roles.length > 0) {
    params.push(`role=${roles.join(",")}`);
  }

  if (search) {
    params.push(`search=${encodeURIComponent(search)}`);
  }

  return `/people?${params.join("&")}`;
};

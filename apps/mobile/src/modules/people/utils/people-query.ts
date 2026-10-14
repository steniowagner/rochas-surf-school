import { PEOPLE_PAGE_SIZE } from "../constants/people";
import { PeopleFilters } from "../people.types";

/** The path of `GET /people` for a page, carrying only the parameters that are set. */
export const buildPeoplePagePath = (
  page: number,
  filters: PeopleFilters,
): string => {
  const params = [`page=${page}`, `perPage=${PEOPLE_PAGE_SIZE}`];
  const search = filters.search.trim();

  if (filters.role) {
    params.push(`role=${filters.role}`);
  }

  if (search) {
    params.push(`search=${encodeURIComponent(search)}`);
  }

  if (filters.sort === "name") {
    params.push("sort=name");
  }

  return `/people?${params.join("&")}`;
};

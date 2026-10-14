import { PEOPLE_PAGE_SIZE } from "../constants/people";
import { PeopleFilters } from "../people.types";

/** The path of `GET /people` for a page; the backend sorts A–Z, and the search is sent only when it has text. */
export const buildPeoplePagePath = (
  page: number,
  filters: PeopleFilters,
): string => {
  const params = [
    `page=${page}`,
    `perPage=${PEOPLE_PAGE_SIZE}`,
    `role=${filters.role}`,
  ];
  const search = filters.search.trim();

  if (search) {
    params.push(`search=${encodeURIComponent(search)}`);
  }

  return `/people?${params.join("&")}`;
};

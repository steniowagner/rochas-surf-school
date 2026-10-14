import { useInfiniteQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { PEOPLE_PAGE_SIZE } from "../constants/people";
import { PeopleFilters, PeoplePage, Person } from "../people.types";
import { buildPeoplePagePath } from "../utils/people-query";

/** The directory, 20 people per page; a row repeated across pages (someone approved mid-scroll) is dropped. */
export const usePeople = (filters: PeopleFilters) => {
  const query = useInfiniteQuery({
    queryKey: ["people", filters],
    queryFn: ({ pageParam }) =>
      apiGet<PeoplePage>(buildPeoplePagePath(pageParam, filters), {
        authenticated: true,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * PEOPLE_PAGE_SIZE < last.total ? last.page + 1 : undefined,
    retry: false,
  });

  const seen = new Set<string>();
  const people: Person[] = [];

  for (const page of query.data?.pages ?? []) {
    for (const person of page.items) {
      if (!seen.has(person.id)) {
        seen.add(person.id);
        people.push(person);
      }
    }
  }

  return { ...query, people };
};

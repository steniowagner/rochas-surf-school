import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { PeoplePage } from "../people.types";

/** The unfiltered number of people on the platform (spec 027, D-06). */
export const usePeopleCount = () =>
  useQuery({
    queryKey: ["people", "count"],
    queryFn: () =>
      apiGet<PeoplePage>("/people?perPage=1", { authenticated: true }),
    select: (data) => data.total,
    retry: false,
  });

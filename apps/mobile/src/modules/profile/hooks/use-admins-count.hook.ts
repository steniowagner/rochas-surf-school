import { useQuery } from "@tanstack/react-query";

import { PeoplePage } from "@/modules/people/people.types";
import { apiGet } from "@/services/api";

/** How many approved admins the school has; read only while `enabled` (spec 058, D-14). */
export const useAdminsCount = (enabled: boolean) =>
  useQuery({
    queryKey: ["people", "admins", "count"],
    queryFn: () =>
      apiGet<PeoplePage>("/people?role=admin&perPage=1", { authenticated: true }),
    select: (data) => data.total,
    retry: false,
    enabled,
  });

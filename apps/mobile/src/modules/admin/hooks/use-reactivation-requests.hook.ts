import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { ReactivationRequestsResponse } from "../reactivations.types";
import { REACTIVATIONS_QUERY_KEY } from "../utils/reactivations-cache";

/** The deleted accounts waiting for an answer, oldest first; shared by the admin home (the count) and the tool. */
export const useReactivationRequests = () =>
  useQuery({
    queryKey: REACTIVATIONS_QUERY_KEY,
    queryFn: () =>
      apiGet<ReactivationRequestsResponse>("/reactivation-requests", {
        authenticated: true,
      }),
    retry: false,
  });

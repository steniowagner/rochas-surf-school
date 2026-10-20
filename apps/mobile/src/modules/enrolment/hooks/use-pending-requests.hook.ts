import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { PendingRequestsResponse } from "../enrolment.types";

export const PENDING_REQUESTS_QUERY_KEY = ["enrolments", "pending"] as const;

/** The pending requests by class; shared by the admin home (the count) and the tool (the cards). */
export const usePendingRequests = () =>
  useQuery({
    queryKey: PENDING_REQUESTS_QUERY_KEY,
    queryFn: () =>
      apiGet<PendingRequestsResponse>("/enrolments/pending", { authenticated: true }),
    retry: false,
  });

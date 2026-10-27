import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/providers/session";
import { apiGet } from "@/services/api";

import { RemovedAccountsResponse } from "../people.types";

export const REMOVED_ACCOUNTS_QUERY_KEY = ["removed-accounts"];

/** The removed accounts still inside their 30 days; only an approved admin asks (anyone else is refused). */
export const useRemovedAccounts = () => {
  const { user } = useSession();
  const isApprovedAdmin = user?.role === "admin" && user.status === "approved";

  return useQuery({
    queryKey: REMOVED_ACCOUNTS_QUERY_KEY,
    queryFn: () => apiGet<RemovedAccountsResponse>("/people/removed", { authenticated: true }),
    enabled: isApprovedAdmin,
    retry: false,
  });
};

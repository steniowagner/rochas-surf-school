import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { RegistrationsResponse } from "../registrations.types";
import { REGISTRATIONS_QUERY_KEY } from "../utils/registrations-cache";

/** The pending registrations, oldest first; shared by the admin home (the count) and the tool (the cards). */
export const useRegistrations = () =>
  useQuery({
    queryKey: REGISTRATIONS_QUERY_KEY,
    queryFn: () =>
      apiGet<RegistrationsResponse>("/registrations", { authenticated: true }),
    retry: false,
  });

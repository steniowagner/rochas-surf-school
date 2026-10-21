import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { MyClassesResponse } from "../enrolment.types";

export const MY_CLASSES_QUERY_KEY = ["classes", "mine"] as const;

/** The student's classes that haven't finished, each with their latest request; under `["classes"]`, so every class change refreshes it. */
export const useMyClasses = () =>
  useQuery({
    queryKey: MY_CLASSES_QUERY_KEY,
    queryFn: () => apiGet<MyClassesResponse>("/classes/mine", { authenticated: true }),
    retry: false,
  });

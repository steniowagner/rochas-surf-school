import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/services/api";

import { ClassMessagesPage } from "../classes.types";
import { classMessagesQueryKey } from "../utils/class-messages-cache";

/** The messages admins sent to a class, newest first; a failed read shows no section, so it isn't retried. */
export const useClassMessages = (classId: string) =>
  useQuery({
    queryKey: classMessagesQueryKey(classId),
    queryFn: () =>
      apiGet<ClassMessagesPage>(`/classes/${classId}/messages`, { authenticated: true }),
    retry: false,
  });

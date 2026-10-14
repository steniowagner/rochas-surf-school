import { useMutation } from "@tanstack/react-query";

import { apiPost } from "@/services/api";

import { BatchRequest, CreateClassesResponse } from "../classes.types";

/** Creates a batch of classes; errors are the screen's to show. */
export const useCreateClasses = () =>
  useMutation({
    mutationFn: (request: BatchRequest) =>
      apiPost<CreateClassesResponse>("/classes/batch", request, {
        authenticated: true,
      }),
  });

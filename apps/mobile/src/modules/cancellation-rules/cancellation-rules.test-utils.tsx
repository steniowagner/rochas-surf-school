import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

import { AlertMessageProvider } from "@/providers/alert-message";

export {
  createQueryClient,
  createWrapper as createQueryWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

export const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AlertMessageProvider>{children}</AlertMessageProvider>
      </QueryClientProvider>
    );
  };

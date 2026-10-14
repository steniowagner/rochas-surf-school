import { ApiError, NetworkError } from "./api.errors";

export type RawRequestOptions = {
  accessToken?: string;
  /** Aborts the request after this many milliseconds (as a `NetworkError`). No timeout when omitted. */
  timeoutMs?: number;
};

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const toErrors = (body: unknown): string[] => {
  const errors = (body as { errors?: unknown } | undefined)?.errors;

  return Array.isArray(errors)
    ? errors.filter((error): error is string => typeof error === "string")
    : [];
};

/** One HTTP call with no session logic: the session store and the authenticated client are both built on it. */
export const rawRequest = async <T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  { accessToken, timeoutMs }: RawRequestOptions = {},
): Promise<T> => {
  const hasBody = method !== "GET";
  const controller = timeoutMs === undefined ? null : new AbortController();
  const timer = controller && setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
      method,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer ?? undefined);
  }

  const data = await parseJson(response);

  if (!response.ok) {
    const details = (data as { details?: Record<string, unknown> } | undefined)
      ?.details;

    throw new ApiError(response.status, toErrors(data), details);
  }

  return data as T;
};

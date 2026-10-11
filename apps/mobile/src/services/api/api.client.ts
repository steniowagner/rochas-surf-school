import { ApiError, NetworkError } from "./api.errors";

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

type RequestOptions = {
  accessToken?: string;
};

const request = async <T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body: unknown,
  { accessToken }: RequestOptions = {},
): Promise<T> => {
  const hasBody = method !== "GET";

  let response: Response;

  try {
    response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
      method,
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new NetworkError();
  }

  const data = await parseJson(response);

  if (!response.ok) {
    const details = (data as { details?: Record<string, unknown> } | undefined)
      ?.details;

    throw new ApiError(response.status, toErrors(data), details);
  }

  return data as T;
};

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  request<T>("POST", path, body);

/** A PUT that sends `Authorization: Bearer <token>` when an access token is given (spec 008, D-10). */
export const apiPut = <T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> => request<T>("PUT", path, body, options);

/** A GET that sends `Authorization: Bearer <token>` when an access token is given (spec 012). */
export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  request<T>("GET", path, undefined, options);

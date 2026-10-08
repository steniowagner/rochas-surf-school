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

export const apiPost = async <T>(path: string, body: unknown): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

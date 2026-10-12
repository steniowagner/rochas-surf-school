import { rawRequest, RawRequestOptions } from "./api.request";

type RequestOptions = RawRequestOptions;

/** A POST that sends `Authorization: Bearer <token>` when an access token is given. */
export const apiPost = <T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> => rawRequest<T>("POST", path, body, options);

/** A PUT that sends `Authorization: Bearer <token>` when an access token is given (spec 008, D-10). */
export const apiPut = <T>(
  path: string,
  body: unknown,
  options?: RequestOptions,
): Promise<T> => rawRequest<T>("PUT", path, body, options);

/** A GET that sends `Authorization: Bearer <token>` when an access token is given (spec 012). */
export const apiGet = <T>(path: string, options?: RequestOptions): Promise<T> =>
  rawRequest<T>("GET", path, undefined, options);

export interface SignInCodeProvider {
  /** A random 6-digit code. */
  generate(): string;
  /** The hash stored for `code` sent to `email`. */
  hash(email: string, code: string): string;
  /** Whether `code` sent to `email` produces `hash`. */
  matches(hash: string, email: string, code: string): boolean;
}

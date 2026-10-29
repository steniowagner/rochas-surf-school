/** "a", "a and b", "a, b and c": the pieces of who will be told, joined with the language's "and" (the app's `joinAudience`). */
export function joinAudience(parts: string[], and: string): string {
  if (parts.length <= 1) {
    return parts.join("");
  }

  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

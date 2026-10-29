import type { TextButtonProps } from "./text-button.types";

/** A link inside a sentence: bold, underlined text that takes the color around it unless given another. */
export function TextButton({ children, className = "" }: TextButtonProps) {
  return <span role="link" className={`font-extrabold underline ${className}`}>{children}</span>;
}

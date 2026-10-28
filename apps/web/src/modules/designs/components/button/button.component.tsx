import type { ButtonProps, ButtonVariant } from "./button.types";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sun text-on-color",
  dark: "bg-grape text-on-color",
  // Ink fill with a page-colored label, so it inverts with the theme (the error state's "Try again").
  ink: "bg-ink text-page",
  outline: "border border-input-line text-ink",
  subtle: "bg-dim text-ink-2",
  danger: "bg-bad text-on-color",
  success: "bg-ok text-on-color",
  ghost: "text-ink",
};

export function Button({ variant = "primary", className = "", children, loading = false, disabled = false, icon }: ButtonProps) {
  const palette = disabled ? (variant === "ghost" ? "text-ink-2" : "bg-sand text-ink-2") : variantClasses[variant];
  const elevation = variant === "primary" && !disabled ? "shadow-primary" : "";

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`ds-text-button flex min-h-11 items-center justify-center gap-2 rounded-control px-4.5 py-3.75 ${palette} ${elevation} ${className}`}
    >
      {loading ? (
        <span role="status" aria-label={children} className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

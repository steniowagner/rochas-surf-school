import type { AuthButtonProps } from "./auth-button.types";

const variantClasses: Record<AuthButtonProps["variant"], string> = {
  light: "border border-input-line bg-input text-ink",
  primary: "bg-sun text-on-color shadow-primary",
};

export function AuthButton({ variant, label, icon, loading = false }: AuthButtonProps) {
  return (
    <button
      type="button"
      disabled={loading}
      aria-busy={loading}
      className={`ds-text-button flex min-h-13.5 items-center justify-center gap-2.5 rounded-control ${variantClasses[variant]}`}
    >
      {loading ? (
        <span role="status" aria-label={label} className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "dark" | "outline" | "subtle" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sun text-on-color shadow-primary hover:bg-sun-2",
  dark: "bg-grape text-on-color",
  outline: "border border-input-line bg-transparent text-ink",
  subtle: "bg-dim text-ink-2",
  danger: "bg-bad text-on-color",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** A glyph drawn before the label, as in the mobile Button. */
  icon?: ReactNode;
};

export function Button({
  variant = "primary",
  className = "",
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`ds-text-button flex w-full min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control px-[18px] py-[15px] transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

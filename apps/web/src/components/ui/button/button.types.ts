import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "dark" | "outline" | "subtle" | "danger";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  /** A glyph drawn before the label, as in the mobile Button. */
  icon?: ReactNode;
};

type ButtonAsButtonProps = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

/** With an `href` the button is a link: an anchor with the same classes. */
type ButtonAsLinkProps = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

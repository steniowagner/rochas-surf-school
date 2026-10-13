import type { ButtonProps, ButtonVariant } from "./button.types";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sun text-on-color shadow-primary hover:bg-sun-2",
  dark: "bg-grape text-on-color",
  outline: "border border-input-line bg-transparent text-ink",
  subtle: "bg-dim text-ink-2",
  danger: "bg-bad text-on-color",
};

export function Button(props: ButtonProps) {
  const { variant = "primary", icon, children, className = "", ...rest } = props;
  const classes = `ds-text-button flex w-full min-h-11 cursor-pointer items-center justify-center gap-2 rounded-control px-[18px] py-[15px] transition-colors ${variantClasses[variant]} ${className}`;

  if (props.href !== undefined) {
    const { href, ...anchorProps } = rest as Extract<ButtonProps, { href: string }>;
    return (
      <a href={href} className={classes} {...anchorProps}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as Extract<ButtonProps, { href?: undefined }>)}>
      {icon}
      {children}
    </button>
  );
}

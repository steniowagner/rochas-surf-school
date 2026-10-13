import type { ScreenIntroProps } from "./screen-intro.types";

export function ScreenIntro({
  icon,
  title,
  description,
  eyebrow,
  iconTileClassName = "bg-sand",
  eyebrowClassName = "text-ink-2",
}: ScreenIntroProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-card text-grape ${iconTileClassName}`}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        {eyebrow ? (
          <p className={`ds-text-section-label ${eyebrowClassName}`}>{eyebrow}</p>
        ) : null}
        <h1 className="ds-text-screen-title text-ink">{title}</h1>
      </div>
      <p className="ds-text-body text-ink-2">{description}</p>
    </div>
  );
}

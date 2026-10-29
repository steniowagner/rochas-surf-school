import { Children } from "react";

import type { ProfileCardProps } from "./profile-card.types";

/** A card of rows with a divider between them. */
export function ProfileCard({ children }: ProfileCardProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      {Children.toArray(children).map((child, index) => (
        <div key={index} data-testid="profile-card-row" className={index > 0 ? "border-t border-line" : ""}>
          {child}
        </div>
      ))}
    </div>
  );
}

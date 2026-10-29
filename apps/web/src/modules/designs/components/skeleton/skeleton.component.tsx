import type { SkeletonProps } from "./skeleton.types";

const toneClasses = { sand: "bg-sand", surface: "bg-surface" } as const;

export function Skeleton({ className = "", tone = "sand" }: SkeletonProps) {
  return <div data-testid="skeleton" className={`${toneClasses[tone]} ${className}`} />;
}

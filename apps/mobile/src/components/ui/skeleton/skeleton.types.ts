export type SkeletonTone = "sand" | "surface";

export type SkeletonProps = {
  /** Size and shape of the block, the measures of what it stands for (`h-[22px] w-[52px] rounded-full`). */
  className?: string;
  /** `sand` on a surface (the default); `surface` on a dim background, such as a card footer, where sand barely shows. */
  tone?: SkeletonTone;
};

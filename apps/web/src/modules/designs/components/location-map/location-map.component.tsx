import type { LocationMapProps } from "./location-map.types";

/**
 * The location screen's full-screen map, drawn with tokens only (spec 075 D-07): the tinted surface of the class's map
 * preview, the sea along the shore, a few streets, and the pin when a point is picked. No tiles and no request.
 */
export function LocationMap({ pin = false }: LocationMapProps) {
  return (
    <div data-testid="location-map" className="absolute inset-0 overflow-hidden bg-info-tint">
      <svg aria-hidden viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice" className="size-full">
        <path d="M0 0H402V170C340 205 292 190 238 232C180 277 120 262 64 300C38 318 18 336 0 352Z" className="fill-sky opacity-40" />
        <path d="M0 352C18 336 38 318 64 300C120 262 180 277 238 232C292 190 340 205 402 170" fill="none" strokeWidth="10" className="stroke-sand" />
        <g fill="none" strokeLinecap="round" className="stroke-surface">
          <path d="M-10 470L412 380" strokeWidth="14" />
          <path d="M-10 640L412 560" strokeWidth="10" />
          <path d="M120 320L170 880" strokeWidth="10" />
          <path d="M300 220L330 880" strokeWidth="14" />
          <path d="M-10 790L412 740" strokeWidth="8" />
          <path d="M210 470L240 600" strokeWidth="6" />
        </g>
      </svg>
      {pin ? (
        <svg data-testid="location-map-pin" aria-hidden viewBox="0 0 24 34" className="absolute left-1/2 top-[38%] h-10.5 w-7.5 -translate-x-1/2 -translate-y-full">
          <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 34 12 34s12-13.6 12-22.3C24 5.2 18.6 0 12 0Z" className="fill-bad" />
          <circle cx="12" cy="11.5" r="4.5" className="fill-surface" />
        </svg>
      ) : null}
    </div>
  );
}

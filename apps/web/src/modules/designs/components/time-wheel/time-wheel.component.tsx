import type { TimeWheelProps } from "./time-wheel.types";

const OFFSETS = [-2, -1, 0, 1, 2];
const FADE = ["opacity-30", "opacity-60", "", "opacity-60", "opacity-30"];

const pad = (value: number) => String(value).padStart(2, "0");

/** The iOS time spinner of the native picker, 24 h: an hour wheel and a minute wheel, the chosen row under a band. */
export function TimeWheel({ label, hour, minute }: TimeWheelProps) {
  return (
    <div role="group" aria-label={`${label} ${pad(hour)}:${pad(minute)}`} className="relative flex w-full justify-center gap-6 py-1">
      <span aria-hidden className="absolute inset-x-0 top-1/2 h-9 -translate-y-1/2 rounded-control bg-dim" />
      {[
        { key: "hour", value: hour, modulo: 24 },
        { key: "minute", value: minute, modulo: 60 },
      ].map(({ key, value, modulo }) => (
        <div key={key} className="relative flex flex-col items-center">
          {OFFSETS.map((offset, index) => (
            <span key={offset} className={`ds-text-list-title flex h-9 items-center ${offset === 0 ? "text-ink" : "text-ink-2"} ${FADE[index]}`}>
              {pad((value + offset + modulo) % modulo)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

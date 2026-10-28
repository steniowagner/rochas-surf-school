import type { OtpInputProps } from "./otp-input.types";

export function OtpInput({ value, length = 6, status = "neutral", editable = true }: OtpInputProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length }, (_, index) => {
        const border = status === "error" ? "border-bad" : index === value.length && editable ? "border-sun" : "border-input-line";

        return (
          <div key={index} data-testid="otp-box" className={`ds-text-lesson-time flex h-15 flex-1 items-center justify-center rounded-control border-2 bg-input text-ink ${border}`}>
            {value[index] ?? ""}
          </div>
        );
      })}
    </div>
  );
}

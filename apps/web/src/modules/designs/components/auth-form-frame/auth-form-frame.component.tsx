import { PhoneFrame } from "../phone-frame";
import { ScreenToast } from "../screen-toast";
import { StackHeader } from "../stack-header";

import type { AuthFormFrameProps } from "./auth-form-frame.types";

/** A screen of the email flow: the stack header with the back button, the intro and fields, and the footer at the bottom. */
export function AuthFormFrame({ intro, children, footer, toastMessage }: AuthFormFrameProps) {
  return (
    <PhoneFrame>
      <StackHeader title="" />
      <div className="flex flex-1 flex-col bg-page px-5 pb-8.5">
        <div className="mt-6 flex flex-col gap-4">
          {intro}
          {children}
        </div>
        <div className="min-h-6 flex-1" />
        <div className="flex flex-col gap-3.5">{footer}</div>
      </div>
      {toastMessage ? <ScreenToast message={toastMessage} /> : null}
    </PhoneFrame>
  );
}

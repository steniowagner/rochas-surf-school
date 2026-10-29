import { AppIcon } from "../app-icon";
import { Button } from "../button";
import { PhoneNumberField } from "../phone-number-field";
import { Switch } from "../switch";

import type { WhatsappNumberFormProps } from "./whatsapp-number-form.types";

/** The WhatsApp number card (country, masked number, hide switch) and the submit button below it. */
export function WhatsappNumberForm({
  header,
  cardTitle,
  helper,
  hideNumberLabel,
  hideNumberHint,
  hidden,
  country,
  dialCode,
  value,
  placeholder,
  status,
  errorMessage,
  submitLabel,
  canSubmit,
  saving = false,
}: WhatsappNumberFormProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-6 flex flex-col gap-6">
        {header}
        <div className="flex flex-col gap-3.5 rounded-card border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <AppIcon name="Ionicons:logo-whatsapp" size={19} className="text-ink-2" />
            <p className="ds-text-section-label text-ink-2">{cardTitle}</p>
          </div>
          <PhoneNumberField country={country} dialCode={dialCode} value={value} placeholder={placeholder} status={status} errorMessage={errorMessage} />
          <p className="ds-text-list-subtitle text-ink-2">{helper}</p>
          <div className="h-px bg-line" />
          <div className="flex min-h-11 items-center gap-3">
            <AppIcon name="Ionicons:eye-off-outline" size={20} className="text-ink-2" />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="ds-text-list-title text-ink">{hideNumberLabel}</p>
              <p className="ds-text-list-subtitle text-ink-2">{hideNumberHint}</p>
            </div>
            <Switch value={hidden} label={hideNumberLabel} />
          </div>
        </div>
      </div>
      <div className="min-h-6 flex-1" />
      <Button disabled={!canSubmit} loading={saving}>
        {submitLabel}
      </Button>
    </div>
  );
}

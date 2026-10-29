import { AppIcon } from "../app-icon";
import { Button } from "../button";

import type { ContactSchoolButtonProps } from "./contact-school-button.types";

export function ContactSchoolButton({ label }: ContactSchoolButtonProps) {
  return <Button icon={<AppIcon name="FontAwesome:whatsapp" size={20} />}>{label}</Button>;
}

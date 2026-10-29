import { DesignSystemChips } from "../../components/design-system-chips";
import { DesignSystemClassCards } from "../../components/design-system-class-cards";
import { DesignSystemColors } from "../../components/design-system-colors";
import { DesignSystemControls } from "../../components/design-system-controls";
import { DesignSystemRules } from "../../components/design-system-rules";
import { DesignSystemShape } from "../../components/design-system-shape";
import { DesignSystemStates } from "../../components/design-system-states";
import { DesignSystemStructure } from "../../components/design-system-structure";
import { DesignSystemTypography } from "../../components/design-system-typography";

import type { DesignSystemPageProps } from "./design-system.types";

export function DesignSystemPage({ locale, text }: DesignSystemPageProps) {
  const props = { locale, text };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="ds-text-section-label text-ink-2">{text.eyebrow}</p>
        <h1 className="ds-text-wordmark text-ink">{text.title}</h1>
        <p className="ds-text-body max-w-160 text-ink-2">{text.description}</p>
      </header>
      <DesignSystemColors {...props} />
      <DesignSystemTypography {...props} />
      <DesignSystemShape {...props} />
      <DesignSystemControls {...props} />
      <DesignSystemChips {...props} />
      <DesignSystemClassCards {...props} />
      <DesignSystemStructure {...props} />
      <DesignSystemRules {...props} />
      <DesignSystemStates {...props} />
    </div>
  );
}

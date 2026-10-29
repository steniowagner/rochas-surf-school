import { appT } from "@/modules/designs/i18n/app-t";

import { BottomModal } from "../bottom-modal";
import { ClassToolCard } from "../class-tool-card";

import { DELETE_SUBTITLE_KEYS } from "./class-tools-sheet.constants";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

/** The class's tools, two by two: edit, message, cancel and delete (only a class with nobody in it). */
export function ClassToolsSheet({ locale, messageCount, deleteState }: ClassToolsSheetProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const reaches = messageCount > 0;

  return (
    <BottomModal>
      <div className="flex flex-col gap-4">
        <h3 className="ds-text-sheet-title text-ink">{t("classTools.title")}</h3>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <ClassToolCard icon="Ionicons:pencil-outline" title={t("classTools.edit")} subtitle={t("classTools.editHint")} />
            <ClassToolCard icon="Ionicons:chatbubble-outline" title={t("classTools.notify")} subtitle={reaches ? t("classTools.people", { count: messageCount }) : t("classTools.nobody")} />
          </div>
          <div className="flex gap-2">
            <ClassToolCard
              icon="Ionicons:close-circle-outline"
              title={t("classTools.cancel")}
              subtitle={reaches ? t("classTools.notifies", { count: messageCount }) : t("classTools.nobodyToNotify")}
              tone="danger"
            />
            <ClassToolCard icon="Ionicons:trash-outline" title={t("classTools.delete")} subtitle={t(DELETE_SUBTITLE_KEYS[deleteState])} disabled={deleteState !== "available"} />
          </div>
        </div>
      </div>
    </BottomModal>
  );
}

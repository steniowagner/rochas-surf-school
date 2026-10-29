import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { HeaderButton } from "@/modules/designs/components/header-button";
import { NotificationRow } from "@/modules/designs/components/notification-row";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { ScreenToast } from "@/modules/designs/components/screen-toast";
import { Skeleton } from "@/modules/designs/components/skeleton";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { appT } from "@/modules/designs/i18n/app-t";

import type { NotificationsScreenProps } from "./notifications-screen.types";

const LOADING_ROWS = [0, 1, 2, 3, 4];

/** "Avisos": every notification, newest first, read or unread; the header's button marks them all read. */
export function NotificationsScreen({ locale, state, items }: NotificationsScreenProps) {
  const t = (key: string) => appT(locale, key);
  const showRows = state === "list" || state === "markAllFailed";
  const overPhone = state === "markAllFailed";

  return (
    <PhoneFrame tall={showRows && !overPhone}>
      <div className={`flex flex-1 flex-col bg-page${overPhone ? " min-h-0" : ""}`}>
        <StackHeader title={t("notifications.title")} right={showRows ? <HeaderButton icon="Ionicons:checkmark-done-outline" label={t("notifications.markAll")} /> : undefined} />
        <div className={`flex flex-1 flex-col gap-3 px-5 pb-10 pt-2${overPhone ? " min-h-0 overflow-hidden" : ""}`}>
          {showRows ? items.map((item) => <NotificationRow key={item.type} {...item} />) : null}
          {state === "loading" ? (
            <div role="status" aria-label={t("notifications.loading")} className="flex flex-col gap-3">
              {LOADING_ROWS.map((key) => (
                <div key={key} className="flex gap-3 rounded-card bg-surface p-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3.5 w-1/2 rounded-full" />
                    <Skeleton className="h-3 w-5/6 rounded-full" />
                    <Skeleton className="h-3 w-1/4 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {state === "error" ? (
            <div className="flex pt-4">
              <ErrorState title={t("notifications.loadError.title")} description={t("notifications.loadError.description")} retryLabel={t("common.tryAgain")} />
            </div>
          ) : null}
          {state === "empty" ? (
            <div className="flex pt-4">
              <EmptyState icon="Ionicons:notifications-outline" title={t("notifications.empty.title")} description={t("notifications.empty.description")} />
            </div>
          ) : null}
        </div>
        {state === "markAllFailed" ? <ScreenToast message={t("notifications.markAllError")} /> : null}
      </div>
    </PhoneFrame>
  );
}

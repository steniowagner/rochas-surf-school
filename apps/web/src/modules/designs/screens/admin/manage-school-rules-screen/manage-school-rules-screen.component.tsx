import { AppIcon } from "@/modules/designs/components/app-icon";
import { Button } from "@/modules/designs/components/button";
import { DeleteSchoolRuleSheet } from "@/modules/designs/components/delete-school-rule-sheet";
import { EmptyState } from "@/modules/designs/components/empty-state";
import { ErrorState } from "@/modules/designs/components/error-state";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SchoolRuleEditableRow } from "@/modules/designs/components/school-rule-editable-row";
import { SchoolRuleSheet } from "@/modules/designs/components/school-rule-sheet";
import { ScreenIntro } from "@/modules/designs/components/screen-intro";
import { Skeleton } from "@/modules/designs/components/skeleton";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { appT } from "@/modules/designs/i18n/app-t";

import type { ManageSchoolRulesScreenProps } from "./manage-school-rules-screen.types";

const LOADING_ROWS = [0, 1, 2];

/** "Regras da escola" for admins: the rules in the order students see them, each opened to edit and moved with ↑ / ↓, and "Adicionar regra". */
export function ManageSchoolRulesScreen({ locale, state, rules }: ManageSchoolRulesScreenProps) {
  const t = (key: string) => appT(locale, key);
  const listed = state === "ready" || state === "addSheet" || state === "editSheet" || state === "deleteSheet";
  const overPhone = listed && state !== "ready";
  const [first] = rules;

  return (
    <PhoneFrame tall={state === "ready"}>
      <div className={`flex flex-1 flex-col bg-page${overPhone ? " min-h-0" : ""}`}>
        {/* The title is the collapsing one in every state: it shows in the header once the intro scrolls away. */}
        <StackHeader title="" />
        {state === "error" || state === "empty" ? (
          <div className="flex flex-1 flex-col px-5 pb-8 pt-2">
            {state === "error" ? (
              <ErrorState title={t("manageSchoolRules.loadError.title")} description={t("manageSchoolRules.loadError.description")} retryLabel={t("common.tryAgain")} />
            ) : (
              <EmptyState icon="Ionicons:shield-outline" title={t("manageSchoolRules.empty.title")} description={t("manageSchoolRules.empty.description")} action={{ label: t("manageSchoolRules.add"), icon: "Ionicons:add" }} />
            )}
          </div>
        ) : (
          <div className={`flex flex-col gap-4 px-5 pb-8 pt-2${overPhone ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
            {state === "loading" ? (
              <div role="status" aria-label={t("manageSchoolRules.loading")} className="rounded-card border border-line bg-surface">
                {LOADING_ROWS.map((key) => (
                  <div key={key} className={`flex items-start gap-3 px-4 py-3.5 ${key < LOADING_ROWS.length - 1 ? "border-b border-line" : ""}`}>
                    <Skeleton className="h-5.5 w-7 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3.5 w-1/2 rounded-full" />
                      <Skeleton className="h-3 w-5/6 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Skeleton className="size-9 rounded-icon-button" />
                      <Skeleton className="size-9 rounded-icon-button" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <ScreenIntro icon={<AppIcon name="Ionicons:shield-outline" size={28} className="text-grape" />} title={t("manageSchoolRules.title")} description={t("manageSchoolRules.intro")} />
                <div className="rounded-card border border-line bg-surface">
                  {rules.map((rule, index) => (
                    <SchoolRuleEditableRow key={rule.title} locale={locale} rule={rule} position={index + 1} showDivider={index < rules.length - 1} moveUpDisabled={index === 0} moveDownDisabled={index === rules.length - 1} />
                  ))}
                </div>
                <Button variant="outline" icon={<AppIcon name="Ionicons:add" size={18} />}>
                  {t("manageSchoolRules.add")}
                </Button>
              </>
            )}
          </div>
        )}
        {state === "addSheet" ? <SchoolRuleSheet locale={locale} mode="add" /> : null}
        {state === "editSheet" && first ? <SchoolRuleSheet locale={locale} mode="edit" rule={first} /> : null}
        {state === "deleteSheet" && first ? <DeleteSchoolRuleSheet locale={locale} title={first.title} /> : null}
      </div>
    </PhoneFrame>
  );
}

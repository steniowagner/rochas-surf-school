import { testAccountSets } from "@rochas-surf-school/shared";
import { ArrowLeft, UsersRound } from "lucide-react";

import { ContentCard } from "@/components/content-card";
import { ScreenIntro } from "@/components/screen-intro";
import { Button } from "@/components/ui/button";

import { CopyEmailButton } from "../../components/copy-email-button";
import type { TestAccountsPageProps } from "./test-accounts.types";

export function TestAccountsPage({ locale, text }: TestAccountsPageProps) {
  const labels = text.testAccounts;
  // Only the button's labels cross into the client component, not the whole page's text.
  const copyLabels = { copyEmail: labels.copyEmail, copied: labels.copied, copyFailed: labels.copyFailed };

  return (
    <>
      <ScreenIntro
        icon={<UsersRound size={32} strokeWidth={2} aria-hidden />}
        title={labels.title}
        description={labels.intro}
      />
      <div className="flex flex-col sm:flex-row">
        <Button
          href={`/${locale}/user-journeys`}
          variant="subtle"
          icon={<ArrowLeft size={18} strokeWidth={2} aria-hidden />}
          className="sm:w-auto"
        >
          {text.labels.allFlows}
        </Button>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="test-account-sets">
        {testAccountSets.map(({ set, accounts }) => (
          <ContentCard key={set} title={labels.set.replace("{set}", set)}>
            <ul className="flex flex-col gap-4">
              {accounts.map((account) => (
                <li key={account.email} className="flex min-w-0 flex-col gap-1">
                  <span className="ds-text-section-label text-ink-2">{labels.roles[account.role]}</span>
                  <span className="ds-text-list-title text-ink">{account.name}</span>
                  <span className="ds-text-body wrap-anywhere text-ink" data-testid="test-account-email">
                    {account.email}
                  </span>
                  <CopyEmailButton email={account.email} labels={copyLabels} />
                </li>
              ))}
            </ul>
          </ContentCard>
        ))}
      </div>
    </>
  );
}

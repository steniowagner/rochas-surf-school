import { ArrowLeft, ExternalLink } from "lucide-react";

import { ContentCard } from "@/components/content-card";
import { Button } from "@/components/ui/button";

import { JourneyBoard } from "../../components/journey-board";
import { userJourneyFlows } from "../../data/user-journey-flows";
import { userJourneyTexts } from "../../i18n/user-journey-texts";
import { buildJourneyGroups } from "../../utils/journey-groups";
import type { UserJourneyFlowPageProps } from "./user-journey-flow.types";

export function UserJourneyFlowPage({ locale, flow, text, siteName }: UserJourneyFlowPageProps) {
  const texts = userJourneyTexts[locale];
  const flowTexts = texts.flows[flow];

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="ds-text-section-label text-ink-2">{text.title}</p>
        <h1 className="ds-text-screen-title text-ink">{flowTexts.title}</h1>
        <p className="ds-text-body max-w-160 text-ink-2">{flowTexts.description}</p>
      </header>
      <ContentCard title={text.labels.accountToUse}>
        <p>{flowTexts.account}</p>
        <a
          href={`/${locale}/user-journeys/test-accounts`}
          className="inline-flex min-h-11 items-center self-start font-bold text-ink underline"
        >
          {text.testAccounts.seeTestAccounts}
        </a>
      </ContentCard>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          href={`/${locale}/designs/${userJourneyFlows[flow].designPage}`}
          target="_blank"
          rel="noopener"
          variant="outline"
          icon={<ExternalLink size={18} strokeWidth={2} aria-hidden />}
          className="sm:w-auto"
        >
          {text.labels.seeDesigns}
        </Button>
        <Button
          href={`/${locale}/user-journeys`}
          variant="subtle"
          icon={<ArrowLeft size={18} strokeWidth={2} aria-hidden />}
          className="sm:w-auto"
        >
          {text.labels.allFlows}
        </Button>
      </div>
      <JourneyBoard
        flow={flow}
        locale={locale}
        groups={buildJourneyGroups(flow, texts)}
        labels={text.labels}
        siteName={siteName}
        heading={text.title}
        flowTitle={flowTexts.title}
      />
    </>
  );
}

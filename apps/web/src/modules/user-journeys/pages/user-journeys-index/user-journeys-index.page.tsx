import { ClipboardCheck, UsersRound } from "lucide-react";

import { ContentCard } from "@/components/content-card";
import { LinkRow } from "@/components/link-row";
import { ScreenIntro } from "@/components/screen-intro";

import { flowRows, userJourneyFlowSlugs } from "../../data/user-journey-flows";
import { userJourneyTexts } from "../../i18n/user-journey-texts";
import { formatCaseCount } from "../../utils/case-count";
import type { UserJourneysIndexPageProps } from "./user-journeys-index.types";

export function UserJourneysIndexPage({ locale, text }: UserJourneysIndexPageProps) {
  const [firstParagraph, ...otherParagraphs] = text.intro;
  const flows = userJourneyTexts[locale].flows;

  return (
    <>
      <ScreenIntro
        icon={<ClipboardCheck size={32} strokeWidth={2} aria-hidden />}
        title={text.title}
        description={firstParagraph}
      />
      {otherParagraphs.map((paragraph) => (
        <p key={paragraph} className="ds-text-body max-w-160 text-ink-2">
          {paragraph}
        </p>
      ))}
      <ContentCard title={text.beforeYouStart.title}>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {text.beforeYouStart.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </ContentCard>
      <LinkRow
        href={`/${locale}/user-journeys/test-accounts`}
        icon={<UsersRound size={24} strokeWidth={2} aria-hidden />}
        title={text.testAccounts.indexRow.title}
        description={text.testAccounts.indexRow.description}
      />
      <div className="flex flex-col gap-3" data-testid="user-journey-flows">
        {userJourneyFlowSlugs.map((flow) => (
          <LinkRow
            key={flow}
            href={`/${locale}/user-journeys/${flow}`}
            icon={<ClipboardCheck size={24} strokeWidth={2} aria-hidden />}
            title={flows[flow].title}
            description={`${formatCaseCount(text.caseCount, flowRows(flow).length)} · ${flows[flow].description}`}
          />
        ))}
      </div>
    </>
  );
}

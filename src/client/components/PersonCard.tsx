import type { HidingMarkAction, RankedPerson } from "../api";
import { daysBefore, formatDate } from "../format";
import { LinkedInLink } from "./LinkedInLink";
import { MarkControls } from "./MarkControls";
import styles from "./PersonCard.module.css";

type Props = {
  rank: number;
  person: RankedPerson;
  asOf: string;
  busy: boolean;
  onMark: (action: HidingMarkAction, note: string) => void;
};

const NO_HEADLINE = "No headline";

const companyUnlessInHeadline = ({ headline, company }: RankedPerson): string | null =>
  company && headline?.includes(company) ? null : company;

const subtitleOf = (person: RankedPerson): string =>
  [person.headline, companyUnlessInHeadline(person)].filter(Boolean).join(" · ") || NO_HEADLINE;

export const PersonCard = ({ rank, person, asOf, busy, onMark }: Props) => (
  <article className={styles.card} aria-label={person.name}>
    <div className={styles.rank} aria-hidden="true">
      {rank}
    </div>
    <div className={styles.body}>
      <header className={styles.header}>
        <div>
          <h2>
            {person.name}
            <LinkedInLink profileUrl={person.profileUrl} name={person.name} />
          </h2>
          <p>{subtitleOf(person)}</p>
        </div>
        <dl className={styles.facts}>
          <div>
            <dt>Score</dt>
            <dd className={styles.score}>{person.score}</dd>
          </div>
          <div>
            <dt>Last engaged</dt>
            <dd>
              {formatDate(person.lastEngagedAt)}
              <small>{daysBefore(person.lastEngagedAt, asOf)}</small>
            </dd>
          </div>
        </dl>
      </header>

      <ul className={styles.reasons} aria-label="Reasons">
        {person.reasons.map((reason) => (
          <li key={reason.text}>
            {reason.text}
            {reason.quote && <blockquote>{reason.quote}</blockquote>}
          </li>
        ))}
      </ul>

      <MarkControls busy={busy} onMark={onMark} />
    </div>
  </article>
);

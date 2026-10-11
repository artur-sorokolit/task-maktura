import { useState } from "react";
import { useParams } from "react-router";
import type { FollowUps, Mark } from "../api";
import { PersonCard } from "../components/PersonCard";
import { formatDate, plural } from "../format";
import { useFollowUps, useMark } from "../queries";
import styles from "./pages.module.css";

const TOP = 10;

const NobodyLeft = () => (
  <>
    <div className={styles.heading}>
      <h1>Follow-up list</h1>
    </div>
    <p className={styles.empty}>
      Nobody left to follow up. Import a newer export, or look at the history.
    </p>
  </>
);

const FollowUpList = ({
  followUps: { account, people },
  busy,
  onMark,
}: {
  followUps: FollowUps;
  busy: boolean;
  onMark: (mark: Mark) => void;
}) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? people : people.slice(0, TOP);

  return (
    <>
      <div className={styles.heading}>
        <div>
          <h1>Follow-up list</h1>
          <p>
            {account.name}, {account.company}. Engagement in the 30 days to{" "}
            {formatDate(account.asOf)}.
          </p>
        </div>
        {people.length > TOP && (
          <button onClick={() => setShowAll(!showAll)}>
            {showAll ? `Show top ${TOP}` : `Show all ${people.length}`}
          </button>
        )}
      </div>
      <p className={styles.count}>
        Showing {visible.length} of {plural(people.length, "person", "people")}
      </p>
      <ol className={styles.list} aria-label="People to follow up">
        {visible.map((person, index) => (
          <li key={person.profileKey}>
            <PersonCard
              rank={index + 1}
              person={person}
              asOf={account.asOf}
              busy={busy}
              onMark={(action, note) => onMark({ profileUrl: person.profileUrl, action, note })}
            />
          </li>
        ))}
      </ol>
    </>
  );
};

export const FollowUpsPage = () => {
  const accountId = useParams().accountId!;
  const followUps = useFollowUps(accountId);
  const mark = useMark(accountId);

  if (followUps.isPending) return <p>Loading…</p>;
  if (followUps.isError) return <p role="alert">{followUps.error.message}</p>;

  return (
    <section>
      {mark.isError && <p role="alert">Could not save: {mark.error.message}</p>}
      {followUps.data.people.length > 0 ? (
        <FollowUpList followUps={followUps.data} busy={mark.isPending} onMark={mark.mutate} />
      ) : (
        <NobodyLeft />
      )}
    </section>
  );
};

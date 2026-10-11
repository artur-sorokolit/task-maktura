import { useParams } from "react-router";
import type { MarkAction, MarkEvent } from "../api";
import { formatDateTime } from "../format";
import { useHistory, useMark } from "../queries";
import styles from "./pages.module.css";

const LABELS: Record<MarkAction, string> = {
  contacted: "Contacted",
  not_relevant: "Not relevant",
  restored: "Put back on the list",
};

const EventRow = ({
  event,
  busy,
  onUndo,
}: {
  event: MarkEvent;
  busy: boolean;
  onUndo: (profileUrl: string) => void;
}) => (
  <tr>
    <td className={styles.nowrap}>{formatDateTime(event.createdAt)}</td>
    <td>
      <a href={event.profileUrl} target="_blank" rel="noreferrer">
        {event.name}
      </a>
      <small>{event.headline ?? event.company ?? ""}</small>
    </td>
    <td className={styles.nowrap}>{LABELS[event.action]}</td>
    <td>{event.note}</td>
    <td>
      {event.active && (
        <button
          className="quiet"
          disabled={busy}
          onClick={() => onUndo(event.profileUrl)}
          aria-label={`Undo for ${event.name}`}
        >
          Undo
        </button>
      )}
    </td>
  </tr>
);

const EventTable = ({
  events,
  busy,
  onUndo,
}: {
  events: readonly MarkEvent[];
  busy: boolean;
  onUndo: (profileUrl: string) => void;
}) => (
  <div className={styles.tableWrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>When</th>
          <th>Person</th>
          <th>Marked as</th>
          <th>Note</th>
          <th>
            <span className="visually-hidden">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <EventRow key={event.id} event={event} busy={busy} onUndo={onUndo} />
        ))}
      </tbody>
    </table>
  </div>
);

export const HistoryPage = () => {
  const accountId = useParams().accountId!;
  const history = useHistory(accountId);
  const mark = useMark(accountId);

  if (history.isPending) return <p>Loading…</p>;
  if (history.isError) return <p role="alert">{history.error.message}</p>;

  const { account, events } = history.data;

  return (
    <section>
      <div className={styles.heading}>
        <div>
          <h1>History</h1>
          <p>
            Everyone marked for {account.name}, {account.company}, newest first.
          </p>
        </div>
      </div>
      {mark.isError && <p role="alert">Could not undo: {mark.error.message}</p>}
      {events.length > 0 ? (
        <EventTable
          events={events}
          busy={mark.isPending}
          onUndo={(profileUrl) => mark.mutate({ profileUrl, action: "restored" })}
        />
      ) : (
        <p className={styles.empty}>Nobody has been marked yet.</p>
      )}
    </section>
  );
};

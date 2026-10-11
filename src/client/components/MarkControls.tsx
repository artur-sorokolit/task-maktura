import { useState } from "react";
import { NOTE_MAX_LENGTH } from "../../domain/mark";
import type { HidingMarkAction } from "../api";
import styles from "./MarkControls.module.css";

type Props = {
  busy: boolean;
  onMark: (action: HidingMarkAction, note: string) => void;
};

const CHOICES: Record<HidingMarkAction, { noteLabel: string; submit: string }> = {
  contacted: { noteLabel: "Note on the contact (optional)", submit: "Save as contacted" },
  not_relevant: { noteLabel: "Why not relevant (optional)", submit: "Save as not relevant" },
};

const NoteForm = ({
  action,
  busy,
  onSubmit,
  onCancel,
}: {
  action: HidingMarkAction;
  busy: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}) => {
  const [note, setNote] = useState("");

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(note);
      }}
    >
      <label>
        <span>{CHOICES[action].noteLabel}</span>
        <textarea
          autoFocus
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <button className="primary" type="submit" disabled={busy}>
          {CHOICES[action].submit}
        </button>
        <button className="quiet" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export const MarkControls = ({ busy, onMark }: Props) => {
  const [action, setAction] = useState<HidingMarkAction | null>(null);

  return action ? (
    <NoteForm
      action={action}
      busy={busy}
      onSubmit={(note) => onMark(action, note)}
      onCancel={() => setAction(null)}
    />
  ) : (
    <div className={styles.actions}>
      <button onClick={() => setAction("contacted")}>Mark contacted</button>
      <button className="quiet" onClick={() => setAction("not_relevant")}>
        Not relevant
      </button>
    </div>
  );
};

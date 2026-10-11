import { useRef, type ChangeEvent } from "react";
import styles from "./ImportButton.module.css";

type Props = { busy: boolean; onFile: (file: File) => void };

const takeFiles = (event: ChangeEvent<HTMLInputElement>): File[] => {
  const files = Array.from(event.target.files ?? []);
  event.target.value = "";
  return files;
};

export const ImportButton = ({ busy, onFile }: Props) => {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={input}
        className={styles.input}
        type="file"
        accept="application/json,.json"
        aria-label="Engagement export file"
        onChange={(event) => takeFiles(event).slice(0, 1).forEach(onFile)}
      />
      <button className="primary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Importing…" : "Import export"}
      </button>
    </>
  );
};

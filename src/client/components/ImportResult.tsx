import styles from "./ImportResult.module.css";

const MAX_DETAILS = 8;

type Tone = "success" | "error";

type Props = {
  tone: Tone;
  title: string;
  details: string[];
  footer?: string;
  onDismiss: () => void;
};

const ROLES: Record<Tone, "status" | "alert"> = { success: "status", error: "alert" };

export const ImportResult = ({ tone, title, details, footer, onDismiss }: Props) => (
  <div className={`${styles.result} ${styles[tone]}`} role={ROLES[tone]}>
    <div>
      <strong>{title}</strong>
      {details.length > 0 && (
        <ul>
          {details.slice(0, MAX_DETAILS).map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
          {details.length > MAX_DETAILS && <li>and {details.length - MAX_DETAILS} more.</li>}
        </ul>
      )}
      {footer && <p>{footer}</p>}
    </div>
    <button className="quiet" onClick={onDismiss} aria-label="Dismiss">
      ✕
    </button>
  </div>
);

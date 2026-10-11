import { NavLink, useMatch, useNavigate } from "react-router";
import styles from "../App.module.css";
import type { Account } from "../api";
import { useAccounts } from "../queries";
import { ImportButton } from "./ImportButton";

type Props = { importing: boolean; onImport: (file: File) => void };

const Sections = ({ accountId }: { accountId: string }) => (
  <nav className={styles.nav} aria-label="Sections">
    <NavLink to={`/accounts/${accountId}`} end>
      Follow-up list
    </NavLink>
    <NavLink to={`/accounts/${accountId}/history`}>History</NavLink>
  </nav>
);

const AccountSwitcher = ({
  accounts,
  selected,
  onSelect,
}: {
  accounts: readonly Account[];
  selected: string;
  onSelect: (accountId: string) => void;
}) => (
  <label className={styles.account}>
    <span>Account</span>
    <select
      aria-label="Account"
      value={selected}
      onChange={(event) => onSelect(event.target.value)}
    >
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name}, {account.company}
        </option>
      ))}
    </select>
  </label>
);

export const Header = ({ importing, onImport }: Props) => {
  const navigate = useNavigate();
  const accounts = useAccounts().data ?? [];
  const accountId = useMatch("/accounts/:accountId/*")?.params.accountId;
  const section = useMatch("/accounts/:accountId/history") ? "/history" : "";

  return (
    <header className={styles.header}>
      <span className={styles.brand}>Maktura</span>
      {accountId && <Sections accountId={accountId} />}
      <div className={styles.tools}>
        {accounts.length > 0 && (
          <AccountSwitcher
            accounts={accounts}
            selected={accountId ?? ""}
            onSelect={(id) => navigate(`/accounts/${id}${section}`)}
          />
        )}
        <ImportButton busy={importing} onFile={onImport} />
      </div>
    </header>
  );
};

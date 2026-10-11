import { Navigate } from "react-router";
import styles from "../App.module.css";
import type { Account } from "../api";
import { useAccounts } from "../queries";

const latestExportFirst = (a: Account, b: Account): number => b.asOf.localeCompare(a.asOf);

const Welcome = () => (
  <section className={styles.empty}>
    <h1>Who is worth a call this month?</h1>
    <p>
      Import an engagement export to see the people most worth following up, ranked, with the
      reasons.
    </p>
  </section>
);

const ToMostRecentAccount = ({ accounts }: { accounts: readonly Account[] }) => (
  <Navigate replace to={`/accounts/${accounts.toSorted(latestExportFirst)[0]!.id}`} />
);

export const HomePage = () => {
  const accounts = useAccounts();

  if (accounts.isPending) return null;
  if (accounts.isError)
    return <p role="alert">Could not load accounts: {accounts.error.message}</p>;
  return accounts.data.length > 0 ? <ToMostRecentAccount accounts={accounts.data} /> : <Welcome />;
};

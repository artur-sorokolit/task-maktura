import { Navigate, Route, Routes } from "react-router";
import styles from "./App.module.css";
import { Header } from "./components/Header";
import { ImportFeedback } from "./components/ImportFeedback";
import { FollowUpsPage } from "./pages/FollowUpsPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { useImport } from "./queries";

export const App = () => {
  const importFile = useImport();

  return (
    <div className={styles.shell}>
      <Header importing={importFile.isPending} onImport={importFile.mutate} />
      <main className={styles.main}>
        <ImportFeedback
          summary={importFile.data}
          error={importFile.error}
          onDismiss={importFile.reset}
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/accounts/:accountId" element={<FollowUpsPage />} />
          <Route path="/accounts/:accountId/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

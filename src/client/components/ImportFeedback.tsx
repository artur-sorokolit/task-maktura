import { ApiError, type ImportSummary } from "../api";
import { plural } from "../format";
import { ImportResult } from "./ImportResult";

type Props = {
  summary: ImportSummary | undefined;
  error: Error | null;
  onDismiss: () => void;
};

const OLDER_EXPORT =
  "This export is older than the one already loaded, so its date, target roles and known contacts were not applied.";

const issuesOf = (error: Error): string[] =>
  error instanceof ApiError ? error.issues.map((issue) => `${issue.path}: ${issue.message}`) : [];

const importedTitle = ({ engagementsAdded }: ImportSummary): string =>
  engagementsAdded > 0
    ? `Imported ${plural(engagementsAdded, "new engagement")}.`
    : "Nothing new in this file.";

const importedDetails = ({
  engagementsInFile,
  engagementsAdded,
  settingsApplied,
}: ImportSummary): string[] => [
  `${plural(engagementsInFile, "row")} in the file, ${engagementsInFile - engagementsAdded} already known or repeated.`,
  ...(settingsApplied ? [] : [OLDER_EXPORT]),
];

export const ImportFeedback = ({ summary, error, onDismiss }: Props) => (
  <>
    {error && (
      <ImportResult
        tone="error"
        title={error.message}
        details={issuesOf(error)}
        footer="Nothing was imported."
        onDismiss={onDismiss}
      />
    )}
    {summary && (
      <ImportResult
        tone="success"
        title={importedTitle(summary)}
        details={importedDetails(summary)}
        onDismiss={onDismiss}
      />
    )}
  </>
);

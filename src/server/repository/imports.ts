import type { ExportFile, ExportIssue } from "../../domain/exportSchema";
import { profileKey } from "../../domain/normalize";
import type { Db } from "../db";

export type ImportSummary = {
  accountId: number;
  engagementsInFile: number;
  engagementsAdded: number;
  settingsApplied: boolean;
};

export class InvalidExportError extends Error {
  constructor(readonly issues: ExportIssue[]) {
    super("The export file is not valid");
  }
}

type StoredAccount = { id: number; asOf: string };

const toUtc = (instant: string): string => new Date(instant).toISOString();

const unknownPostIssues = (file: ExportFile, storedPostIds: readonly string[]): ExportIssue[] => {
  const knownPostIds = new Set([...file.posts.map((post) => post.id), ...storedPostIds]);
  return file.engagements.flatMap((engagement, index) =>
    knownPostIds.has(engagement.postId)
      ? []
      : [
          {
            path: `engagements[${index}].postId`,
            message: `Unknown post "${engagement.postId}"`,
          },
        ],
  );
};

const findAccount = (db: Db, key: string): StoredAccount | undefined =>
  db
    .prepare<[string], StoredAccount>(
      "SELECT id, as_of AS asOf FROM accounts WHERE profile_key = ?",
    )
    .get(key);

const storedPostIds = (db: Db, accountId: number): string[] =>
  db
    .prepare<[number], { postId: string }>(
      "SELECT post_id AS postId FROM posts WHERE account_id = ?",
    )
    .all(accountId)
    .map((row) => row.postId);

const insertAccount = (db: Db, file: ExportFile): number =>
  Number(
    db
      .prepare(
        "INSERT INTO accounts (profile_key, profile_url, name, company, as_of) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        profileKey(file.account.profileUrl),
        file.account.profileUrl,
        file.account.name,
        file.account.company,
        toUtc(file.asOf),
      ).lastInsertRowid,
  );

const applySettings = (db: Db, accountId: number, file: ExportFile): void => {
  db.prepare(
    "UPDATE accounts SET profile_url = ?, name = ?, company = ?, as_of = ? WHERE id = ?",
  ).run(
    file.account.profileUrl,
    file.account.name,
    file.account.company,
    toUtc(file.asOf),
    accountId,
  );

  db.prepare("DELETE FROM account_target_roles WHERE account_id = ?").run(accountId);
  const insertRole = db.prepare(
    "INSERT INTO account_target_roles (account_id, position, role) VALUES (?, ?, ?)",
  );
  file.targetRoles.forEach((role, position) => insertRole.run(accountId, position, role));

  db.prepare("DELETE FROM account_known_contacts WHERE account_id = ?").run(accountId);
  const insertContact = db.prepare(
    "INSERT OR IGNORE INTO account_known_contacts (account_id, profile_key) VALUES (?, ?)",
  );
  file.knownContacts.forEach((url) => insertContact.run(accountId, profileKey(url)));
};

const upsertPosts = (db: Db, accountId: number, file: ExportFile): void => {
  const upsertPost = db.prepare(
    `INSERT INTO posts (account_id, post_id, title, published_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (account_id, post_id) DO UPDATE SET title = excluded.title, published_at = excluded.published_at`,
  );
  file.posts.forEach((post) =>
    upsertPost.run(accountId, post.id, post.title, toUtc(post.publishedAt)),
  );
};

const insertImport = (db: Db, accountId: number, file: ExportFile, now: Date): number =>
  Number(
    db
      .prepare(
        "INSERT INTO imports (account_id, imported_at, as_of, engagements_in_file) VALUES (?, ?, ?, ?)",
      )
      .run(accountId, now.toISOString(), toUtc(file.asOf), file.engagements.length).lastInsertRowid,
  );

const insertNewEngagements = (
  db: Db,
  accountId: number,
  importId: number,
  file: ExportFile,
): number => {
  const insertEngagement = db.prepare(
    `INSERT INTO engagements
       (account_id, post_id, type, profile_key, profile_url, person_name, headline, company, at, text, import_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (account_id, profile_key, post_id, type, at, text) DO NOTHING`,
  );
  return file.engagements.reduce(
    (added, engagement) =>
      added +
      insertEngagement.run(
        accountId,
        engagement.postId,
        engagement.type,
        profileKey(engagement.profileUrl),
        engagement.profileUrl,
        engagement.personName,
        engagement.headline ?? null,
        engagement.company ?? null,
        toUtc(engagement.at),
        engagement.text ?? "",
        importId,
      ).changes,
    0,
  );
};

export const importExport = (db: Db, file: ExportFile, now: Date): ImportSummary =>
  db.transaction((): ImportSummary => {
    const existing = findAccount(db, profileKey(file.account.profileUrl));
    const issues = unknownPostIssues(file, existing ? storedPostIds(db, existing.id) : []);
    if (issues.length > 0) throw new InvalidExportError(issues);

    const settingsApplied = !existing || toUtc(file.asOf) >= existing.asOf;
    const accountId = existing?.id ?? insertAccount(db, file);
    if (settingsApplied) applySettings(db, accountId, file);
    upsertPosts(db, accountId, file);

    return {
      accountId,
      engagementsInFile: file.engagements.length,
      engagementsAdded: insertNewEngagements(
        db,
        accountId,
        insertImport(db, accountId, file, now),
        file,
      ),
      settingsApplied,
    };
  })();

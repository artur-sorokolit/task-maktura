import type { RankingEngagement, RankingInput } from "../../domain/ranking";
import type { Db } from "../db";

export type Account = {
  id: number;
  name: string;
  company: string;
  profileUrl: string;
  asOf: string;
};

const ACCOUNT_COLUMNS = "id, name, company, profile_url AS profileUrl, as_of AS asOf";

export const listAccounts = (db: Db): Account[] =>
  db.prepare<[], Account>(`SELECT ${ACCOUNT_COLUMNS} FROM accounts ORDER BY name, id`).all();

export const getAccount = (db: Db, accountId: number): Account | undefined =>
  db
    .prepare<[number], Account>(`SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE id = ?`)
    .get(accountId);

const targetRoles = (db: Db, accountId: number): string[] =>
  db
    .prepare<[number], { role: string }>(
      "SELECT role FROM account_target_roles WHERE account_id = ? ORDER BY position",
    )
    .all(accountId)
    .map((row) => row.role);

const knownContacts = (db: Db, accountId: number): string[] =>
  db
    .prepare<[number], { profileKey: string }>(
      "SELECT profile_key AS profileKey FROM account_known_contacts WHERE account_id = ?",
    )
    .all(accountId)
    .map((row) => row.profileKey);

const posts = (db: Db, accountId: number): { id: string; title: string }[] =>
  db
    .prepare<[number], { id: string; title: string }>(
      "SELECT post_id AS id, title FROM posts WHERE account_id = ?",
    )
    .all(accountId);

const engagements = (db: Db, accountId: number): RankingEngagement[] =>
  db
    .prepare<[number], RankingEngagement>(
      `SELECT post_id AS postId, type, person_name AS personName, profile_url AS profileUrl,
              headline, company, at, text
       FROM engagements WHERE account_id = ? ORDER BY id`,
    )
    .all(accountId);

export const loadRankingInput = (db: Db, account: Account): RankingInput => ({
  account: { profileUrl: account.profileUrl, company: account.company },
  asOf: account.asOf,
  targetRoles: targetRoles(db, account.id),
  knownContacts: knownContacts(db, account.id),
  posts: posts(db, account.id),
  engagements: engagements(db, account.id),
});

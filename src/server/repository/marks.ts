import type { MarkAction } from "../../domain/mark";
import { profileKey } from "../../domain/normalize";
import type { Db } from "../db";

export type { MarkAction };

export type MarkEvent = {
  id: number;
  action: MarkAction;
  note: string;
  createdAt: string;
  profileKey: string;
  profileUrl: string;
  name: string;
  headline: string | null;
  company: string | null;
  active: boolean;
};

export type MarkResult = "ok" | "unknown_person" | "already_marked" | "not_marked";

type MarkRefusal = Exclude<MarkResult, "ok" | "unknown_person">;

type PersonSnapshot = {
  profileUrl: string;
  name: string;
  headline: string | null;
  company: string | null;
};

const LATEST_EVENT_IDS =
  "SELECT MAX(id) FROM mark_events WHERE account_id = ? GROUP BY profile_key";

const REFUSALS: readonly {
  result: MarkRefusal;
  when: (action: MarkAction, marked: boolean) => boolean;
}[] = [
  { result: "not_marked", when: (action, marked) => action === "restored" && !marked },
  { result: "already_marked", when: (action, marked) => action !== "restored" && marked },
];

const refusal = (action: MarkAction, marked: boolean): MarkRefusal | undefined =>
  REFUSALS.find((candidate) => candidate.when(action, marked))?.result;

export const listMarkedKeys = (db: Db, accountId: number): Set<string> =>
  new Set(
    db
      .prepare<[number], { profileKey: string }>(
        `SELECT profile_key AS profileKey FROM mark_events
         WHERE id IN (${LATEST_EVENT_IDS}) AND action <> 'restored'`,
      )
      .all(accountId)
      .map((row) => row.profileKey),
  );

export const listMarkEvents = (db: Db, accountId: number): MarkEvent[] =>
  db
    .prepare<[number, number], Omit<MarkEvent, "active"> & { active: number }>(
      `SELECT id, action, note, created_at AS createdAt, profile_key AS profileKey,
              profile_url AS profileUrl, person_name AS name, headline, company,
              (action <> 'restored' AND id IN (${LATEST_EVENT_IDS})) AS active
       FROM mark_events WHERE account_id = ? ORDER BY id DESC`,
    )
    .all(accountId, accountId)
    .map((row) => ({ ...row, active: row.active === 1 }));

const latestSnapshot = (db: Db, accountId: number, key: string): PersonSnapshot | undefined =>
  db
    .prepare<[number, string], PersonSnapshot>(
      `SELECT profile_url AS profileUrl, person_name AS name, headline, company
       FROM engagements WHERE account_id = ? AND profile_key = ? ORDER BY at DESC, id DESC LIMIT 1`,
    )
    .get(accountId, key);

const insertMarkEvent = (
  db: Db,
  accountId: number,
  key: string,
  mark: { action: MarkAction; note: string },
  person: PersonSnapshot,
  now: Date,
): void => {
  db.prepare(
    `INSERT INTO mark_events
       (account_id, profile_key, action, note, created_at, profile_url, person_name, headline, company)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    accountId,
    key,
    mark.action,
    mark.note,
    now.toISOString(),
    person.profileUrl,
    person.name,
    person.headline,
    person.company,
  );
};

export const recordMark = (
  db: Db,
  accountId: number,
  mark: { profileUrl: string; action: MarkAction; note: string },
  now: Date,
): MarkResult =>
  db.transaction((): MarkResult => {
    const key = profileKey(mark.profileUrl);
    const person = latestSnapshot(db, accountId, key);
    if (!person) return "unknown_person";

    const refused = refusal(mark.action, listMarkedKeys(db, accountId).has(key));
    if (refused) return refused;

    insertMarkEvent(db, accountId, key, mark, person, now);
    return "ok";
  })();

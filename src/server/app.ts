import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import { z } from "zod";
import { parseExport } from "../domain/exportSchema";
import { MARK_ACTIONS, NOTE_MAX_LENGTH } from "../domain/mark";
import { rankFollowUps } from "../domain/ranking";
import type { Db } from "./db";
import {
  InvalidExportError,
  getAccount,
  importExport,
  listAccounts,
  listMarkEvents,
  listMarkedKeys,
  loadRankingInput,
  recordMark,
  type Account,
  type MarkResult,
} from "./repository";

export type AppOptions = {
  db: Db;
  now?: () => Date;
};

type Reply = { status: number; body: object };

type AccountHandler = (account: Account, req: Request, res: Response) => void;

const BODY_LIMIT = "20mb";

const markSchema = z.object({
  profileUrl: z.string().trim().min(1),
  action: z.enum(MARK_ACTIONS),
  note: z.string().trim().max(NOTE_MAX_LENGTH).default(""),
});

const MARK_REPLIES: Record<MarkResult, Reply> = {
  ok: { status: 201, body: { ok: true } },
  unknown_person: { status: 404, body: { error: "Person not found" } },
  already_marked: { status: 409, body: { error: "Already marked" } },
  not_marked: { status: 409, body: { error: "This person is not marked" } },
};

const BODY_PARSER_REPLIES: Record<string, Reply> = {
  "entity.parse.failed": { status: 400, body: { error: "The file is not valid JSON" } },
  "entity.too.large": { status: 413, body: { error: "The file is too large" } },
};

const ACCOUNT_NOT_FOUND: Reply = { status: 404, body: { error: "Account not found" } };
const ROUTE_NOT_FOUND: Reply = { status: 404, body: { error: "Not found" } };
const UNEXPECTED: Reply = { status: 500, body: { error: "Something went wrong" } };

const send = (res: Response, { status, body }: Reply): void => {
  res.status(status).json(body);
};

const invalidExport = (issues: readonly { path: string; message: string }[]): Reply => ({
  status: 400,
  body: { error: "The export file is not valid", issues },
});

const errorReply = (error: unknown): Reply =>
  error instanceof InvalidExportError
    ? invalidExport(error.issues)
    : (BODY_PARSER_REPLIES[(error as { type?: string } | null)?.type ?? ""] ?? UNEXPECTED);

const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  const reply = errorReply(error);
  if (reply === UNEXPECTED) console.error(error);
  send(res, reply);
};

const accountById = (db: Db, id: unknown): Account | undefined =>
  typeof id === "string" && /^\d+$/.test(id) ? getAccount(db, Number(id)) : undefined;

const forAccount =
  (db: Db, handle: AccountHandler): RequestHandler =>
  (req, res) => {
    const account = accountById(db, req.params.accountId);
    return account ? handle(account, req, res) : send(res, ACCOUNT_NOT_FOUND);
  };

const followUps = (db: Db, account: Account) => {
  const marked = listMarkedKeys(db, account.id);
  return {
    account,
    people: rankFollowUps(loadRankingInput(db, account)).filter(
      (person) => !marked.has(person.profileKey),
    ),
  };
};

const markReply = (db: Db, account: Account, body: unknown, now: Date): Reply => {
  const mark = markSchema.safeParse(body);
  return mark.success
    ? MARK_REPLIES[recordMark(db, account.id, mark.data, now)]
    : { status: 400, body: { error: mark.error.issues[0]?.message ?? "Invalid request" } };
};

const importReply = (db: Db, body: unknown, now: Date): Reply => {
  const file = parseExport(body);
  return file.ok
    ? { status: 201, body: importExport(db, file.data, now) }
    : invalidExport(file.issues);
};

export const createApp = ({ db, now = () => new Date() }: AppOptions): Express =>
  express()
    .use(express.json({ limit: BODY_LIMIT }))
    .get("/api/accounts", (_req, res) => send(res, { status: 200, body: listAccounts(db) }))
    .post("/api/imports", (req, res) => send(res, importReply(db, req.body, now())))
    .get(
      "/api/accounts/:accountId/follow-ups",
      forAccount(db, (account, _req, res) =>
        send(res, { status: 200, body: followUps(db, account) }),
      ),
    )
    .get(
      "/api/accounts/:accountId/history",
      forAccount(db, (account, _req, res) =>
        send(res, { status: 200, body: { account, events: listMarkEvents(db, account.id) } }),
      ),
    )
    .post(
      "/api/accounts/:accountId/marks",
      forAccount(db, (account, req, res) => send(res, markReply(db, account, req.body, now()))),
    )
    .use("/api", (_req, res) => send(res, ROUTE_NOT_FOUND))
    .use(handleError);

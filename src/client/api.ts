import type { ExportIssue } from "../domain/exportSchema";
import type { HidingMarkAction, MarkAction } from "../domain/mark";
import type { RankedPerson } from "../domain/ranking";
import type { Account, ImportSummary, MarkEvent } from "../server/repository";

export type {
  Account,
  ExportIssue,
  HidingMarkAction,
  ImportSummary,
  MarkAction,
  MarkEvent,
  RankedPerson,
};

export type FollowUps = { account: Account; people: RankedPerson[] };
export type History = { account: Account; events: MarkEvent[] };
export type Mark = { profileUrl: string; action: MarkAction; note?: string };

type ErrorBody = { error?: string; issues?: ExportIssue[] } | null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly issues: ExportIssue[] = [],
  ) {
    super(message);
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" };

const post = (body: string): RequestInit => ({ method: "POST", headers: JSON_HEADERS, body });

const toApiError = (status: number, body: ErrorBody): ApiError =>
  new ApiError(body?.error ?? `Request failed (${status})`, body?.issues);

const request = async <Body>(path: string, init?: RequestInit): Promise<Body> => {
  const response = await fetch(path, init);
  const body = await response.json().catch(() => null);
  return response.ok ? (body as Body) : Promise.reject(toApiError(response.status, body));
};

export const api = {
  accounts: () => request<Account[]>("/api/accounts"),
  followUps: (accountId: string) => request<FollowUps>(`/api/accounts/${accountId}/follow-ups`),
  history: (accountId: string) => request<History>(`/api/accounts/${accountId}/history`),
  importFile: async (file: File) => request<ImportSummary>("/api/imports", post(await file.text())),
  mark: (accountId: string, mark: Mark) =>
    request<{ ok: true }>(`/api/accounts/${accountId}/marks`, post(JSON.stringify(mark))),
};

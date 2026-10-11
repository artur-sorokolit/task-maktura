import request from "supertest";
import { describe, expect, it } from "vitest";
import type { ExportFile } from "../domain/exportSchema";
import { sample, withChangedEngagements, withExtraEngagement } from "../testing/sample";
import { createApp } from "./app";
import { openDb } from "./db";

type ListedPerson = { name: string; score: number; profileUrl: string };

const NOW = new Date("2026-09-28T12:00:00Z");
const A_WEEK_LATER = "2026-10-05T09:00:00+01:00";
const DANIEL = "https://www.linkedin.com/in/daniel-whitmore-fd";
const LUCY = "https://www.linkedin.com/in/lucytran";
const RECRUITER = "https://www.linkedin.com/in/jameslee-recruit";

const BEN_COMMENTS_LATER: ExportFile["engagements"][number] = {
  postId: "p-106",
  type: "comment",
  personName: "Ben Carter",
  profileUrl: "https://www.linkedin.com/in/bencarter",
  headline: "Founder at Carter Digital",
  company: "Carter Digital",
  at: "2026-10-01T09:30:00+01:00",
  text: "Which post brought in the most work?",
};

const DANIEL_COMMENTS_LATER: ExportFile["engagements"][number] = {
  postId: "p-106",
  type: "comment",
  personName: "Daniel Whitmore",
  profileUrl: DANIEL,
  headline: "Finance Director at Halden Logistics",
  company: "Halden Logistics",
  at: "2026-10-02T09:00:00+01:00",
  text: "Following up on this.",
};

const LUCY_REACTS_RECENTLY: ExportFile["engagements"][number] = {
  postId: "p-106",
  type: "reaction",
  personName: "Lucy Tran",
  profileUrl: LUCY,
  headline: "Marketing Executive at Orbit Media",
  company: "Orbit Media",
  at: "2026-09-26T11:00:00+01:00",
};

const laterExport = (extra: ExportFile["engagements"][number]): ExportFile =>
  withExtraEngagement({ ...sample(), asOf: A_WEEK_LATER }, extra);

const olderExport = (): ExportFile => ({
  ...sample(),
  asOf: "2026-09-01T09:00:00+01:00",
  knownContacts: [],
  targetRoles: [],
  engagements: [LUCY_REACTS_RECENTLY],
});

const anotherAccountsExport = (): ExportFile => ({
  ...sample(),
  account: {
    name: "Sam Field",
    profileUrl: "https://www.linkedin.com/in/sam-field",
    company: "Field & Co",
  },
  engagements: sample().engagements.slice(0, 1),
});

const startApp = () => {
  const db = openDb(":memory:");
  const app = createApp({ db, now: () => NOW });
  const followUps = async (accountId = 1) =>
    (await request(app).get(`/api/accounts/${accountId}/follow-ups`).expect(200)).body as {
      account: { asOf: string };
      people: ListedPerson[];
    };

  return {
    app,
    followUps,
    importFile: (file: object) => request(app).post("/api/imports").send(file),
    mark: (body: object) => request(app).post("/api/accounts/1/marks").send(body),
    names: async (accountId = 1) => (await followUps(accountId)).people.map((p) => p.name),
    accounts: async () => (await request(app).get("/api/accounts").expect(200)).body as object[],
    history: async () => (await request(app).get("/api/accounts/1/history").expect(200)).body,
    storedEngagements: () =>
      db.prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM engagements").get()!.n,
  };
};

const startAppWithSample = async () => {
  const started = startApp();
  await started.importFile(sample()).expect(201);
  return started;
};

describe("import", () => {
  it("stores the sample once, dropping the identical row inside it", async () => {
    const { importFile, storedEngagements } = startApp();

    const response = await importFile(sample()).expect(201);

    expect(response.body).toMatchObject({ engagementsInFile: 27, engagementsAdded: 26 });
    expect(storedEngagements()).toBe(26);
  });

  it("adds nothing when the same file is imported again", async () => {
    const { importFile, followUps, accounts, storedEngagements } = await startAppWithSample();
    const before = await followUps();

    const again = await importFile(sample()).expect(201);

    expect(again.body.engagementsAdded).toBe(0);
    expect(storedEngagements()).toBe(26);
    expect(await followUps()).toEqual(before);
    expect(await accounts()).toHaveLength(1);
  });

  it("adds only what is new from a later, overlapping export", async () => {
    const { importFile, followUps } = await startAppWithSample();

    const response = await importFile(laterExport(BEN_COMMENTS_LATER)).expect(201);

    const { account, people } = await followUps();
    expect(response.body.engagementsAdded).toBe(1);
    expect(account.asOf).toBe("2026-10-05T08:00:00.000Z");
    expect(people.find((p) => p.name === "Ben Carter")).toMatchObject({ score: 4 });
  });

  it("takes engagements but not settings from an older export imported afterwards", async () => {
    const { importFile, followUps } = await startAppWithSample();

    const response = await importFile(olderExport()).expect(201);

    const { account, people } = await followUps();
    expect(response.body).toMatchObject({ engagementsAdded: 1, settingsApplied: false });
    expect(account.asOf).toBe("2026-09-28T08:00:00.000Z");
    expect(people[0]).toMatchObject({ name: "Daniel Whitmore", score: 10 });
    expect(people.map((p) => p.name)).not.toContain("Marcus Bell");
    expect(people.find((p) => p.name === "Lucy Tran")).toMatchObject({ score: 4 });
  });

  it("keeps accounts apart", async () => {
    const { importFile, names } = await startAppWithSample();

    const response = await importFile(anotherAccountsExport()).expect(201);

    expect(response.body.accountId).toBe(2);
    expect(await names(2)).toEqual(["Daniel Whitmore"]);
    expect(await names(1)).toHaveLength(11);
  });

  it("rejects an invalid file whole and says where it is wrong", async () => {
    const { importFile, accounts, storedEngagements } = startApp();

    const response = await importFile(
      withChangedEngagements(sample(), { 2: { at: "not a date" } }),
    ).expect(400);

    expect(response.body.issues).toEqual([expect.objectContaining({ path: "engagements[2].at" })]);
    expect(storedEngagements()).toBe(0);
    expect(await accounts()).toEqual([]);
  });

  it("rejects an engagement on a post nobody told us about, leaving nothing behind", async () => {
    const { importFile, accounts } = startApp();

    const response = await importFile(
      withChangedEngagements(sample(), { 4: { postId: "p-999" } }),
    ).expect(400);

    expect(response.body.issues).toEqual([
      { path: "engagements[4].postId", message: 'Unknown post "p-999"' },
    ]);
    expect(await accounts()).toEqual([]);
  });

  it("rejects a file that is not JSON", async () => {
    const { app } = startApp();

    const response = await request(app)
      .post("/api/imports")
      .set("Content-Type", "application/json")
      .send("{ not json")
      .expect(400);

    expect(response.body.error).toBe("The file is not valid JSON");
  });
});

describe("working the list", () => {
  it("removes a contacted person and keeps them out after the next import", async () => {
    const { importFile, mark, names } = await startAppWithSample();

    await mark({ profileUrl: DANIEL, action: "contacted", note: "Called" }).expect(201);
    const afterMark = await names();
    await importFile(laterExport(DANIEL_COMMENTS_LATER)).expect(201);
    const afterImport = await names();

    expect(afterMark).not.toContain("Daniel Whitmore");
    expect(afterImport).not.toContain("Daniel Whitmore");
    expect(afterImport[0]).toBe("Grace Mensah");
  });

  it("removes a person marked not relevant, with no note needed", async () => {
    const { mark, followUps } = await startAppWithSample();

    await mark({ profileUrl: RECRUITER, action: "not_relevant" }).expect(201);

    const { people } = await followUps();
    expect(people).toHaveLength(10);
    expect(people.map((p) => p.profileUrl)).not.toContain(RECRUITER);
  });

  it("shows who was marked, when, and the note, newest first", async () => {
    const { mark, history } = await startAppWithSample();

    await mark({ profileUrl: DANIEL, action: "contacted", note: "  Meeting Thursday  " }).expect(
      201,
    );
    await mark({ profileUrl: LUCY, action: "not_relevant" }).expect(201);

    expect((await history()).events).toMatchObject([
      { name: "Lucy Tran", action: "not_relevant", note: "", active: true },
      {
        name: "Daniel Whitmore",
        action: "contacted",
        note: "Meeting Thursday",
        createdAt: "2026-09-28T12:00:00.000Z",
        active: true,
      },
    ]);
  });

  it("brings a person back on undo and keeps both events in the history", async () => {
    const { mark, names, history } = await startAppWithSample();

    await mark({ profileUrl: DANIEL, action: "contacted", note: "Wrong Daniel" }).expect(201);
    await mark({ profileUrl: DANIEL, action: "restored" }).expect(201);

    expect((await names())[0]).toBe("Daniel Whitmore");
    expect((await history()).events).toMatchObject([
      { action: "restored", active: false },
      { action: "contacted", note: "Wrong Daniel", active: false },
    ]);
  });

  it("refuses to mark twice, to undo nothing, or to mark a stranger", async () => {
    const { mark } = await startAppWithSample();

    await mark({ profileUrl: DANIEL, action: "contacted" }).expect(201);
    await mark({ profileUrl: DANIEL, action: "not_relevant" }).expect(409);
    await mark({ profileUrl: LUCY, action: "restored" }).expect(409);
    await mark({ profileUrl: "https://www.linkedin.com/in/nobody", action: "contacted" }).expect(
      404,
    );
    await mark({ profileUrl: DANIEL, action: "archived" }).expect(400);
    await mark({ profileUrl: DANIEL, action: "restored", note: "x".repeat(281) }).expect(400);
  });

  it("answers 404 for an account that does not exist", async () => {
    const { app } = await startAppWithSample();

    await request(app).get("/api/accounts/99/follow-ups").expect(404);
    await request(app).get("/api/accounts/abc/history").expect(404);
  });
});

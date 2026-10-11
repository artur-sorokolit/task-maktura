import { describe, expect, it } from "vitest";
import { sample, sampleJson, withChangedEngagements } from "../testing/sample";
import { parseExport } from "./exportSchema";

const issuePaths = (raw: unknown): string[] => {
  const parsed = parseExport(raw);
  return parsed.ok ? [] : parsed.issues.map((issue) => issue.path).toSorted();
};

describe("parseExport", () => {
  it("accepts the attached sample, including a null headline", () => {
    expect(parseExport(sampleJson()).ok).toBe(true);
  });

  it("points at the row and field that is wrong", () => {
    const { name, profileUrl } = sample().account;
    const broken = {
      ...withChangedEngagements(sample(), { 3: { type: "share" }, 5: { at: "yesterday" } }),
      account: { name, profileUrl },
    };

    expect(issuePaths(broken)).toEqual([
      "account.company",
      "engagements[3].type",
      "engagements[5].at",
    ]);
  });

  it("rejects a timestamp without an offset, which is not a point in time", () => {
    expect(issuePaths({ ...sample(), asOf: "2026-09-28T09:00:00" })).toEqual(["asOf"]);
  });

  it("rejects something that is not an export at all", () => {
    expect(parseExport([]).ok).toBe(false);
    expect(parseExport(null).ok).toBe(false);
  });
});

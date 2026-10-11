import { describe, expect, it } from "vitest";
import { sample } from "../testing/sample";
import { rankFollowUps, type RankingEngagement, type RankingInput } from "./ranking";

const AS_OF = "2026-09-28T09:00:00+01:00";

function engagement(overrides: Partial<RankingEngagement> = {}): RankingEngagement {
  return {
    postId: "p-1",
    type: "reaction",
    personName: "Ada Lovelace",
    profileUrl: "https://www.linkedin.com/in/ada",
    headline: "Engineer at Analytical Engines",
    company: "Analytical Engines",
    at: "2026-09-20T10:00:00+01:00",
    ...overrides,
  };
}

function input(
  engagements: RankingEngagement[],
  overrides: Partial<RankingInput> = {},
): RankingInput {
  return {
    account: {
      profileUrl: "https://www.linkedin.com/in/priya-shah-northgate",
      company: "Northgate Surveyors",
    },
    asOf: AS_OF,
    targetRoles: ["Finance Director", "COO"],
    knownContacts: [],
    posts: [
      { id: "p-1", title: "First post" },
      { id: "p-2", title: "Second post" },
    ],
    engagements,
    ...overrides,
  };
}

const rank = (engagements: RankingEngagement[], overrides?: Partial<RankingInput>) =>
  rankFollowUps(input(engagements, overrides));

describe("who is a person", () => {
  it("treats rows with the same profile URL as one person whatever the name says", () => {
    const people = rank([
      engagement({ personName: "Tom Okafor", postId: "p-1", at: "2026-09-01T09:00:00+01:00" }),
      engagement({ personName: "Thomas Okafor", postId: "p-2", at: "2026-09-20T09:00:00+01:00" }),
    ]);
    expect(people).toHaveLength(1);
    expect(people[0]!.name).toBe("Thomas Okafor");
  });

  it("treats the same name on different profile URLs as different people", () => {
    const people = rank([
      engagement({
        personName: "James Lee",
        profileUrl: "https://www.linkedin.com/in/james-lee-a1",
      }),
      engagement({
        personName: "James Lee",
        profileUrl: "https://www.linkedin.com/in/jameslee-recruit",
      }),
    ]);
    expect(people).toHaveLength(2);
  });

  it("recognises the same profile written two ways", () => {
    const people = rank([
      engagement({ postId: "p-1", profileUrl: "https://www.linkedin.com/in/ada" }),
      engagement({ postId: "p-2", profileUrl: "https://uk.linkedin.com/in/Ada/?trk=x" }),
    ]);
    expect(people).toHaveLength(1);
  });
});

describe("the 30 day window", () => {
  it("counts an engagement exactly 30 days before asOf and drops one a second older", () => {
    const onTheEdge = rank([engagement({ at: "2026-08-29T09:00:00+01:00" })]);
    const justOutside = rank([engagement({ at: "2026-08-29T08:59:59+01:00" })]);
    expect(onTheEdge).toHaveLength(1);
    expect(justOutside).toHaveLength(0);
  });

  it("counts 08:30 at +00:00 as inside a window that opens at 09:00 at +01:00", () => {
    expect(rank([engagement({ at: "2026-08-29T08:30:00+00:00" })])).toHaveLength(1);
  });

  it("drops 09:30 at +03:00 from a window that opens at 09:00 at +01:00", () => {
    expect(rank([engagement({ at: "2026-08-29T09:30:00+03:00" })])).toHaveLength(0);
  });

  it("ignores engagements after asOf", () => {
    expect(rank([engagement({ at: "2026-09-28T09:00:01+01:00" })])).toHaveLength(0);
    expect(rank([engagement({ at: AS_OF })])).toHaveLength(1);
  });

  it("scores only what is inside the window", () => {
    const [person] = rank([
      engagement({ type: "comment", postId: "p-1", at: "2026-07-30T10:00:00+01:00", text: "Old" }),
      engagement({ type: "reaction", postId: "p-2", at: "2026-09-10T10:00:00+01:00" }),
    ]);
    expect(person!.score).toBe(1);
  });
});

describe("who is left out", () => {
  it("leaves out the account holder", () => {
    expect(
      rank([
        engagement({
          profileUrl: "https://www.linkedin.com/in/priya-shah-northgate/",
          company: "Elsewhere",
        }),
      ]),
    ).toHaveLength(0);
  });

  it("leaves out colleagues, however the company name is written", () => {
    expect(rank([engagement({ company: "Northgate Surveyors" })])).toHaveLength(0);
    expect(rank([engagement({ company: "northgate surveyors Ltd" })])).toHaveLength(0);
  });

  it("keeps people from a company that merely starts with the same words", () => {
    expect(rank([engagement({ company: "Northgate Surveyors Supplies" })])).toHaveLength(1);
  });

  it("leaves out known contacts by profile URL, not by name", () => {
    const people = rank(
      [
        engagement({
          personName: "Marcus Bell",
          profileUrl: "https://www.linkedin.com/in/marcusbell",
        }),
        engagement({
          personName: "Marcus Bell",
          profileUrl: "https://www.linkedin.com/in/other-marcus",
        }),
      ],
      { knownContacts: ["https://linkedin.com/in/marcusbell/"] },
    );
    expect(people.map((p) => p.profileUrl)).toEqual(["https://www.linkedin.com/in/other-marcus"]);
  });

  it("judges the company by the person's most recent engagement", () => {
    const joined = rank([
      engagement({ postId: "p-1", company: "Elsewhere", at: "2026-09-01T10:00:00+01:00" }),
      engagement({
        postId: "p-2",
        company: "Northgate Surveyors",
        at: "2026-09-20T10:00:00+01:00",
      }),
    ]);
    expect(joined).toHaveLength(0);
  });
});

describe("scoring", () => {
  const score = (engagements: RankingEngagement[]) => rank(engagements)[0]!.score;

  it("gives a reaction 1 and a comment 3", () => {
    expect(score([engagement({ type: "reaction" })])).toBe(1);
    expect(score([engagement({ type: "comment", text: "Hello" })])).toBe(3);
  });

  it("counts identical rows once", () => {
    expect(score([engagement(), engagement()])).toBe(1);
  });

  it("counts rows that differ only in name or headline once", () => {
    expect(
      score([engagement(), engagement({ personName: "A. Lovelace", headline: "Engineer" })]),
    ).toBe(1);
  });

  it("counts the same moment written with two offsets once", () => {
    expect(
      score([
        engagement({ at: "2026-09-20T10:00:00+01:00" }),
        engagement({ at: "2026-09-20T09:00:00Z" }),
      ]),
    ).toBe(1);
  });

  it("counts two different comments on the same post separately", () => {
    expect(
      score([
        engagement({ type: "comment", text: "First" }),
        engagement({ type: "comment", text: "Second" }),
      ]),
    ).toBe(6);
  });

  it("adds 2 for engaging with two or more different posts, once", () => {
    expect(score([engagement({ postId: "p-1" }), engagement({ postId: "p-2" })])).toBe(1 + 1 + 2);
    expect(
      score([
        engagement({ postId: "p-1" }),
        engagement({ postId: "p-2" }),
        engagement({ postId: "p-3" }),
      ]),
    ).toBe(3 + 2);
  });

  it("does not add the bonus for two engagements with the same post", () => {
    expect(
      score([
        engagement({ type: "reaction", at: "2026-09-19T13:00:00+01:00" }),
        engagement({ type: "comment", text: "Congrats!", at: "2026-09-24T09:05:00+01:00" }),
      ]),
    ).toBe(4);
  });

  it("adds 3 once when the headline mentions a target role, in any letter case", () => {
    expect(score([engagement({ headline: "finance director at Halden" })])).toBe(1 + 3);
    expect(
      score([
        engagement({ postId: "p-1", headline: "Finance Director" }),
        engagement({
          postId: "p-2",
          headline: "Finance Director",
          at: "2026-09-21T10:00:00+01:00",
        }),
      ]),
    ).toBe(1 + 1 + 2 + 3);
  });

  it("does not find a role inside another word, or in a missing headline", () => {
    expect(score([engagement({ headline: "Project Coordinator" })])).toBe(1);
    expect(score([engagement({ headline: null })])).toBe(1);
  });
});

describe("ordering", () => {
  const person = (name: string, overrides: Partial<RankingEngagement> = {}) =>
    engagement({
      personName: name,
      profileUrl: `https://www.linkedin.com/in/${name}`,
      ...overrides,
    });

  it("puts the higher score first", () => {
    const people = rank([person("low"), person("high", { type: "comment", text: "Hi" })]);
    expect(people.map((p) => p.name)).toEqual(["high", "low"]);
  });

  it("breaks a tie by the most recent engagement", () => {
    const people = rank([
      person("older", { at: "2026-09-10T10:00:00+01:00" }),
      person("newer", { at: "2026-09-25T10:00:00+01:00" }),
      person("middle", { at: "2026-09-15T10:00:00+01:00" }),
    ]);
    expect(people.map((p) => p.name)).toEqual(["newer", "middle", "older"]);
  });

  it("returns everyone, leaving the top ten cut to the caller", () => {
    const people = rank(Array.from({ length: 12 }, (_, i) => person(`p${i}`)));
    expect(people).toHaveLength(12);
  });
});

describe("what the salesperson sees", () => {
  it("reports the last counted engagement as a UTC instant", () => {
    const [person] = rank([
      engagement({ postId: "p-1", at: "2026-09-01T10:00:00+01:00" }),
      engagement({ postId: "p-2", at: "2026-09-27T22:15:00+01:00" }),
    ]);
    expect(person!.lastEngagedAt).toBe("2026-09-27T21:15:00.000Z");
  });

  it("explains the score in sentences, quoting the latest comment", () => {
    const [person] = rank([
      engagement({
        postId: "p-1",
        type: "comment",
        text: "How do you handle evidence?",
        headline: "Finance Director at Halden",
      }),
      engagement({
        postId: "p-2",
        type: "reaction",
        at: "2026-09-10T10:00:00+01:00",
        headline: "Finance Director at Halden",
      }),
    ]);
    expect(person!.reasons).toEqual([
      { text: "Finance Director is one of your target roles" },
      { text: "Engaged with 2 different posts in the last 30 days" },
      { text: "Commented on “First post”", quote: "How do you handle evidence?" },
      { text: "Reacted to “Second post”" },
    ]);
  });

  it("never mentions points", () => {
    const [person] = rank([engagement({ type: "comment", text: "Hi", headline: "COO" })]);
    expect(person!.reasons.map((r) => r.text).join(" ")).not.toMatch(/\d\s*(points?|pts)|\+\d/);
  });
});

describe("the sample export", () => {
  it("ranks the attached engagements.json as worked out by hand", () => {
    const people = rankFollowUps(sample()).map((p) => [p.name, p.score]);
    expect(people).toEqual([
      ["Daniel Whitmore", 10],
      ["Grace Mensah", 9],
      ["Thomas Okafor", 9],
      ["Rafael Gomez", 7],
      ["Hannah Steel", 7],
      ["James Lee", 6],
      ["James Lee", 5],
      ["Elena Rossi", 4],
      ["Ben Carter", 1],
      ["Owen Price", 1],
      ["Lucy Tran", 1],
    ]);
  });
});

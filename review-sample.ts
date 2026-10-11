// scoreEngagements.ts
// First attempt at engagement triage. Reads the export, drops colleagues and known
// contacts, scores everyone else and returns the top few. Not yet reviewed.

import fs from "fs";

type Engagement = {
  postId: string;
  type: "reaction" | "comment";
  personName: string;
  profileUrl: string;
  headline: string;
  company: string;
  at: string;
  text?: string;
};

type Input = {
  account: { name: string; profileUrl: string; company: string };
  asOf: string;
  targetRoles: string[];
  knownContacts: string[];
  engagements: Engagement[];
};

export function scoreEngagements(path: string, top = 5) {
  let input: Input;
  try {
    input = JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (e) {
    return [];
  }

  const cutoff = new Date(input.asOf);
  cutoff.setDate(cutoff.getDate() - 30);
  const recent = input.engagements.filter((e) => e.at > cutoff.toISOString());

  const people: Record<string, any> = {};
  for (const e of recent) {
    if (e.company == input.account.company) continue;
    if (input.knownContacts.indexOf(e.personName) >= 0) continue;

    const key = e.personName;
    people[key] = people[key] || {
      name: e.personName,
      profileUrl: e.profileUrl,
      headline: e.headline,
      company: e.company,
      score: 0,
      posts: [],
      lastEngagedAt: e.at,
      reasons: [],
    };
    const p = people[key];
    p.score += e.type == "comment" ? 3 : 1;
    p.posts.push(e.postId);
    if (e.at > p.lastEngagedAt) p.lastEngagedAt = e.at;
    p.reasons.push(e.type + " on " + e.postId);
  }

  for (const k in people) {
    const p = people[k];
    if (p.posts.length > 1) {
      p.score += 2;
      p.reasons.push("engaged with more than one post");
    }
    if (input.targetRoles.some((r) => p.headline.includes(r))) {
      p.score += 3;
      p.reasons.push("target role");
    }
  }

  const ranked = Object.values(people).sort((a: any, b: any) => b.score - a.score);
  return ranked.slice(0, parseInt(top as any));
}

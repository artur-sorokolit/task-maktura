import { findTargetRole, isSameCompany, profileKey } from "./normalize";

export const WINDOW_DAYS = 30;
export const COMMENT_POINTS = 3;
export const REACTION_POINTS = 1;
export const MULTI_POST_BONUS = 2;
export const TARGET_ROLE_BONUS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = WINDOW_DAYS * DAY_MS;
const POSTS_FOR_MULTI_POST_BONUS = 2;

export type EngagementType = "reaction" | "comment";

export type RankingEngagement = {
  postId: string;
  type: EngagementType;
  personName: string;
  profileUrl: string;
  headline?: string | null;
  company?: string | null;
  at: string;
  text?: string | null;
};

export type RankingInput = {
  account: { profileUrl: string; company: string };
  asOf: string;
  targetRoles: readonly string[];
  knownContacts: readonly string[];
  posts: readonly { id: string; title: string }[];
  engagements: readonly RankingEngagement[];
};

export type Reason = {
  text: string;
  quote?: string;
};

export type RankedPerson = {
  profileKey: string;
  profileUrl: string;
  name: string;
  headline: string | null;
  company: string | null;
  score: number;
  lastEngagedAt: string;
  reasons: Reason[];
};

type CountedEngagement = RankingEngagement & {
  profileKey: string;
  atMs: number;
  postTitle: string;
};

type Person = {
  profileKey: string;
  latest: CountedEngagement;
  comments: readonly CountedEngagement[];
  reactions: readonly CountedEngagement[];
  postCount: number;
  targetRole: string | null;
};

type ScoringRule = {
  applies: (person: Person) => boolean;
  points: (person: Person) => number;
  reason: (person: Person) => Reason;
};

const quoted = (title: string): string => `“${title}”`;

const times = (count: number): string => (count > 1 ? ` ${count} times` : "");

const postCount = (engagements: readonly CountedEngagement[]): number =>
  new Set(engagements.map((engagement) => engagement.postId)).size;

const withQuote = (text: string, quote: string): Reason => (quote ? { text, quote } : { text });

const commentReason = ({ comments }: Person): Reason =>
  withQuote(
    comments.length > 1
      ? `Commented ${comments.length} times, most recently on ${quoted(comments[0]!.postTitle)}`
      : `Commented on ${quoted(comments[0]!.postTitle)}`,
    comments[0]!.text?.trim() ?? "",
  );

const reactionReason = ({ reactions }: Person): Reason => ({
  text:
    postCount(reactions) > 1
      ? `Reacted to ${postCount(reactions)} posts`
      : `Reacted${times(reactions.length)} to ${quoted(reactions[0]!.postTitle)}`,
});

const SCORING_RULES: readonly ScoringRule[] = [
  {
    applies: (person) => person.targetRole !== null,
    points: () => TARGET_ROLE_BONUS,
    reason: (person) => ({ text: `${person.targetRole} is one of your target roles` }),
  },
  {
    applies: (person) => person.postCount >= POSTS_FOR_MULTI_POST_BONUS,
    points: () => MULTI_POST_BONUS,
    reason: (person) => ({
      text: `Engaged with ${person.postCount} different posts in the last ${WINDOW_DAYS} days`,
    }),
  },
  {
    applies: (person) => person.comments.length > 0,
    points: (person) => person.comments.length * COMMENT_POINTS,
    reason: commentReason,
  },
  {
    applies: (person) => person.reactions.length > 0,
    points: (person) => person.reactions.length * REACTION_POINTS,
    reason: reactionReason,
  },
];

const toCounted =
  (postTitles: ReadonlyMap<string, string>) =>
  (engagement: RankingEngagement): CountedEngagement => ({
    ...engagement,
    profileKey: profileKey(engagement.profileUrl),
    atMs: Date.parse(engagement.at),
    postTitle: postTitles.get(engagement.postId) ?? engagement.postId,
  });

const isWithinWindow =
  (asOfMs: number) =>
  ({ atMs }: CountedEngagement): boolean =>
    atMs >= asOfMs - WINDOW_MS && atMs <= asOfMs;

const engagementIdentity = ({ profileKey, postId, type, atMs, text }: CountedEngagement): string =>
  JSON.stringify([profileKey, postId, type, atMs, text ?? ""]);

const firstOfEach = <Item>(items: readonly Item[], identity: (item: Item) => string): Item[] =>
  Array.from(Map.groupBy(items, identity).values(), ([first]) => first!);

const newestFirst = (a: CountedEngagement, b: CountedEngagement): number => b.atMs - a.atMs;

const countedEngagements = ({ posts, engagements, asOf }: RankingInput): CountedEngagement[] =>
  firstOfEach(
    engagements
      .map(toCounted(new Map(posts.map((post) => [post.id, post.title]))))
      .filter(isWithinWindow(Date.parse(asOf))),
    engagementIdentity,
  );

const ofType =
  (type: EngagementType) =>
  (engagement: CountedEngagement): boolean =>
    engagement.type === type;

const toPerson =
  (targetRoles: readonly string[]) =>
  (engagements: readonly CountedEngagement[]): Person => {
    const byRecency = engagements.toSorted(newestFirst);
    const latest = byRecency[0]!;
    return {
      profileKey: latest.profileKey,
      latest,
      comments: byRecency.filter(ofType("comment")),
      reactions: byRecency.filter(ofType("reaction")),
      postCount: postCount(byRecency),
      targetRole: findTargetRole(latest.headline, targetRoles),
    };
  };

const isProspect = ({ account, knownContacts }: RankingInput) => {
  const excludedKeys = new Set([account.profileUrl, ...knownContacts].map(profileKey));
  return (person: Person): boolean =>
    !excludedKeys.has(person.profileKey) && !isSameCompany(person.latest.company, account.company);
};

const toRankedPerson = (person: Person): RankedPerson => {
  const applied = SCORING_RULES.filter((rule) => rule.applies(person));
  return {
    profileKey: person.profileKey,
    profileUrl: person.latest.profileUrl,
    name: person.latest.personName,
    headline: person.latest.headline?.trim() || null,
    company: person.latest.company?.trim() || null,
    score: applied.reduce((score, rule) => score + rule.points(person), 0),
    lastEngagedAt: new Date(person.latest.atMs).toISOString(),
    reasons: applied.map((rule) => rule.reason(person)),
  };
};

const ascending = (a: string, b: string): number => Number(a > b) - Number(a < b);

const bestFirst = (a: RankedPerson, b: RankedPerson): number =>
  b.score - a.score ||
  ascending(b.lastEngagedAt, a.lastEngagedAt) ||
  ascending(a.profileKey, b.profileKey);

export const rankFollowUps = (input: RankingInput): RankedPerson[] =>
  Array.from(Map.groupBy(countedEngagements(input), (engagement) => engagement.profileKey).values())
    .map(toPerson(input.targetRoles))
    .filter(isProspect(input))
    .map(toRankedPerson)
    .toSorted(bestFirst);

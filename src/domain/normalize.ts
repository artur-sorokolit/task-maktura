type Replacement = readonly [pattern: RegExp, replacement: string];

const PROFILE_URL_NOISE: readonly Replacement[] = [
  [/^[a-z][a-z0-9+.-]*:\/\//, ""],
  [/[?#].*$/, ""],
  [/^([a-z0-9-]+\.)*linkedin\.com/, "linkedin.com"],
  [/\/+$/, ""],
];

const LEGAL_SUFFIXES: ReadonlySet<string> = new Set([
  "ltd",
  "limited",
  "llp",
  "lp",
  "plc",
  "llc",
  "inc",
  "incorporated",
  "corp",
  "corporation",
  "gmbh",
]);

const NOT_LETTER_OR_DIGIT = /[^\p{L}\p{N}]+/u;
const REGEXP_SPECIAL = /[.*+?^${}()|[\]\\]/g;

export const profileKey = (profileUrl: string): string =>
  PROFILE_URL_NOISE.reduce(
    (key, [pattern, replacement]) => key.replace(pattern, replacement),
    profileUrl.trim().toLowerCase(),
  );

const words = (text: string): readonly string[] =>
  text.normalize("NFKC").toLowerCase().split(NOT_LETTER_OR_DIGIT).filter(Boolean);

const withoutLegalSuffixes = (name: readonly string[]): readonly string[] =>
  name.length > 1 && LEGAL_SUFFIXES.has(name.at(-1) ?? "")
    ? withoutLegalSuffixes(name.slice(0, -1))
    : name;

export const companyKey = (company: string | null | undefined): string =>
  withoutLegalSuffixes(words(company ?? "")).join(" ");

export const isSameCompany = (
  a: string | null | undefined,
  b: string | null | undefined,
): boolean => companyKey(a) !== "" && companyKey(a) === companyKey(b);

const escaped = (text: string): string => text.replace(REGEXP_SPECIAL, "\\$&");

const asWholePhrase = (phrase: string): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${phrase.trim().split(/\s+/).map(escaped).join("\\s+")}(?![\\p{L}\\p{N}])`,
    "iu",
  );

const mentions = (text: string, phrase: string): boolean =>
  phrase.trim() !== "" && asWholePhrase(phrase).test(text);

export const findTargetRole = (
  headline: string | null | undefined,
  targetRoles: readonly string[],
): string | null => targetRoles.find((role) => mentions(headline ?? "", role)) ?? null;

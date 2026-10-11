# Decisions

The brief left some things open. This file records what the application does about each of them. Every entry is covered by a test, and each section names the test files so that a decision and its test change together.

## Ranking rules

Tests: `src/domain/ranking.test.ts`, `src/domain/normalize.test.ts`.

1. Profile URLs are compared in canonical form. Protocol, subdomain (`www`, `uk`, `m`), query string, fragment, trailing slash and letter case are ignored. This applies to people, to `knownContacts` and to the account holder. The list shows the URL as the export wrote it. A CRM and a LinkedIn export rarely write a URL the same way, and a missed match would put an existing customer on a cold-call list.
2. The window is closed at both ends: `asOf - 30 days <= at <= asOf`. Thirty days means 30 x 24 hours of absolute time, so daylight saving cannot move the edge. Timestamps are compared as points in time, whatever offset they are written with. Engagements after `asOf` are stored but not counted, because `asOf` is "now".
3. A colleague is someone whose company name matches the account's once case, punctuation, spacing and trailing legal suffixes are ignored. The suffixes are Ltd, Limited, LLP, LP, PLC, LLC, Inc, Incorporated, Corp, Corporation and GmbH. "Northgate Surveyors Ltd" is a colleague of "Northgate Surveyors", but "Northgate Surveyors Scotland" is not. A missing company never matches.
4. A person's name, headline and company come from their most recent counted engagement. That one profile is what the list shows, where the target role is looked for, and what the colleague check uses. So someone who has just joined the account's company is a colleague, and someone who has just left is not.
5. Two rows are identical when they have the same person, post, type, moment and comment text. Name, headline and company are left out because they change between exports. The same moment written with two offsets is one moment. Two different comments on one post are two engagements.
6. A target role matches as whole words, ignoring case. "Managing director" earns the bonus, and "COO" is not found inside "Coordinator". A null or empty headline earns nothing and is not an error.
7. Each bonus is given once per person. The +2 needs two or more different posts among the counted engagements, so two engagements on one post do not qualify. The +3 is for a target role.
8. When score and last engagement are both equal, the profile URL decides, so the order never changes between two requests.
9. Nobody is dropped for a low score. Everyone with at least one counted engagement is ranked. The screen shows ten and offers the rest.

The attached `engagements.json` gives this result:

| #   | Person                | Score | Why                                            |
| --- | --------------------- | ----- | ---------------------------------------------- |
| 1   | Daniel Whitmore       | 10    | comment 3 + two reactions 2 + posts 2 + role 3 |
| 2   | Grace Mensah          | 9     | 3 + 1 + posts 2 + role 3, engaged 27 Sep       |
| 3   | Thomas Okafor         | 9     | 3 + 1 + posts 2 + role 3, engaged 20 Sep       |
| 4   | Rafael Gomez          | 7     | 1 + 1 + posts 2 + role 3 ("Managing director") |
| 5   | Hannah Steel          | 7     | 3 + 1 + role 3, both on one post so no +2      |
| 6   | James Lee (Kingsmead) | 6     | 3 + role 3                                     |
| 7   | James Lee (Fenwick)   | 5     | three reactions 3 + posts 2                    |
| 8   | Elena Rossi           | 4     | 1 + role 3, her July comment is out of window  |
| 9   | Ben Carter            | 1     |                                                |
| 10  | Owen Price            | 1     | his two identical rows count once              |
| 11  | Lucy Tran             | 1     |                                                |

Four people are left out. Priya Shah is the account holder. Sarah Quinn and Amir Khan are colleagues, Amir through "Northgate Surveyors Ltd". Marcus Bell is a known contact.

Elena Rossi's reaction is written `08:30+00:00`, which is 30 minutes inside the window. Comparing the timestamps as strings would have dropped her.

## Import

Tests: `src/server/app.test.ts`, `src/domain/exportSchema.test.ts`.

10. The app holds several accounts, each with its own list. An account is identified by the canonical profile URL in the file. Importing a file for a new account creates it, and the header has a switcher. Lists, marks and history never cross accounts.
11. An engagement's identity is account, person, post, type, moment and text, held as a `UNIQUE` constraint in the database. Importing a file again adds nothing, and an overlapping file adds only the rows not already held. The import reports how many rows the file had and how many were added.
12. The export with the latest `asOf` sets `asOf`, the target roles, the known contacts and the account's name and company. An older file imported later still adds its engagements but changes none of those, and the screen says so. Known contacts are replaced, not merged, so someone the CRM dropped can be followed up again.
13. If the same engagement arrives again with a different name or headline, the first copy is kept. A changed profile shows up as soon as the person engages again.
14. A file with anything wrong is rejected whole. That covers invalid JSON, a missing or mistyped field, a timestamp without an offset, and an engagement on a post that is in neither this file nor an earlier import. The user sees the path of each problem, such as `engagements[4].postId`, and nothing from the file is stored.
15. Any import that carries a post updates its title.

## Working the list and history

Tests: `src/server/app.test.ts`, `e2e/follow-up.spec.ts`.

16. A marked person stays off the list for good, through reloads, later imports and new engagement from them. Contacted and not relevant behave the same way.
17. The note is optional for both and holds at most 280 characters.
18. A mark can be undone from the history page. The undo is recorded too, so the history shows both the mark and the undo.
19. The history shows the person's name, headline and company as they were when marked. The time of the mark comes from the real clock, not from `asOf`.
20. The top ten is the top ten of whoever is left. Marking someone brings the eleventh person up.
21. Reasons are sentences that never mention points. They cover the target role, the number of posts, the latest comment with its text quoted, and reactions. The score is shown as a number beside them.

## Stack

22. The whole project is TypeScript. The client uses React, Vite, React Router and TanStack Query. The server uses Express and SQLite through better-sqlite3. It is one package that runs as one process on one port.
23. There is no ORM. SQL is written by hand in `src/server/repository/`. The schema is numbered `.sql` files in `migrations/`, applied by a small runner in `src/server/db.ts`.
24. The ranking runs in TypeScript, not in SQL. It is a pure function of an account's stored engagements and is computed on each request. This keeps the rules in one unit-tested place. One account's month of engagement is small enough that caching is not needed.
25. `npm start` is the one command. It installs dependencies if they are missing, builds the client and starts the server, which applies migrations when it boots.

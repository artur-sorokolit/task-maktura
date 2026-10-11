# Decisions

What the brief left open and what this application does about it. Each entry is
enforced by a test; the test file is named so the two can be changed together.

## Ranking rules

Tests: `src/domain/ranking.test.ts`, `src/domain/normalize.test.ts`.

1. **A profile URL is compared in canonical form.** Protocol, subdomain (`www`, `uk`,
   `m`), query string, fragment, trailing slash and letter case are ignored, for people,
   for `knownContacts` and for the account holder. The URL shown is the one in the
   export. Why: a CRM paste and a LinkedIn export rarely write a URL the same way, and
   a miss here puts an existing customer on a cold-call list.
2. **The window is closed at both ends: `asOf - 30 days <= at <= asOf`.** Thirty days is
   30 x 24 hours of absolute time, not calendar days, so daylight saving cannot move
   the edge. Timestamps are compared as points in time whatever offset they are written
   with. Engagements after `asOf` are stored but not counted, because `asOf` is "now".
3. **A colleague is someone whose company name equals the account's after
   normalisation**: case, punctuation and spacing ignored, trailing legal suffixes
   removed (Ltd, Limited, LLP, LP, PLC, LLC, Inc, Incorporated, Corp, Corporation,
   GmbH). "Northgate Surveyors Ltd" is a colleague of "Northgate Surveyors"; "Northgate
   Surveyors Scotland" is not. A missing company never matches.
4. **A person's name, headline and company are those of their most recent counted
   engagement.** That one profile is what is shown, what the target role is looked for
   in, and what the colleague check uses. Someone who has just joined the account's
   company is a colleague; someone who has just left is not.
5. **Identical rows are rows with the same person, post, type, moment and comment
   text.** Name, headline and company are not part of it, since they change between
   exports. The same moment written with two offsets is the same moment. Two different
   comments on one post are two engagements.
6. **A target role matches as whole words, ignoring case.** "Managing director" earns
   the bonus; "COO" is not found in "Coordinator". A null or empty headline earns
   nothing and is not an error.
7. **The two bonuses are per person, once each.** +2 for two or more different posts
   among the counted engagements (two engagements on the same post do not qualify),
   +3 for a target role.
8. **Ties on score and on last engagement are broken by profile URL**, so the order
   never changes between two requests.
9. **Nobody is dropped for a low score.** Everyone with at least one counted engagement
   is ranked; the screen shows ten and offers the rest.

Worked result for the attached `engagements.json`:

| #   | Person                | Score | Why                                            |
| --- | --------------------- | ----- | ---------------------------------------------- |
| 1   | Daniel Whitmore       | 10    | comment 3 + two reactions 2 + posts 2 + role 3 |
| 2   | Grace Mensah          | 9     | 3 + 1 + posts 2 + role 3, engaged 27 Sep       |
| 3   | Thomas Okafor         | 9     | 3 + 1 + posts 2 + role 3, engaged 20 Sep       |
| 4   | Rafael Gomez          | 7     | 1 + 1 + posts 2 + role 3 ("Managing director") |
| 5   | Hannah Steel          | 7     | 3 + 1 + role 3, both on one post so no +2      |
| 6   | James Lee (Kingsmead) | 6     | 3 + role 3                                     |
| 7   | James Lee (Fenwick)   | 5     | three reactions 3 + posts 2                    |
| 8   | Elena Rossi           | 4     | 1 + role 3; her July comment is out of window  |
| 9   | Ben Carter            | 1     |                                                |
| 10  | Owen Price            | 1     | his two identical rows count once              |
| 11  | Lucy Tran             | 1     |                                                |

Left out: Priya Shah (account holder), Sarah Quinn and Amir Khan (colleagues, Amir via
"Northgate Surveyors Ltd"), Marcus Bell (known contact). Elena Rossi's reaction is
written `08:30+00:00`, which is 30 minutes inside the window; comparing the strings
would have dropped her.

## Import

Tests: `src/server/app.test.ts`, `src/domain/exportSchema.test.ts`.

10. **Several accounts, one list each.** The account is identified by its canonical
    profile URL in the file. Importing a file for a new account creates it; the header
    has a switcher. Lists, marks and history never cross accounts.
11. **An engagement's identity is (account, person, post, type, moment, text)**, held as
    a database UNIQUE constraint. Re-importing a file adds nothing; an overlapping file
    adds only the rows not already held. The import reports rows in the file and rows
    added.
12. **The export with the latest `asOf` sets `asOf`, target roles, known contacts and
    the account's name and company.** An older file imported later still adds its
    engagements but changes none of those, and the screen says so. Known contacts are
    replaced, not merged: if the CRM dropped someone, they can be followed up again.
13. **When the same engagement arrives again with a different name or headline, the
    first copy is kept.** A changed profile shows up as soon as the person engages
    again.
14. **A file with anything wrong is rejected whole.** Not JSON, a missing or mistyped
    field, a timestamp without an offset, or an engagement on a post that is neither in
    this file nor in an earlier import. The user gets the path of each problem
    (`engagements[4].postId`), and nothing from the file is stored.
15. **Post titles are updated by any import that carries the post.**

## Working the list and history

Tests: `src/server/app.test.ts`, `e2e/follow-up.spec.ts`.

16. **A marked person stays off the list for good**, through reloads, later imports and
    new engagement from them. Contacted and not relevant behave the same way.
17. **The note is optional for both**, at most 280 characters.
18. **A mark can be undone from the history page.** Undo is itself recorded, so the
    history shows the mark and the undo. The history is an append-only log.
19. **History shows the person as they were when marked** (name, headline, company), and
    the time of the mark by the real clock, not `asOf`.
20. **The top ten is the top ten of who is left.** Marking someone brings the eleventh
    person up.
21. **Reasons are sentences without points**: target role, number of posts, the latest
    comment with its text quoted, reactions. The score is shown as a number beside them.

## Stack

22. **TypeScript throughout; React, Vite, React Router and TanStack Query on the client;
    Express on the server; SQLite through better-sqlite3.** One package, one process,
    one port.
23. **No ORM.** SQL is written by hand in `src/server/repository/`, and the schema is
    numbered `.sql` files in `migrations/` applied by a small runner in
    `src/server/db.ts`.
24. **The ranking runs in TypeScript, not SQL.** It is a pure function of an account's
    stored engagements, computed on each request. That keeps the rules in one readable,
    unit-tested place; at this size (one account's month of engagement) there is
    nothing to cache.
25. **`npm start` is the one command**: it installs dependencies if missing, builds the
    client and starts the server, which applies migrations on boot.

# Maktura follow-up list

Turns a LinkedIn engagement export into a ranked list of people worth a phone call.
The brief is [TASK.md](TASK.md). Every choice the brief left open is recorded in
[doc/decisions.md](doc/decisions.md); the tables are described in
[doc/data-model.md](doc/data-model.md).

## Commands

| Command            | What it does                                                                   |
| ------------------ | ------------------------------------------------------------------------------ |
| `npm start`        | Fresh clone to running app: installs if needed, builds, migrates, serves :3000 |
| `npm run dev`      | Same server with Vite hot reload and restart on change, on :3000               |
| `npm run check`    | Typecheck, lint and unit/API tests. Run before calling any change done         |
| `npm test`         | Vitest only: `src/**/*.test.ts`                                                |
| `npm run test:e2e` | Playwright against a production build and a throwaway database, on :3100       |
| `npm run format`   | Prettier                                                                       |

First browser test run on a machine: `npx playwright install --with-deps chromium`.

`PORT` and `DATABASE_PATH` (default `data/maktura.sqlite`) are the only settings.
Delete `data/` to start from an empty database.

## Layout

```
doc/             decisions and data model: everything that would otherwise be a comment
migrations/      numbered .sql files, applied in order on server start
src/domain/      the rules, pure TypeScript: no database, no network, no clock
  ranking.ts       rankFollowUps(): SCORING_RULES is the table of what earns points and why
  normalize.ts     comparison keys for profile URLs, company names, role matching
  exportSchema.ts  parseExport(): what a valid export file is (zod)
  mark.ts          the actions a user can take on a person
src/server/      Express API and SQLite
  repository/      all SQL lives here; index.ts is the contract the rest may import
    accounts.ts      accounts and the ranking input of one account
    imports.ts       importExport(): one export, one transaction
    marks.ts         the mark event log
  app.ts           createApp(): routes as request -> reply, replies as lookup tables
  db.ts            open database, run migrations
  main.ts          process entry: API plus the client on one port
src/client/      React single page app (React Router, TanStack Query, CSS Modules)
  api.ts           the only place that calls fetch
  queries.ts       the only place that uses TanStack Query: one hook per read or write
  pages/           one component per route
  components/      presentational pieces; they receive data and callbacks, never fetch
src/testing/     test data builders shared by the test files
e2e/             Playwright browser test
```

Dependencies point one way: `client -> server types only`, `server -> domain`,
`domain -> nothing`. ESLint fails the build if `src/domain` imports from the server,
the client or Node.

## How code is written

These two rules come first. Code that breaks them is not done, whatever its tests say.

1. **Functional and declarative only. Never imperative, never spaghetti.**
   - A program is modules, functions, declarations and the contracts between them.
   - A function takes data and returns data. It does one thing and is named for what it
     returns.
   - No `let`, no reassignment, no mutation of arguments or shared state, no loops that
     build a result step by step (`for`, `while`, `push`). Use `map`, `filter`,
     `flatMap`, `reduce`, `Map.groupBy`, `toSorted`.
   - Say what, not how. Rules are data: a table of declarations that one generic
     function applies, not a chain of `if` statements.
   - Flat pipelines of small named steps. No nested conditionals, no function that
     mixes several concerns.
   - Every module exports an explicit contract: its types and the few functions others
     may call. Nothing reaches into a module's internals.
   - Side effects (SQL, HTTP, the clock, the DOM) live at the edge of the system in
     thin functions. Everything they call is pure.
2. **No comments.**
   - Code that is named and shaped correctly is understood without them.
   - If a comment seems necessary, the code is wrong: rename, extract a function, or
     introduce a type until the comment has nothing left to say.
   - This covers every file: TypeScript, tests, SQL migrations and configuration.
   - When something needs describing, describe it in `doc/`: a decision record, the
     business requirements, the data model. Never next to the code.
   - ESLint enforces both rules (`no-comments`, no `let`, no loops).

**Refactoring is done one module at a time, behind its existing contract.** If a module
cannot be brought to these rules without changing what other modules see, stop and
report it: that means the architecture is wrong, and it is a decision for the author,
not something to work around.

## Rules for changing things

- **Ranking behaviour** changes in three places together: `src/domain/ranking.ts`, a test
  in `src/domain/ranking.test.ts` that fails without the change, and the matching
  entry in `doc/decisions.md`. The sample-file test in `ranking.test.ts` lists the expected
  order and scores for `engagements.json`; if it changes, say why in the commit.
- **Tests describe behaviour**, through `rankFollowUps()` or the HTTP API. Do not test
  private helpers or assert on SQL.
- **Schema** changes are a new file in `migrations/` with the next number. Never edit a
  migration that has been committed. Tables are `STRICT`.
- **Timestamps** are parsed to a point in time and stored as UTC ISO 8601
  (`new Date(x).toISOString()`). Never compare the strings from an export directly:
  they carry different offsets.
- **Identity** is the canonical profile URL from `profileKey()`. Never key anything on a
  person's name. Keep the original URL for display.
- **Engagement uniqueness** is the `UNIQUE` constraint on `engagements`. That constraint
  is what makes imports safe to repeat; do not add a code path that inserts around it.
- **Imports are all or nothing**: one transaction, any validation problem rolls it back.
- **Marks are an append-only log** (`mark_events`). Undo adds a `restored` event; nothing
  is updated or deleted.
- **The clock**: the ranking measures from the account's `asOf`, never from `Date.now()`.
  The wall clock is used only to timestamp imports and marks, and is injected into
  `createApp` so tests can fix it.
- No language model calls at runtime, no sign-in, no LinkedIn API.
- UI text is plain English for a salesperson. Reasons never mention points.

## Not in this repository yet

README.md, WORKLOG.md and REVIEW.md are written by the author, not generated.
`review-sample.ts` is the subject of that review: do not fix it and do not import it.

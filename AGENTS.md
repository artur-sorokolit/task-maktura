# Maktura follow-up list

This app turns a LinkedIn engagement export into a ranked list of people worth a phone call. The brief is [TASK.md](TASK.md). Decisions on everything the brief left open are in [doc/decisions.md](doc/decisions.md), and the tables are described in [doc/data-model.md](doc/data-model.md).

## Commands

| Command            | What it does                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| `npm start`        | Installs if needed, builds, migrates and serves on :3000                   |
| `npm run dev`      | The same server with hot reload, on :3000                                  |
| `npm run check`    | Typecheck, lint, unit and API tests. Run it before you call a change done  |
| `npm test`         | Unit and API tests only                                                    |
| `npm run test:e2e` | Browser test against a production build and a throwaway database, on :3100 |
| `npm run format`   | Prettier                                                                   |

Before the first browser test on a machine, run `npx playwright install --with-deps chromium`.

The only settings are `PORT` and `DATABASE_PATH` (default `data/maktura.sqlite`). Delete `data/` to start with an empty database.

## Layout

```
doc/             decisions and data model
migrations/      numbered .sql files, applied in order when the server starts
src/domain/      the rules, pure TypeScript with no database, network or clock
  ranking.ts       rankFollowUps(); SCORING_RULES lists what earns points and why
  normalize.ts     comparison keys for profile URLs, company names and roles
  exportSchema.ts  parseExport(), which decides whether an export file is valid
  mark.ts          the actions a user can take on a person
src/server/      Express API and SQLite
  repository/      all SQL; index.ts is what other modules may import
    accounts.ts      accounts, and the ranking input for one account
    imports.ts       importExport(), one export in one transaction
    marks.ts         the mark event log
  app.ts           createApp(); each route maps a request to a reply
  db.ts            opens the database and runs migrations
  main.ts          entry point, serves the API and the client on one port
src/client/      React app (React Router, TanStack Query, CSS Modules)
  api.ts           the only file that calls fetch
  queries.ts       the only file that uses TanStack Query
  pages/           one component per route
  components/      presentational; they get data and callbacks and never fetch
src/testing/     test data builders
e2e/             the Playwright browser test
```

Dependencies go one way. The client imports only types from the server, the server imports the domain, and the domain imports nothing. ESLint fails if `src/domain` imports from the server, the client or Node.

## How code is written

Code that breaks either of these rules is not done, even if its tests pass. ESLint enforces both.

### 1. Functional and declarative only

- A program is modules, functions, declarations and the contracts between them. It is never imperative and never spaghetti.
- A function takes data and returns data. It does one thing, and its name says what it returns.
- Do not use `let`, reassignment, mutation of arguments or shared state, or loops that build a result step by step. Use `map`, `filter`, `flatMap`, `reduce`, `Map.groupBy` and `toSorted`.
- Write rules as data. A table of declarations applied by one generic function replaces a chain of `if` statements.
- Build flat pipelines from small named steps. Do not nest conditionals or mix concerns in one function.
- Each module exports an explicit contract: its types and the few functions others may call. Other modules do not reach into its internals.
- Side effects (SQL, HTTP, the clock, the DOM) live at the edge of the system in thin functions, and everything those functions call is pure.

### 2. No comments

- Code with the right names and shape is understood without comments. If you feel one is needed, the code is wrong: rename, extract a function or add a type until the comment has nothing left to say.
- This applies to every file, including tests, SQL migrations and configuration.
- If something needs describing, describe it in `doc/` as a decision, a business requirement or part of the data model.

### Refactoring

Refactor one module at a time and keep its contract. If a module cannot meet these rules without changing what other modules see, stop and tell the author. That means the architecture is wrong, and fixing it is the author's decision.

## How documentation is written

- Write for a person who is reading the repository for the first time. Keep it short and plain.
- Do not hard-wrap lines. One paragraph or list item is one line.
- Describe the system as it is, not how it changed.

## Rules for changing things

- A change to ranking behaviour touches three things together: `src/domain/ranking.ts`, a test in `src/domain/ranking.test.ts` that fails without the change, and the matching entry in `doc/decisions.md`. One test lists the expected order and scores for `engagements.json`. If that list changes, say why in the commit.
- Tests describe behaviour through `rankFollowUps()` or the HTTP API. Do not test private helpers or assert on SQL.
- A schema change is a new file in `migrations/` with the next number. Never edit a committed migration. Every table is `STRICT`.
- Parse timestamps to a point in time and store them as UTC ISO 8601 with `new Date(x).toISOString()`. Never compare timestamp strings from an export, because they carry different offsets.
- A person's identity is the canonical profile URL from `profileKey()`. Never key anything on a name. Keep the original URL for display.
- The `UNIQUE` constraint on `engagements` is what makes an import safe to repeat. Do not add a code path that inserts around it.
- An import is all or nothing. It runs in one transaction, and any validation problem rolls it back.
- `mark_events` is an append-only log. Undo adds a `restored` event, and nothing is updated or deleted.
- The ranking measures time from the account's `asOf`, never from `Date.now()`. The real clock only timestamps imports and marks, and `createApp` takes it as a parameter so tests can fix it.
- The app makes no language model calls at runtime, has no sign-in and does not use the LinkedIn API.
- UI text is plain English for a salesperson. Reasons never mention points.

## Files the author writes

The author writes README.md, WORKLOG.md and REVIEW.md by hand. `review-sample.ts` is the subject of that review, so do not fix it or import it.

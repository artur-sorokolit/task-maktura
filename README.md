# Maktura follow-up list

A small web app that turns a LinkedIn engagement export into a ranked list of people worth a phone call, with reasons a salesperson can read. It is my answer to Part A of [TASK.md](TASK.md).

A live copy runs at https://task-maktura.onrender.com. It is on Render's free tier, so the first request after a quiet spell takes about a minute, and the database is wiped whenever the service sleeps or restarts. Import `engagements.json` again if the list is empty.

## Run it

You need Node 22 or newer.

```
npm start
```

This installs dependencies if they are missing, builds the client, applies the database migrations and serves the app on http://localhost:3000. Click "Import export" and choose `engagements.json` from the repository root.

| Command            | What it does                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `npm run dev`      | The same server with hot reload                                  |
| `npm run check`    | Typecheck, lint, unit and API tests                              |
| `npm run test:e2e` | Browser test against a production build and a throwaway database |

The browser test needs Chromium once per machine: `npx playwright install --with-deps chromium`.

The database is the file `data/maktura.sqlite`. Delete `data/` to start again from nothing. `PORT` and `DATABASE_PATH` override the defaults.

## The stack and why

Everything is TypeScript, so the client, the server and the ranking share one set of types and a change to the API shows up in the client as a compile error.

The client is React with Vite, React Router and TanStack Query. This is what I use for small apps, it is what most engineers and coding agents already know, and none of it needs explaining to the next person.

The server is Express. I chose it over newer frameworks because it is the one any Node engineer can read on day one, and this API has five routes.

The database is SQLite through better-sqlite3. The app serves one small firm's month of engagement, so a file on disk is enough, and it lets `npm start` work on a fresh clone with no Docker and no database server. Moving to Postgres later would mean rewriting one folder, `src/server/repository/`.

There is no ORM. The schema is numbered `.sql` files in `migrations/` and the queries are plain SQL in one folder. With seven tables an ORM would hide more than it saves, and the rule that makes imports safe is a `UNIQUE` constraint I wanted to be able to read in the schema.

The ranking is a pure TypeScript function, not SQL. It takes an account's stored engagements and returns the list. That keeps every rule in one file that unit tests can call directly.

## Decisions on what the brief left open

All 25 are in [doc/decisions.md](doc/decisions.md), each with the test that enforces it. These are the ones most likely to change who appears on the list.

- Profile URLs are compared in a canonical form that ignores protocol, subdomain, query string, trailing slash and case. A CRM and an export rarely write a URL the same way, and a miss would put an existing customer on a cold-call list.
- The 30 days are 30 x 24 hours measured as points in time, never as strings. Elena Rossi's reaction is written with a `+00:00` offset and falls 30 minutes inside the window. Comparing strings would drop her.
- Engagements after `asOf` are stored but not counted, because `asOf` is "now".
- A colleague is anyone whose company matches the account's after dropping case, punctuation and legal suffixes. This excludes Amir Khan at "Northgate Surveyors Ltd".
- A target role matches as whole words and ignores case. "Managing director" counts, and "COO" is not found inside "Coordinator".
- Two rows are identical when the person, post, type, moment and text match. Name and headline are left out because they change between exports. The same key is a `UNIQUE` constraint in the database, which is why importing a file twice adds nothing.
- The export with the latest `asOf` sets the date, target roles and known contacts. An older file imported later only adds its engagements.
- A file with anything wrong in it is rejected whole, and the user sees the path of each problem.
- A marked person stays off the list for good, even if they engage again. A mark can be undone from the history page, and the undo is recorded too.
- The app holds several accounts and switches between them in the header.

## What I did for the next reader

[AGENTS.md](AGENTS.md) is the entry point for a person or an agent. It has the commands, a map of the folders, and the rules for changing things. `CLAUDE.md` and `GEMINI.md` only import it, so every tool reads the same instructions.

The code follows two rules that ESLint enforces. It is functional and declarative, with no `let`, no loops and no nested ternaries. It has no comments, so anything that needs explaining is either in a name or in `doc/`.

Dependencies go one way: the client imports only types from the server, the server imports the domain, and the domain imports nothing. ESLint fails if the ranking reaches for the database, the network or Node.

The scoring is a table, `SCORING_RULES` in [src/domain/ranking.ts](src/domain/ranking.ts). Each entry gives both the points and the sentence shown to the salesperson, so a new rule is one entry and the reason cannot drift from the score.

The ranking tests call only the public function and state the rules in their names. One test lists the expected order and scores for `engagements.json`, and [doc/decisions.md](doc/decisions.md) has the same table with the arithmetic, so a reader can check the result by hand.

[doc/data-model.md](doc/data-model.md) describes each table and why it is shaped that way.

## With another day

- Refresh a person's name and headline when the same engagement arrives again in a newer export. Today the first copy is kept.
- Make the points and the 30-day window settings of an account. Today they are constants in the code.
- Show what each import added and let the user remove a wrong one.
- Run the browser test at phone width as well. The layout works on a phone, but only the desktop size is tested.
- Add a CI workflow that runs `npm run check` and the browser test on every push.
- Give the live copy a persistent disk. The app is one Node process with a file database, and the free host it runs on does not keep files.

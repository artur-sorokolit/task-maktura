# Worklog

## How I worked

I used Claude Code with Claude Opus 5.5 in VS Code for the whole build.

I did not let it start coding from the brief. I told it to ask me about every decision first, and it came back with five rounds of multiple-choice questions: the stack, then each thing the ranking rules leave open, such as how to match a company name or what counts as an identical row. My answers became [doc/decisions.md](doc/decisions.md). It then built the app and the tests in one pass.

I reviewed the result in the browser and by reading the code. After that I wrote two rules into [AGENTS.md](AGENTS.md), functional and declarative code only and no comments, and had the agent refactor one module at a time while keeping each module's contract. My check was that the existing tests had to keep passing without being edited. They did, which told me the module boundaries were right and only the insides were wrong. The agent then added ESLint rules so the two rules are enforced by `npm run check`.

Before settling on the instruction files I had it search the web for how other tools read them. That is why the rules live in `AGENTS.md` and `CLAUDE.md` and `GEMINI.md` only import it.

## What the tool got wrong

The first version of the ranking was one function of about 100 lines with loops, mutated maps and a comment on most blocks. It also built the reasons in a separate chain of `if` statements from the one that added up the score, so the two could drift apart. I caught it by reading `ranking.ts` and asking why the reasons were hardcoded. It is now a table of scoring rules where each entry gives both the points and the reason.

During the refactor the agent edited the first migration to drop a column. My local database had already applied that migration, so the next import would have failed. The agent caught this itself when it checked for an existing database, and the change became a second migration.

Two UI mistakes I caught by looking: the person card linked to LinkedIn twice, and on a phone the history table was cut off at the third column.

The commit history is not as it happened. I told the agent not to commit while it was building, and the commits were made afterwards from the finished code, split by layer. The first imperative version is not in the history.

## Time

| Part                                         | My time |
| -------------------------------------------- | ------- |
| Reading the task and creating the repository | 10 min  |
| Planning the decisions with the agent        | 10 min  |
| Reviewing the code and the interface         | 10 min  |
| Writing the rules for agents                 | 10 min  |
| Checking everything at the end               | 10 min  |
| Deploying the live copy to Render            | 5 min   |
| Total                                        | 55 min  |

The agent ran on its own for about half an hour on the first build and about fifteen minutes on the refactor. I was not watching it for most of that.

# Maktura: a task before we talk

Thanks for your interest in Maktura. Before the interview we would like to see how you build something, start to finish, on a problem shaped like our real ones. There are two parts. Part A is a build and should take no more than one working day. Part B is a short review, thirty minutes at most. Please stop at the timebox. Fewer things finished, tested and honestly described beat more things half done.

Create a new, empty repository of your own for this. You will not be given access to anything of ours, and the task does not need it.

## What Maktura does

Maktura helps small firms be visible on LinkedIn without it becoming a second job. People in the firm post in their own voice, and Maktura watches who engages. The step that matters is the last one. Out of everyone who reacted or commented this month, which handful are worth a phone call? Most tools give you numbers. We want names, with reasons.

## Part A: build the follow-up list (one working day)

Build a small web application that turns an engagement export into a follow-up list a salesperson can work from.

**Input.** The attached `engagements.json`. It holds the account that posted, the date to treat as today (`asOf`), the target roles, the profile URLs already in the CRM (`knownContacts`), the posts, and every reaction and comment on those posts.

**What it does, in priority order.** Build them in this order and stop when the day is up.

1. **Import.** The user loads an export file for an account. Importing the same file twice must not double count anything, and a later export that overlaps an earlier one must only add what is new.
2. **The list.** The application shows the people worth following up, ranked, each with name, profile URL, headline, company, score, when they last engaged, and plain-English reasons a salesperson could read without knowing the scoring.
3. **Working the list.** The user can mark a person as contacted, with a short note, or as not relevant. Either way they leave the list and stay gone after a reload and after the next import.
4. **History.** A page or panel showing who was marked, when, and the note.

**The ranking rules.**

1. A person is identified by profile URL. Display names vary.
2. Only engagements in the last 30 days count. Measure from `asOf` as a point in time: anything at or after `asOf` minus 30 days counts.
3. Exclude the account holder, anyone at the account's company, and anyone whose profile URL is in `knownContacts`.
4. Identical rows count once.
5. Score each counted engagement: a comment is worth 3, a reaction 1. Engaging with two or more different posts adds 2. A headline that mentions one of the target roles adds 3.
6. Order by score, highest first. Break ties by most recent engagement, most recent first.
7. Show the top ten by default, with a way to see everyone.

Some things are deliberately not specified. Decide, and write the decision down in your README. We would rather read a clear decision than receive a question.

**How to build it.**

- Use the stack you would choose for a product you expected to maintain for years, and say in the README why you chose it.
- Real persistence with a schema you own: SQLite or Postgres, migrations included. No ORM is required. If you use one, say why.
- Tests at two levels: unit tests on the ranking that would fail if the behaviour broke, not if the code changed, and at least one browser test that imports the file, sees the top of the list, marks someone as contacted, reloads, and confirms they are gone.
- It must run locally with one command after a clone, documented in the README. A live URL on a free tier is welcome but not required.
- No calls to a language model at runtime. No sign-in. No LinkedIn API: the export is the input.

**How we work, and what we are looking for.** We build and maintain our products with AI coding agents, and we read the repository as much as we use the application. Build it so that a fresh engineer, or a fresh agent, could open the repository cold and safely change it. Tell us in the README what you did to make that true.

**What we want in your repository.**

- The application, as above.
- `README.md`: how to run it, why the stack, the decisions you took on anything unspecified, what you did for the next reader, and what you would do next with another day.
- `WORKLOG.md`, one page at most: how you worked, including which AI tools you used and how; at least one concrete example of something a tool got wrong and how you caught it; how long each part took.
- Whatever instruction files you gave your tools: CLAUDE.md, AGENTS.md, rules, skills, prompts. Commit them. It is part of what we are looking at.
- Your commit history as it happened. Push as you go. Do not squash.

## Part B: a review (thirty minutes)

The attached `review-sample.ts` is a first attempt at the ranking, written quickly with an AI tool and not reviewed. Do not fix it. Write `REVIEW.md` in the same repository listing what is wrong with it, most serious first, in the form you would use on a pull request: what breaks, an input that shows it, and what you would ask for. Where a failing test would prove the point, describe the test in a sentence.

## Sending it

Reply with a link to your public GitHub repository containing Part A and `REVIEW.md`. If you would rather keep it private, say so and we will send a username to invite. Tell us the time you spent. There is no prize for under-reporting it.

We read the history and the worklog as closely as the code. At the interview we will ask you to walk us through one of your commits and one of your review findings.

# Data model

The schema is `migrations/*.sql`, applied in file name order when the server starts and
recorded in `schema_migrations`. A committed migration is never edited; a change is a new
numbered file. Every table is `STRICT`.

All timestamps are UTC ISO 8601 with milliseconds, so they sort and compare as text.

## accounts

One row per LinkedIn account whose engagement is tracked.

- `profile_key` is the canonical profile URL and the account's identity. `profile_url` is
  the URL as written in the export, kept for display.
- `as_of` is the moment the ranking treats as now.
- `as_of`, `name`, `company`, the target roles and the known contacts always come from
  the export with the latest `asOf` (decision 12).

`account_target_roles` keeps the roles in the order of the export (`position`), because
the first matching role is the one named in the reason. `account_known_contacts` holds
canonical profile keys.

## imports

One row per accepted file: when it was imported, its `as_of`, and how many engagement
rows it carried. How many of them were new is the number of `engagements` rows that
point at the import.

## posts

Posts of an account, keyed by the export's post id. Any import that carries a post
updates its title and publication time.

## engagements

One row per reaction or comment.

- The export has no engagement id. The `UNIQUE (account_id, profile_key, post_id, type,
at, text)` constraint is the identity of an engagement and the reason an import can be
  repeated or overlap another without counting anything twice (decisions 5 and 11).
  Name, headline and company are not part of it.
- `text` is `''` for a reaction rather than `NULL`, because SQLite treats two `NULL`s in
  a `UNIQUE` constraint as different and would let identical reactions in twice.
- `profile_key` identifies the person. `profile_url`, `person_name`, `headline` and
  `company` are what that row of the export said.

## mark_events

Append-only log of what the user did to a person. Nothing is updated or deleted.

- `action` is `contacted`, `not_relevant` or `restored`.
- A person's current state is their latest event: `contacted` and `not_relevant` hide
  them from the list, `restored` (undo) brings them back.
- `profile_url`, `person_name`, `headline` and `company` are a snapshot taken when the
  event was recorded, so the history shows the person as they were (decision 19).
- `created_at` is the real clock, not the account's `as_of`.

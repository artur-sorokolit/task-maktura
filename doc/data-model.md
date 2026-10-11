# Data model

The schema is the `.sql` files in `migrations/`. The server applies them in file name order when it starts and records each one in `schema_migrations`. A committed migration is never edited, so a schema change is always a new numbered file. Every table is `STRICT`.

All timestamps are UTC ISO 8601 with milliseconds, so they sort and compare correctly as text.

## accounts

One row per LinkedIn account whose engagement is tracked.

`profile_key` is the canonical profile URL and identifies the account. `profile_url` is the URL as the export wrote it, kept for display. `as_of` is the moment the ranking treats as now.

`as_of`, `name`, `company`, the target roles and the known contacts always come from the export with the latest `asOf` (decision 12).

`account_target_roles` keeps roles in the order of the export, in `position`, because the reason names the first role that matches. `account_known_contacts` holds canonical profile keys.

## imports

One row per accepted file, with the time it was imported, its `as_of` and the number of engagement rows it carried. The number of new rows is not stored. It is the count of `engagements` rows that point at the import.

## posts

The posts of an account, keyed by the post id from the export. Any import that carries a post updates its title and publication time.

## engagements

One row per reaction or comment.

The export has no engagement id, so the constraint `UNIQUE (account_id, profile_key, post_id, type, at, text)` is the identity of an engagement. Because of it, an import can be repeated or can overlap another one without counting anything twice (decisions 5 and 11). Name, headline and company are not part of the identity.

`text` is `''` for a reaction, not `NULL`. SQLite treats two `NULL`s in a `UNIQUE` constraint as different values, so identical reactions with `NULL` text would be stored twice.

`profile_key` identifies the person. `profile_url`, `person_name`, `headline` and `company` hold what that row of the export said.

## mark_events

An append-only log of what the user did to a person. Rows are never updated or deleted.

`action` is `contacted`, `not_relevant` or `restored`. A person's current state is their latest event. `contacted` and `not_relevant` hide them from the list, and `restored` (undo) brings them back.

`profile_url`, `person_name`, `headline` and `company` are a snapshot taken when the event was recorded, so the history shows the person as they were (decision 19). `created_at` comes from the real clock, not from the account's `as_of`.

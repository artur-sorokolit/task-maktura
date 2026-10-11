CREATE TABLE accounts (
  id          INTEGER PRIMARY KEY,
  profile_key TEXT NOT NULL UNIQUE,
  profile_url TEXT NOT NULL,
  name        TEXT NOT NULL,
  company     TEXT NOT NULL,
  as_of       TEXT NOT NULL
) STRICT;

CREATE TABLE account_target_roles (
  account_id INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  role       TEXT NOT NULL,
  PRIMARY KEY (account_id, position)
) STRICT;

CREATE TABLE account_known_contacts (
  account_id  INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL,
  PRIMARY KEY (account_id, profile_key)
) STRICT;

CREATE TABLE imports (
  id                  INTEGER PRIMARY KEY,
  account_id          INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  imported_at         TEXT NOT NULL,
  as_of               TEXT NOT NULL,
  engagements_in_file INTEGER NOT NULL,
  engagements_added   INTEGER NOT NULL
) STRICT;

CREATE TABLE posts (
  account_id   INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  post_id      TEXT NOT NULL,
  title        TEXT NOT NULL,
  published_at TEXT NOT NULL,
  PRIMARY KEY (account_id, post_id)
) STRICT;

CREATE TABLE engagements (
  id          INTEGER PRIMARY KEY,
  account_id  INTEGER NOT NULL,
  post_id     TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('reaction', 'comment')),
  profile_key TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  person_name TEXT NOT NULL,
  headline    TEXT,
  company     TEXT,
  at          TEXT NOT NULL,
  text        TEXT NOT NULL DEFAULT '',
  import_id   INTEGER NOT NULL REFERENCES imports (id) ON DELETE CASCADE,
  FOREIGN KEY (account_id, post_id) REFERENCES posts (account_id, post_id) ON DELETE CASCADE,
  UNIQUE (account_id, profile_key, post_id, type, at, text)
) STRICT;

CREATE TABLE mark_events (
  id          INTEGER PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('contacted', 'not_relevant', 'restored')),
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  person_name TEXT NOT NULL,
  headline    TEXT,
  company     TEXT
) STRICT;

CREATE INDEX mark_events_by_person ON mark_events (account_id, profile_key, id);

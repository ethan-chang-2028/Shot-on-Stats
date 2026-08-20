---
name: External MySQL connection
description: Constraints for external MySQL setup in this workspace
---

The API must validate that `DATABASE_URL` is a MySQL URL before passing it to `mysql2`; the workspace may already expose a non-MySQL `DATABASE_URL`.

**Why:** Replit workspaces can have an inherited database URL for another engine, and `mysql2` may otherwise emit warnings or attempt an invalid connection.

**How to apply:** Prefer `mysql://` or `mysql2://` URLs, fall back to the explicit `DB_*` variables, and keep the API listening so its health endpoint can report configuration or connectivity errors.
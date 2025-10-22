# NAS Database Operations

This guide documents how to capture and restore PostgreSQL backups for the NAS-hosted environment using the `pg_dump` and `pg_restore` utilities.

## Prerequisites

Install the PostgreSQL client tools on the machine where the commands will run. The scripts rely on the following environment variables:

| Variable | Description |
| --- | --- |
| `PGHOST` | NAS hostname or IP running PostgreSQL. |
| `PGPORT` | PostgreSQL port (defaults to `5432` if unset). |
| `PGDATABASE` | Target database name. |
| `PGUSER` | Role used for backup/restore operations. |
| `PGPASSWORD` | Password for `PGUSER`; you can also use a `.pgpass` file instead. |
| `PG_BACKUP_FILE` | Absolute path to the dump file on the NAS share (e.g., `/nas/backups/dogule/YYYYMMDD-HHMM.dump`). |

> **Tip:** When working directly on the NAS jump box, mount the backup share first and export the variables in your shell session.

## Creating a Backup

1. Export or source the required environment variables. Example:
   ```bash
   export PGHOST=nas-db.internal
   export PGPORT=5432
   export PGDATABASE=dogule
   export PGUSER=dogule_admin
   export PGPASSWORD=$(pass show nas/dogule/postgres_password)
   export PG_BACKUP_FILE=/nas/backups/dogule/$(date +%Y%m%d-%H%M).dump
   ```
2. Run the npm script, which wraps `pg_dump` with the above context:
   ```bash
   npm run db:backup
   ```
3. Confirm that the dump file exists on the NAS share and has the expected timestamp.

The script generates a custom-format dump (`pg_dump --format=custom`) and omits ownership metadata (`--no-owner`) so the archive can be restored under different roles.

## Restoring a Backup

1. Set the same environment variables used for backup, pointing `PG_BACKUP_FILE` to the dump archive you wish to restore.
2. Ensure the target database is not in active use. Consider terminating application connections via `psql` before proceeding.
3. Execute the restore script:
   ```bash
   npm run db:restore
   ```
4. Verify the restore by connecting with `psql` and checking critical tables.

The restore command uses `pg_restore --clean --if-exists --no-owner` to drop existing objects before recreating them, ensuring the schema matches the archive without attempting to reapply ownership.

## Troubleshooting

- If authentication fails, double-check `PGUSER`/`PGPASSWORD` or configure a `.pgpass` entry for the NAS host.
- To run the commands non-interactively in CI, inject the environment variables as job secrets.
- Use `pg_restore --list "$PG_BACKUP_FILE"` to inspect the contents of a dump before restoring.

For additional guidance, see the PostgreSQL documentation on [`pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html) and [`pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html).

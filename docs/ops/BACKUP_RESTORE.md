# Backup & restore runbook — Geleza SA

## What to back up

1. **PostgreSQL** — all school/user/academic tables (primary system of record).
2. **Uploads directory** — `uploads/` (avatars, homework, admissions docs, media).
3. **Secrets** — `.env` and Firebase service account JSON (store in a secrets manager, not git).
4. **Firebase Hosting** — rebuildable from `client/`; no exclusive data there.

## Recommended schedule

| Asset | Frequency | Retention |
|-------|-----------|-----------|
| DB logical dump (`pg_dump`) | Daily | 14–30 days |
| Uploads sync (rsync / object storage) | Daily | 30 days |
| Pre-deploy dump | Before each production migrate | 7 days |

## Backup (PostgreSQL)

```bash
# From a machine with network access to the DB
export $(grep -v '^#' .env | xargs)   # or set DATABASE_URL manually
mkdir -p backups
pg_dump "$DATABASE_URL" --format=custom --file="backups/geleza_$(date +%Y%m%d_%H%M).dump"
```

Plain SQL alternative:

```bash
pg_dump "$DATABASE_URL" --file="backups/geleza_$(date +%Y%m%d_%H%M).sql"
```

## Backup (uploads)

```bash
tar -czf "backups/uploads_$(date +%Y%m%d_%H%M).tar.gz" uploads
# Or sync to S3/GCS:
# aws s3 sync uploads/ s3://your-bucket/geleza-uploads/
```

## Restore (PostgreSQL)

```bash
# WARNING: destructive to target DB — use a staging DB first when testing
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" backups/geleza_YYYYMMDD_HHMM.dump
```

For SQL dumps:

```bash
psql "$DATABASE_URL" -f backups/geleza_YYYYMMDD_HHMM.sql
```

## Restore (uploads)

```bash
tar -xzf backups/uploads_YYYYMMDD_HHMM.tar.gz
```

## Verification checklist after restore

- [ ] `npm start` boots without schema errors
- [ ] Login as principal / teacher / parent / learner testers
- [ ] Support Desk lists tickets
- [ ] Parent Applications list loads
- [ ] One learner subject page and one report card path open
- [ ] Spot-check an upload (avatar or homework file)

## Incident notes

- Prefer restoring to a **temporary database**, validate, then swap connection strings.
- After restore, rotate JWT/session secrets only if compromise was the reason for restore.
- Document the dump filename and operator in your incident channel.

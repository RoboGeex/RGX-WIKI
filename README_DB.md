Database-backed storage (SiteGround)

Env variables
- `DATABASE_URL`: MySQL connection string (e.g., mysql://user:pass@host:3306/db)
- `USE_DB`: set to `true` to use DB for lessons API and server pages
- `USE_SHARED_DB`: optional. Set to `true` when all wikis live in one shared database and the app should ignore wiki-specific `DATABASE_URL_<WIKI>` variables.
- `STORE_MEDIA_IN_DB`: set to `true` to store uploaded binary files in DB (otherwise files go to `public/uploads` and only URLs are stored). Ignored when `UPLOAD_STRATEGY=sftp`.
- `GCS_ASSET_BUCKET`: optional. If set, `/api/upload/{id}` reads media from this Cloud Storage bucket.
- `GCS_ASSET_PREFIX`: optional Cloud Storage object prefix for migrated assets (default: `wiki-assets`).
- `UPLOAD_STRATEGY`: optional. Set to `sftp` to push uploads to an external SFTP destination instead of the local filesystem.
- `SFTP_HOST`, `SFTP_USERNAME`, `SFTP_BASE_URL`: required when `UPLOAD_STRATEGY=sftp`. Provide either `SFTP_PASSWORD` or `SFTP_PRIVATE_KEY` (with `\n` escaped) and optionally `SFTP_PASSPHRASE`, `SFTP_PORT`, `SFTP_REMOTE_DIR`.

Setup
1) Install dependencies: `npm i`
2) Generate Prisma client: `npx prisma generate`
3) Create DB schema: `npx prisma migrate deploy` (or `npx prisma migrate dev` locally)

Models
- Lessons are stored in table `Lesson` with JSON columns for prerequisites/materials/body.
- Media uploads can be stored in table `Asset` if `STORE_MEDIA_IN_DB=true`. Otherwise assets are written to the configured filesystem/SFTP target and only their URLs are stored in lessons.
- Access passwords/tokens live in table `AccessCode` (`code`, `wikiSlug`, timestamps) and are validated by `/api/unlock` when `USE_DB=true`.

Behavior
- Editor "Publish to Wiki" posts to `/api/lessons` which writes to DB if `USE_DB=true`, else to JSON file under `data/`.
- Uploads go to `/api/upload` and return a URL. If `STORE_MEDIA_IN_DB=true`, files are available at `/api/upload/{id}`. Otherwise they are written to `public/uploads/` (local) or `/uploads/{wiki}/{type}/` on the configured SFTP host when `UPLOAD_STRATEGY=sftp`.
- To test gradual migration for one wiki (example: `3d-design-using-tinkercad`) while keeping lesson links unchanged:
  - `npm run migrate:assets:gcs -- --wiki=3d-design-using-tinkercad --bucket=<your-bucket> --dry-run=true`
  - `npm run migrate:assets:gcs -- --wiki=3d-design-using-tinkercad --bucket=<your-bucket>`
  - Optional after verification: clear legacy blob payloads with `npm run clear:asset-blobs -- --confirm=true`.
  - If you have a backup and want to remove the legacy column entirely, run `npm run clear:asset-blobs -- --confirm=true --drop-column=true`.

SiteGround notes
- Ensure your app runs with a persistent Node process (not serverless) if you use filesystem uploads.
- Prefer DB storage for content. For media, filesystem or S3-like storage is recommended; DB storage is available for compliance-only cases.

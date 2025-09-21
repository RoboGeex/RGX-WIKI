Database-backed storage (SiteGround)

Env variables
- `DATABASE_URL`: MySQL connection string (e.g., mysql://user:pass@host:3306/db)
- `USE_DB`: set to `true` to use DB for lessons API and server pages
- `STORE_MEDIA_IN_DB`: set to `true` to store uploaded binary files in DB (otherwise files go to `public/uploads` and only URLs are stored)

Setup
1) Install dependencies: `npm i`
2) Generate Prisma client: `npx prisma generate`
3) Create DB schema: `npx prisma migrate deploy` (or `npx prisma migrate dev` locally)

Models
- Lessons are stored in table `Lesson` with JSON columns for prerequisites/materials/body.
- Media uploads can be stored in table `Asset` if `STORE_MEDIA_IN_DB=true`.

Behavior
- Editor “Publish to Wiki” posts to `/api/lessons` which writes to DB if `USE_DB=true`, else to JSON file under `data/`.
- Uploads go to `/api/upload` and return a URL. If `STORE_MEDIA_IN_DB=true`, files are available at `/api/upload/{id}`; otherwise they are written to `public/uploads/`.

SiteGround notes
- Ensure your app runs with a persistent Node process (not serverless) if you use filesystem uploads.
- Prefer DB storage for content. For media, filesystem or S3-like storage is recommended; DB storage is available for compliance-only cases.


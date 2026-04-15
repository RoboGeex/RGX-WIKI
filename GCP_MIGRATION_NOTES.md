# GCP Migration Notes

## 2026-04-15

- Keep Vimeo as the video hosting platform (no app-side large video upload pipeline needed).
- Reduce or remove the Next.js Server Actions request body limit currently set to `500mb` in `next.config.js`.
- Suggested target limit for normal forms/images: `10mb` to `20mb` (adjust only if real upload needs require more).
- Prefer direct-to-storage uploads for large files instead of routing large payloads through the app server.

## Keep In Mind (Cloud Run + Cloud SQL)

- Cloud Run local filesystem is ephemeral. Do not depend on `public/uploads` persistence across instance restarts.
- Keep DB connections under control with Prisma on serverless containers:
  - Use Cloud SQL connector/Unix socket correctly.
  - Use sane instance concurrency and connection limits.
- Run Prisma migrations in CI/CD (`prisma migrate deploy`) before or during rollout.
- Put secrets in Secret Manager, not in `.env` files in deployment artifacts.
- Keep all long-running or CPU-heavy jobs out of request paths (use Cloud Run Jobs/queue patterns if needed).
- Configure CORS, domain, HTTPS, and cache headers early to avoid cutover surprises.
- Add baseline observability before launch:
  - Error reporting/alerts
  - Request latency and 5xx dashboards
  - DB saturation monitoring

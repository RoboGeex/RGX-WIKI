# Google Cloud Testing Branch

This project uses two Cloud Run services:

- `robogeex-wiki-gcp`: production service, deployed from `gcp-main` / production branch.
- `robogeex-wiki-testing`: protected testing service, deployed from `testing`.

The testing service may use the same Cloud SQL database as production, but it must not be public.
Any database write made in testing is a real production-data write.

## Safe Setup

1. Create the protected testing Cloud Run service by cloning the production runtime settings.
   The testing service should use the same environment variables, secrets, Cloud SQL connection,
   VPC connector, service account, and region as production.

2. Keep `robogeex-wiki-testing` private:

   ```powershell
   gcloud run services remove-iam-policy-binding robogeex-wiki-testing `
     --region=europe-west1 `
     --member="allUsers" `
     --role="roles/run.invoker"
   ```

3. Grant access only to testers/admins:

   ```powershell
   gcloud run services add-iam-policy-binding robogeex-wiki-testing `
     --region=europe-west1 `
     --member="user:YOUR_EMAIL@example.com" `
     --role="roles/run.invoker"
   ```

4. Create a Cloud Build trigger:

   - Name: `deploy-testing`
   - Repository: this repo
   - Branch regex: `^testing$`
   - Build config: `cloudbuild.testing.yaml`

5. Production remains separate:

   - Branch regex: `^gcp-main$` or `^main$`, whichever is your production branch.
   - Build config: `cloudbuild.yaml`
   - Service: `robogeex-wiki-gcp`

## Promotion Flow

Work lands in `testing` first:

```powershell
git switch testing
git merge feature-branch
git push origin testing
```

After testing passes, promote code by merging into production:

```powershell
git switch gcp-main
git merge testing
git push origin gcp-main
```

Do not use Cloud Run traffic splitting for this testing workflow. Traffic splitting is for sending a
percentage of real production users to a revision. A separate private service keeps test code away
from real users.

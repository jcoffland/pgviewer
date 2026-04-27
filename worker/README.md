# Storage Worker

Cloudflare Worker that backs the PG Viewer Share feature. Stores gzipped
flight bundles in R2, deduplicated by SHA-256 hash, with a 90-day
lifecycle expiration.

## One-time setup

1. **Create the R2 bucket.**
   Cloudflare dashboard → R2 → Create bucket → name it `pgviewer`.

2. **Set lifecycle expiration.**
   In the bucket settings → Object Lifecycle Rules → Add rule:
   - Rule name: `expire-90d`
   - Apply to: all objects
   - Action: Delete after `90` days.

3. **(Optional) Set a usage alert** at e.g. 8 GB so you get warned before
   hitting the 10 GB free-tier ceiling.

4. **Create the Worker.**
   Workers & Pages → Create → Create Worker → name it `pgviewer-storage`
   → Deploy the placeholder. Then "Edit code" → paste the contents of
   `storage.js` → Deploy.

5. **Bind the bucket and origins.**
   Open the deployed worker → Settings → Bindings:
   - Add an **R2 Bucket** binding: variable name `BUCKET`, bucket
     `pgviewer`.
   - Add a **Variable** (plain text, not secret): name `ALLOWED_ORIGINS`,
     value e.g. `http://localhost:5173,https://pgviewer.example.com`
     (comma-separated origins; include localhost for development).
   Save and re-deploy.

6. **Configure the frontend.**
   Note the worker URL printed by Cloudflare (e.g.
   `https://pgviewer-storage.<your-subdomain>.workers.dev`). In the
   app's `.env.local`:

   ```
   VITE_STORAGE_URL=https://pgviewer-storage.<your-subdomain>.workers.dev
   ```

## Routes

- `HEAD /<hash>.bin` — 200 if object exists, 404 otherwise.
- `PUT /<hash>.bin` — store body. Returns `{ok: true, existed: true|false}`.
  Body capped at 2 MiB.
- `GET /<hash>.bin` — return the stored bytes.

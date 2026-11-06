# sachi-wfh-plan

Work-from-home plan calendar. Pick a date to see the day's work (time, title, short description).
Password-protected edit mode, yellow and black theme, interactive floating-balls background.

## How it works

- **Public page** (`public/index.html`): read-only calendar. Visitors see new changes within 30 seconds.
- **Edit mode:** a hidden name tag sits at the bottom right (same yellow as the background; it turns black on hover).
  Click it, type the 4-digit password, and edit mode opens by itself. Edit, delete or add work, then press **Save changes**.
- **API** (`api/`): Vercel serverless functions.
  - `GET /api/entries` – public, returns the saved entries
  - `POST /api/verify` – checks the edit password
  - `PUT /api/entries` – saves the entries (needs the password)
- **Storage:** one JSON value in an Upstash Redis database.
- The password is checked **on the server** (`EDIT_PASSWORD`), never stored in the page. Eight wrong tries from one IP lock it for 15 minutes.

## Deploy to Vercel

1. Push this folder to a GitHub repo (see below).
2. On vercel.com choose **Add New → Project**, import the repo, keep the defaults (Framework: *Other*), and deploy.
3. In the project go to **Storage → Create / Connect → Upstash Redis** (Marketplace, free plan).
   This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to the project automatically.
4. Go to **Settings → Environment Variables** and add `EDIT_PASSWORD` (for example `0228`).
5. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables are picked up.

If you choose a password with a different length than 4, change `PASSWORD_LENGTH` near the top of the script in `public/index.html`.
A longer password is safer than a 4-digit PIN.

## Push to GitHub

```bash
git init
git add .
git commit -m "WFH plan calendar"
git branch -M main
git remote add origin https://github.com/<your-username>/sachi-wfh-plan.git
git push -u origin main
```

Never commit `.env` files. `.gitignore` already excludes them.

## Files

```
public/index.html   the page (calendar, edit mode, background animation)
api/_lib.js         database + password helpers
api/entries.js      GET / PUT entries
api/verify.js       password check
.env.example        the environment variables you need to set on Vercel
```

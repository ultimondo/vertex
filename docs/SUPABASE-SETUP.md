# Vertex — Supabase setup (do this once)

This gets your cloud backend running. It takes ~15 minutes and needs no coding.
When you finish, send me the **two values in Step 6** and I'll wire the app to it.

> **Safety:** the **anon / publishable key** and the **Project URL** are meant to live
> in the app's public code — they're safe to share with me and to commit.
> The **`service_role` key** and your **database password** are secrets — **never**
> paste them to me, into the app, or into git.

---

## 1. Create the project
1. Go to **https://supabase.com** → sign in (you can use your Google account).
2. **New project.** Name it `vertex`. Pick a **region** close to you.
3. Set a **database password** and save it in your password manager. (You won't need it for the app.)
4. Wait ~2 minutes for it to finish provisioning.

## 2. Create the database
1. Left sidebar → **SQL Editor** → **New query**.
2. Open **`supabase/schema.sql`** from this repo, copy its entire contents, paste into the editor.
3. Press **Run**. You should see "Success. No rows returned." That built every table and security rule.

## 3. Turn on Email sign-in (with verification)
1. Left sidebar → **Authentication** → **Sign In / Providers** (or **Providers**).
2. **Email** → make sure it's **enabled**.
3. Turn **Confirm email = ON** (this is the email-verification requirement).

## 4. Turn on Google sign-in
Google needs an OAuth client. You already have a Google Cloud project from the Drive feature, so:
1. In Supabase → **Authentication → Providers → Google** → enable it. **Copy the "Callback URL"** it shows
   (looks like `https://<your-project>.supabase.co/auth/v1/callback`).
2. In a new tab, open **https://console.cloud.google.com/apis/credentials** (same project you used for Drive).
3. **Create Credentials → OAuth client ID → Web application.** Name it `Vertex Supabase Auth`.
4. Under **Authorized redirect URIs**, click **Add URI** and paste the **Callback URL** from step 1.
5. Click **Create.** Copy the **Client ID** and **Client secret**.
6. Back in Supabase's Google provider, paste the **Client ID** and **Client secret** → **Save**.

## 5. Point auth at the live site
1. **Authentication → URL Configuration.**
2. **Site URL:** `https://ultimondo.github.io/vertex/`
3. Under **Redirect URLs**, add both:
   - `https://ultimondo.github.io/vertex/`
   - `http://localhost:8756/` (for local testing)

## 6. Send me these two values
Left sidebar → **Project Settings → API**:
- **Project URL** — e.g. `https://abcdxyz.supabase.co`
- **anon public** key (the long `eyJ...` string labelled *anon* / *public* / *publishable*)

Paste those two to me. **Do not** send the `service_role` key or your database password.

## 7. Keep the project awake (do this once — it already bit us once)

Supabase **pauses a free project after 7 days with no activity**, and a paused project is **deleted
after 90 days**. Vertex now has a heartbeat so that can't happen quietly again.

1. Left sidebar → **SQL Editor → New query**.
2. Open **`supabase/003_keepalive.sql`** from this repo, paste the whole file, press **Run.**
   That adds one row and one function, `ping()` — a real (tiny) database write anyone may call.

Nothing else to do. Three things now keep it alive:

- **A nightly GitHub Action** (`.github/workflows/supabase-keepalive.yml`) calls `ping()` at 06:17 UTC
  every day. It uses only the public URL + anon key, so there are no secrets to configure.
- **The app itself** pings once a day per browser — so anyone simply *using* Vertex keeps it awake.
- **A failure alarm:** if a ping ever fails, the Action fails and **GitHub emails you** — days before
  a pause could happen. If you get one, open the
  [project dashboard](https://supabase.com/dashboard/project/fcuiaerlovooloamckot) and press **Restore**.

> **If the project is already paused,** unpausing is a dashboard-only action: sign in at
> https://supabase.com/dashboard/project/fcuiaerlovooloamckot and press **Restore project**. Your data
> comes back with it. Run step 7.2 above once it's up.

> **One long-term catch:** GitHub disables scheduled workflows in a repo with **no commits for 60 days.**
> The workflow handles this itself — if the repo has been quiet 45 days it leaves one tiny commit so the
> schedule stays enabled. (GitHub also emails you before disabling anything.)

---

Once I have those two values, I'll:
1. Add the Supabase client to the app and a sign-in screen (Google + email/password).
2. Move character storage to the cloud behind the existing `Vertex.storage` seam (guest/local mode stays).
3. Auto-import your existing local/Drive characters on first sign-in.
4. Then build Stories, invite codes, the roster, and the Host's view.

# Deploy Arntappd to Render

About 10 minutes. You need your Untappd app's Client ID and Client Secret
(from https://untappd.com/api/dashboard) and, optionally, an Anthropic API key.
Never paste these into chat or GitHub; they go only into Render's form.

## 1. Create the service

1. Go to https://dashboard.render.com and sign in with GitHub. If Render asks
   which repositories it may see, choose only `jeffpaul/arntappd`.
2. Click **New** → **Blueprint** and pick `jeffpaul/arntappd`, branch `main`.
   Render reads `render.yaml` and proposes one free web service, `arntappd`.
3. Render asks for three values:
   - `UNTAPPD_CLIENT_ID` and `UNTAPPD_CLIENT_SECRET`: from your Untappd app.
   - `ANTHROPIC_API_KEY`: your Claude API key. Leave it blank for now if you
     don't have one; the sample menu still works, but real photos won't.
   `SESSION_SECRET` is created by Render automatically.
4. Click **Apply** (or **Deploy Blueprint**). The first build takes a few
   minutes. When it shows **Live**, copy the service URL at the top, which
   looks like `https://arntappd-xxxx.onrender.com`.

## 2. Point Untappd sign-in at it

1. Open https://untappd.com/api/dashboard and edit the Arntappd app.
2. Set **Callback URL** to your Render URL plus `/api/auth/callback/untappd`,
   for example `https://arntappd-xxxx.onrender.com/api/auth/callback/untappd`.
   It must match exactly: `https`, no trailing slash.
3. Save. Untappd keeps one callback URL per app, so sign-in on
   `localhost:3000` stops working after this. That's expected.

## 3. Check it on your iPhone

1. Open the Render URL in Safari. The first load after a quiet spell can take
   about a minute (see below).
2. Tap **Try the sample menu**, then **Confirm all**. Global ratings appear.
3. Tap **Sign in with Untappd**, approve, and you land back on the app showing
   your Untappd name. Run the sample again: You and Friends ratings appear.

## Things to know

- **Free plan sleeps.** After 15 minutes without visits Render stops the
  service; the next visit wakes it in about a minute. Upgrading the service to
  a paid instance in Render removes this. Nothing in the app needs changing.
- **Sign-in survives restarts.** It lives in an encrypted cookie, so sleeping
  or redeploying does not sign you out. Sign out from the app's header.
  Signing out of Arntappd does not remove its access on Untappd; you can do
  that from your Untappd account settings.
- **Adding the Anthropic key later:** Render → arntappd → **Environment** →
  set `ANTHROPIC_API_KEY` → **Save, rebuild and deploy** (or **Save and
  deploy**).
- **Every push to `main` redeploys** automatically.
- **If something breaks:** Render → arntappd → **Logs** shows server errors
  (no keys or tokens are logged). **Events** lets you roll back to an earlier
  deploy.

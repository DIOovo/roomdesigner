# RoomFacelift Google OAuth setup

RoomFacelift delegates Google sign-in to Supabase Auth. Do not add a Google client secret to the Next.js environment.

## 1. Create the Google OAuth client

1. Open Google Cloud Console and select the intended project.
2. Configure the OAuth consent screen.
3. Create an OAuth 2.0 Client ID for a Web application.
4. Add this **Google OAuth authorized redirect URI**:

   `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`

This URI belongs to Supabase, not to the RoomFacelift Next.js application.

## 2. Enable Google in Supabase

1. Open Supabase Dashboard → Authentication → Providers → Google.
2. Enable Google.
3. Paste the Google Client ID and Client Secret into Supabase and save.

The secret stays in Supabase and must not be copied into `.env.local` or any browser-exposed variable.

## 3. Allow RoomFacelift callback URLs

In Supabase Dashboard → Authentication → URL Configuration, add these **RoomFacelift App Redirect URLs**:

- `http://localhost:3000/auth/callback`
- `https://<production-domain>/auth/callback`

Replace `<production-domain>` only after the production domain is confirmed. Keep the existing Supabase Site URL appropriate for the deployed environment.

The app continues to use only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 4. Verify

Start at `/login?next=%2F%23generator`, choose **Continue with Google**, approve access, and confirm the browser returns through `/auth/callback` to `/#generator`. Then verify `/account`, the user profile, free credits, generation history, sign-out, and a second sign-in with the same Google account.

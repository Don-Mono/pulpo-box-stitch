# Pulpo Box Fitness

Landing page exported from Stitch and prepared for Vercel + Supabase.

## Environment variables

Set these in Vercel:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Use a Supabase secret key or legacy service role key only in Vercel environment variables. Do not place it in browser code.
Use `SESSION_SECRET` with at least 32 random characters. Do not commit real admin credentials.

## Supabase table

Run `supabase_leads.sql` in the Supabase project to create the `public.leads` table with RLS enabled.

## Local run

```bash
npm install
npm run preview
```

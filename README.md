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

## Sistema de gestion

La evolucion del proyecto hacia gestion de alumnos, coaches, rutinas y progreso esta documentada en:

- `docs/sistema-gestion-plan.md`
- `docs/sistema-gestion-modelo-datos.md`
- `docs/seguridad-privacidad.md`
- `docs/operacion-desarrollo-seguro.md`

El archivo `supabase_management_schema.sql` contiene una propuesta inicial de tablas para Supabase. Revisar antes de ejecutar en produccion.

### Primera base privada

La rama de gestion incorpora una entrada privada inicial:

- `/login.html`: login central para el futuro sistema por roles.
- `/dashboard.html`: panel privado protegido por sesion.
- `/students.html`: primera base del modulo alumnos.
- `/admin.html`: panel clasico de contenido, se mantiene compatible.

Por ahora el rol activo es `admin` usando las credenciales actuales. Los roles `coach` y `student` quedan preparados para activarse en las siguientes etapas.

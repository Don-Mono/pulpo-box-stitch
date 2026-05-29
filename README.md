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
- `/coaches-admin.html`: primera base del modulo coaches.
- `/workouts.html`: primera base del modulo rutinas.
- `/api/admin/exercises`: biblioteca base de ejercicios para el creador de rutinas.
- `/exercises.html`: administracion basica de ejercicios personalizados.
- `/results.html`: primera base del modulo resultados.
- `/progress.html`: primera base del modulo progreso.
- `/medical.html`: primera base del modulo de datos medicos sensibles.
- `/coach.html`: primera vista privada para coach.
- `/student.html`: primera vista privada para alumno.
- `/admin.html`: panel clasico de contenido, se mantiene compatible.

El login acepta el admin actual por variables de entorno y tambien usuarios creados en Supabase Auth con perfil en `pb_profiles`.
Las vistas especificas de coach y alumno quedan preparadas, pero los modulos operativos siguen protegidos para admin hasta crear permisos dedicados.

La biblioteca inicial de ejercicios se genero desde `Glosario.xlsx` y queda versionada en `data/exercise-library.js`. Incluye las secciones Ejercicios, Progresiones, Movilidad y Core; los videos quedan como dato opcional para completar despues.
El creador de rutinas puede guardar varios ejercicios por rutina, manteniendo compatibilidad con rutinas simples de un solo ejercicio.
Los ejercicios personalizados se pueden agregar y desactivar desde `/exercises.html` sin borrar el historial de rutinas.
El portal alumno ya puede registrar marcas vinculadas a ejercicios concretos de sus rutinas asignadas.
El portal coach ya puede revisar resultados de sus alumnos asignados y guardar feedback tecnico sobre cada marca.

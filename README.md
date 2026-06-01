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
- `/student-detail.html`: ficha admin para editar un alumno y abrir sus modulos con contexto.
- `/coaches-admin.html`: primera base del modulo coaches.
- `/coach-detail.html`: ficha admin para editar un coach y revisar alumnos, rutinas y actividad reciente.
- `/locations-admin.html`: base privada para crear, editar y activar/desactivar sedes.
- `/workouts.html`: primera base del modulo rutinas.
- `/api/admin/exercises`: biblioteca base de ejercicios para el creador de rutinas.
- `/exercises.html`: administracion basica de ejercicios personalizados.
- `/results.html`: primera base del modulo resultados.
- `/progress.html`: primera base del modulo progreso.
- `/medical.html`: primera base del modulo de datos medicos sensibles.
- `/coach.html`: primera vista privada para coach.
- `/student.html`: primera vista privada para alumno.
- `/change-password.html`: pantalla privada para que coach y alumno actualicen su clave cuando ya tienen sesion activa.
- `/admin.html`: panel clasico de contenido, se mantiene compatible.

El login acepta el admin actual por variables de entorno y tambien usuarios creados en Supabase Auth con perfil en `pb_profiles`.
Las vistas especificas de coach y alumno quedan preparadas, pero los modulos operativos siguen protegidos para admin hasta crear permisos dedicados.

La biblioteca inicial de ejercicios se genero desde `Glosario.xlsx` y queda versionada en `data/exercise-library.js`. Incluye las secciones Ejercicios, Progresiones, Movilidad y Core; los videos quedan como dato opcional para completar despues.
El creador de rutinas puede guardar varios ejercicios por rutina, manteniendo compatibilidad con rutinas simples de un solo ejercicio.
Admin ya puede reasignar rutinas existentes a multiples alumnos activos y quitar asignaciones desde el mismo modulo de rutinas.
Admin ya puede editar y eliminar rutinas completas desde el mismo modulo, manteniendo las asignaciones como gestion separada.
Los ejercicios personalizados se pueden agregar y desactivar desde `/exercises.html` sin borrar el historial de rutinas.
El portal alumno ya puede registrar marcas vinculadas a ejercicios concretos de sus rutinas asignadas.
Admin ya puede editar y eliminar resultados desde el modulo de resultados, manteniendo validacion entre alumno, rutina y ejercicio.
Admin ya puede editar y eliminar mediciones corporales desde el modulo de progreso, manteniendo el historial mas limpio y corregible.
Admin ya puede editar y eliminar notas medicas sensibles desde el modulo medico, manteniendo consentimiento y visibilidad por rol.
El portal alumno ya puede filtrar su historial por rutina y ejercicio, ver tendencias rapidas y leer feedback del coach dentro de sus propias marcas.
El portal alumno ya muestra descripcion, enfoque y enlaces de video en los ejercicios de sus rutinas asignadas, incluyendo una vista previa al registrar marcas.
El portal alumno ya puede actualizar sus datos de contacto permitidos y su contacto de emergencia sin tocar coach, sede ni objetivo.
El portal alumno ya puede marcar cada rutina asignada como pendiente, completada u omitida, y ese estado se refleja tambien en coach y admin.
El portal coach ya puede revisar resultados de sus alumnos asignados y guardar feedback tecnico sobre cada marca.
Admin ya puede regenerar claves temporales para alumnos y coaches desde sus listados, y coach/alumno ya pueden cambiar su propia clave desde una vista privada.
Admin ya puede crear, editar y desactivar sedes, y el alta inicial de alumnos ya permite asignarles una sede desde el mismo formulario.
El coach ya cuenta con un modulo propio de rutinas para crear trabajo y asignarlo solo a sus alumnos activos.
El coach ya puede reasignar o quitar alumnos dentro de rutinas creadas por su propio perfil, manteniendo solo lectura sobre rutinas externas.
El coach ya puede editar y eliminar sus propias rutinas, manteniendo solo lectura sobre rutinas externas asignadas a sus alumnos.
El coach ya puede abrir una ficha detallada por alumno con rutinas asignadas, mediciones, marcas y notas medicas visibles para seguimiento.
La ficha del coach ya expone descripcion, enfoque y enlaces de video dentro de los ejercicios asignados al alumno para revisar tecnica sin salir de la vista.
La ficha del coach ya permite filtrar historial por rutina y ejercicio, con indicadores rapidos para leer tendencias sin salir de la vista.
El login extendido de coach y alumno ya fue validado con credenciales de Supabase Auth y perfil activo en `pb_profiles`.
Admin ya puede abrir una ficha unificada por coach, editar datos base y revisar alumnos asignados, rutinas creadas y ultimas marcas relacionadas.
Admin ya puede abrir una ficha unificada por alumno, editar datos base y saltar directo a progreso, resultados y datos medicos manteniendo el mismo `student_id` en la URL.
La ficha admin del alumno ya incluye acceso rapido al modulo de rutinas con el mismo contexto de alumno.
Los modulos admin de progreso, resultados y datos medicos ya aceptan deep-link por `student_id`, incluyendo alumnos inactivos para seguimiento administrativo.
El modulo admin de progreso ya filtra historial por rutina y ejercicio, resume tendencias rapidas y expone mejores marcas por ejercicio para cada alumno.
El modulo admin de datos medicos ya resume consentimiento, contacto de emergencia, filtros por tipo/visibilidad y una vista previa exacta de las notas compartidas con coach.

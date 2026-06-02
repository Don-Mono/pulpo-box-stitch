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
El creador de rutinas ahora incluye una primera experiencia inspirada en TeamBuild: bloques de sesion, orden manual de ejercicios, tempo, descanso y una vista previa guiada antes de guardar.
Admin ya puede reasignar rutinas existentes a multiples alumnos activos y quitar asignaciones desde el mismo modulo de rutinas.
Admin ya puede editar y eliminar rutinas completas desde el mismo modulo, manteniendo las asignaciones como gestion separada.
Los ejercicios personalizados se pueden agregar y desactivar desde `/exercises.html` sin borrar el historial de rutinas.
El portal alumno ya puede registrar marcas vinculadas a ejercicios concretos de sus rutinas asignadas.
El portal alumno y la ficha operativa del coach ya muestran la rutina en formato guiado paso a paso, con navegacion entre ejercicios, descripcion, video y accion rapida para registrar la marca del ejercicio activo.
El portal alumno ahora se organiza como una experiencia tipo app con modulos internos de Rutina, Progreso, Salud y Perfil, manteniendo el mismo backend y sin tocar la landing publica.
Admin ya puede editar y eliminar resultados desde el modulo de resultados, manteniendo validacion entre alumno, rutina y ejercicio.
Admin ya puede editar y eliminar mediciones corporales desde el modulo de progreso, manteniendo el historial mas limpio y corregible.
El modulo de progreso ya incluye graficos ligeros de evolucion corporal para peso y cintura, sin depender de librerias externas.
El modulo de progreso ya incluye graficos ligeros de rendimiento para carga, repeticiones y tiempo, usando el filtro activo de rutina/ejercicio para leer mejor la tendencia.
Admin ya puede editar y eliminar notas medicas sensibles desde el modulo medico, manteniendo consentimiento y visibilidad por rol.
El portal alumno ya puede filtrar su historial por rutina y ejercicio, ver tendencias rapidas y leer feedback del coach dentro de sus propias marcas.
El historial de progreso del alumno ahora pagina sus resultados por pagina, cantidad de filas y filtros por rutina/ejercicio desde backend para mantener una experiencia fluida al crecer el volumen de marcas.
El portal alumno ya muestra descripcion, enfoque y enlaces de video en los ejercicios de sus rutinas asignadas, incluyendo una vista previa al registrar marcas.
El portal alumno ya puede actualizar sus datos de contacto permitidos y su contacto de emergencia sin tocar coach, sede ni objetivo.
El modulo Salud del alumno ya muestra informacion base, contacto de emergencia, visibilidad hacia coach y observaciones medicas registradas por el equipo.
El portal alumno ya puede marcar cada rutina asignada como pendiente, completada u omitida, y ese estado se refleja tambien en coach y admin.
El portal alumno ahora exige al menos una marca, tiempo, ronda, texto o nota antes de guardar un resultado, y opcionalmente puede marcar la rutina como completada al registrar esa marca.
La rutina guiada del alumno ahora recuerda el paso activo por sesion y, al guardar una marca, puede dejar enfocado el siguiente ejercicio para sostener mejor el flujo en movil.
El portal coach ya puede revisar resultados de sus alumnos asignados y guardar feedback tecnico sobre cada marca.
Admin ya puede regenerar claves temporales para alumnos y coaches desde sus listados, y coach/alumno ya pueden cambiar su propia clave desde una vista privada.
Admin ya puede crear, editar y desactivar sedes, y el alta inicial de alumnos ya permite asignarles una sede desde el mismo formulario.
El coach ya cuenta con un modulo propio de rutinas para crear trabajo y asignarlo solo a sus alumnos activos.
El coach ya puede reasignar o quitar alumnos dentro de rutinas creadas por su propio perfil, manteniendo solo lectura sobre rutinas externas.
El coach ya puede editar y eliminar sus propias rutinas, manteniendo solo lectura sobre rutinas externas asignadas a sus alumnos.
El modulo de rutinas del coach ahora soporta busqueda, filtro por alumno/nivel y paginacion para sostener mejor el crecimiento operativo desde su propio panel.
Los modulos privados principales ahora incluyen una capa responsive adicional para movil en panel alumno, ficha coach y creador de rutinas.
El coach ya puede abrir una ficha detallada por alumno con rutinas asignadas, mediciones, marcas y notas medicas visibles para seguimiento.
La ficha del coach ya expone descripcion, enfoque y enlaces de video dentro de los ejercicios asignados al alumno para revisar tecnica sin salir de la vista.
La ficha del coach ya permite filtrar historial por rutina y ejercicio, con indicadores rapidos para leer tendencias sin salir de la vista.
El portal coach ahora se organiza como una experiencia tipo app con modulos internos de Alumnos, Seguimiento, Feedback y Perfil, manteniendo el mismo backend y sin tocar la landing publica.
El modulo Seguimiento del coach ahora pagina los resultados por pagina, cantidad de filas y filtro por alumno desde backend, para que el panel siga siendo operativo cuando aumente el volumen por sede.
La ficha individual `coach-student` ahora tambien se organiza como una experiencia modular de Perfil, Rutina, Progreso y Salud para seguir a cada alumno con menos friccion.
La ficha individual `coach-student` ahora pagina las marcas por pagina, cantidad de filas y filtros por rutina/ejercicio desde backend, para sostener historiales largos por alumno sin recargar toda la vista.
El login extendido de coach y alumno ya fue validado con credenciales de Supabase Auth y perfil activo en `pb_profiles`.
Admin ya puede abrir una ficha unificada por coach, editar datos base y revisar alumnos asignados, rutinas creadas y ultimas marcas relacionadas.
El modulo admin de coaches ahora soporta busqueda, filtro de estado y paginacion desde backend, para sostener mejor la operacion cuando crezca el equipo por sede o unidad de negocio.
Admin ya puede abrir una ficha unificada por alumno, editar datos base y saltar directo a progreso, resultados y datos medicos manteniendo el mismo `student_id` en la URL.
La ficha admin del alumno ya incluye acceso rapido al modulo de rutinas con el mismo contexto de alumno.
El modulo admin de alumnos ahora soporta busqueda, filtros por coach/sede/estado y paginacion desde backend, para sostener mejor el crecimiento operativo por sucursal.
Los modulos admin de progreso, resultados y datos medicos ya aceptan deep-link por `student_id`, incluyendo alumnos inactivos para seguimiento administrativo.
El modulo admin de progreso ya filtra historial por rutina y ejercicio, resume tendencias rapidas y expone mejores marcas por ejercicio para cada alumno.
El modulo admin de datos medicos ya resume consentimiento, contacto de emergencia, filtros por tipo/visibilidad y una vista previa exacta de las notas compartidas con coach.
El modulo admin de resultados ahora usa paginacion por pagina y cantidad de filas configurable, para que el historial siga siendo operativo cuando aumente el volumen por sede.
El modulo admin de rutinas ahora soporta busqueda, filtro por alumno/nivel y paginacion desde backend para ordenar mejor la operacion cuando la biblioteca de sesiones crezca.
Los creadores de rutinas de admin y coach ahora exigen al menos un ejercicio por sesion y exponen `time cap` como dato visible dentro del armado.

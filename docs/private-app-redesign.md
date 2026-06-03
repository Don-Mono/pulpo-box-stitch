# Rediseño visual del sistema privado

## Objetivo

Acercar el sistema privado de Pulpo Box a una experiencia tipo app fitness premium, usando la estetica oscura con acento amarillo de marca, sin tocar la landing publica ni romper los flujos existentes de login, alumno, coach y admin.

## Alcance FASE 1

- Crear una capa visual privada reutilizable con `private-app.css`.
- Crear utilidades vanilla en `private-app.js` para helpers de UI, estados, bottom nav y accesibilidad ligera.
- Aplicar la capa visual solo a rutas privadas post-login.
- Priorizar la experiencia alumno mobile-first en `/student.html`.
- Agregar modulo `Calendario` FASE 1 en el portal alumno usando rutinas asignadas y `workout_date`/`assigned_at`.
- Mantener datos reales actuales: rutinas, resultados, progreso, salud, perfil, coach, sede y estado de asignacion.
- Mantener `video_url` como enlace existente. La subida real de videos queda para FASE 2.

## Rutas afectadas

- `/dashboard.html`
- `/student.html`
- `/coach.html`
- `/coach-student.html`
- `/workouts.html`
- `/coach-workouts.html`
- `/exercises.html`
- `/progress.html`
- `/medical.html`
- `/students.html`
- `/student-detail.html`
- `/coaches-admin.html`
- `/coach-detail.html`
- `/locations-admin.html`
- `/change-password.html`

## Rutas no modificadas

- `/index.html`
- `/login.html`
- `/admin.html`

## Decisiones visuales

- Tema oscuro premium con negro, charcoal y bordes sutiles.
- Acento principal amarillo Pulpo Box para acciones, tabs activos y estados destacados.
- Tarjetas redondeadas con sombra suave y gradientes ligeros.
- Navegacion inferior mobile para pantallas privadas generales.
- En el portal alumno se mantiene una bottom nav propia por modulos: rutina, progreso, calendario, salud y perfil.
- Estados vacios elegantes en calendario y modulos sin datos.
- No se usan las imagenes de referencia como assets finales; solo se replica la linea visual con HTML/CSS/JS.

## Funciones actuales reutilizadas

- Login y sesion por `/api/auth/*`.
- Portal alumno desde `/api/student/overview`.
- Rutinas asignadas y estados `assigned`, `completed`, `skipped`.
- Ejercicios de rutina, `block_label`, `video_url`, `rest_label`, `tempo_label` y `time_cap_seconds`.
- Registro de resultados del alumno.
- Actualizacion permitida de telefono y contacto de emergencia.
- Mediciones corporales, notas medicas y resumen de progreso actuales.
- Modulos coach/admin ya existentes, sin reescribir backend.

## Pendiente FASE 2

- Calendario real con reservas, cupos, asistencia y cancelaciones.
- Tablas nuevas sugeridas: `pb_class_types`, `pb_class_sessions`, `pb_class_reservations`, `pb_attendance`, `pb_calendar_events`.
- Salud avanzada: grasa corporal, masa muscular, hidratacion, sueño, estres, molestias, medicamentos separados, lesiones separadas y fotos de progreso.
- Supabase Storage para fotos de progreso y videos de ejercicios.
- Biblioteca avanzada con categorias, tags, miniaturas, progresiones/regresiones e importador Excel desde admin.
- Notificaciones: vencimiento de plan, mensajes del coach, cambios de horario y recordatorios.
- Perfil avanzado con preferencias, horarios, logros, documentos firmados y planes/pagos.

## Checklist manual FASE 1

- Login admin funciona.
- Login coach funciona.
- Login alumno funciona.
- Alumno entra a `/student.html`.
- Alumno puede ver rutina.
- Alumno puede cambiar tabs.
- Alumno ve calendario FASE 1 sin reservas reales.
- Alumno puede registrar resultado.
- Alumno puede marcar rutina completada u omitida.
- Alumno puede editar telefono y contacto de emergencia.
- Salud carga sin romper si faltan datos.
- Progreso carga sin romper si no hay registros.
- Coach entra a su panel.
- Admin sigue entrando a dashboard/admin.
- Landing publica sigue igual.
- Mobile bajo 430px mantiene navegacion usable.
- Desktop mantiene lectura clara.
- No hay secretos expuestos en frontend.

## Prueba local

```bash
npm install
npm run preview
```

Abrir:

- `http://127.0.0.1:3002/login.html`
- `http://127.0.0.1:3002/student.html`
- `http://127.0.0.1:3002/workouts.html`
- `http://127.0.0.1:3002/coach.html`

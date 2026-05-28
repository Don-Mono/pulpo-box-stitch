# Plan de trabajo - Sistema de gestion Pulpo Box

Este documento define la ruta para transformar la landing actual en una plataforma privada de gestion para administradores, coaches y alumnos, sin interrumpir la pagina publica.

## Objetivo

Mantener la pagina publica funcionando como canal comercial y agregar un sistema privado donde cada usuario vea solo lo que corresponde.

```mermaid
flowchart TD
  A[Landing publica] --> B[Login]
  B --> C{Rol de usuario}
  C --> D[Admin]
  C --> E[Coach]
  C --> F[Alumno]
  D --> G[Gestion de alumnos, coaches, rutinas, sedes y contenido]
  E --> H[Asignar rutinas y revisar resultados]
  F --> I[Ver rutinas, videos y registrar progreso]
```

## Principios del proyecto

- La landing actual no se reemplaza ni se rompe.
- Todo desarrollo nuevo se hace en rama separada y preview de Vercel.
- Produccion solo se actualiza cuando una etapa esta revisada.
- Los datos sensibles se guardan con permisos por rol.
- Los videos se alojan en un servicio preparado para streaming; Supabase guarda metadatos y enlaces.

## Roles

### Admin

- Gestiona alumnos.
- Gestiona coaches.
- Gestiona sedes.
- Crea y edita rutinas.
- Revisa progreso general.
- Mantiene contenido visible de la landing.

### Coach

- Ve alumnos asignados.
- Crea rutinas y ejercicios.
- Agrega videos o enlaces.
- Revisa pesos, tiempos, repeticiones y notas.
- Hace seguimiento individual.

### Alumno

- Ve sus rutinas.
- Revisa videos y descripciones.
- Registra resultados.
- Consulta historial y progreso.
- Actualiza datos basicos permitidos.

## Etapas recomendadas

### Etapa 0 - Seguridad y base

Estado: en preparacion.

- Mantener repositorio privado.
- Confirmar variables de entorno.
- Documentar arquitectura.
- Crear esquema inicial de base de datos.
- Definir permisos por rol.

### Etapa 1 - Login por rol

Estado: base inicial creada.

- Mantener login administrador actual.
- Preparar login extendido para coaches y alumnos.
- Crear rutas privadas:
  - `/admin`
  - `/coach`
  - `/alumno`
- Redirigir segun rol.
- Bloquear rutas privadas sin sesion.

Primera implementacion:

- `/login.html`: entrada central al sistema.
- `/dashboard.html`: panel privado protegido.
- `/admin.html`: panel clasico de contenido, se mantiene disponible.
- Rol activo inicial: `admin`.
- Roles preparados para siguientes etapas: `coach`, `student`.

### Etapa 2 - Alumnos y coaches

- Crear alumnos.
- Editar alumnos.
- Desactivar alumnos sin borrar historial.
- Crear coaches.
- Asignar coach principal a cada alumno.
- Ver ficha del alumno.

### Etapa 3 - Rutinas

- Crear rutinas por dia o semana.
- Agregar ejercicios.
- Agregar descripcion escrita.
- Agregar enlace de video.
- Asignar rutina a uno o varios alumnos.

### Etapa 4 - Registro de resultados

- Registrar peso usado.
- Registrar repeticiones.
- Registrar tiempo.
- Registrar rondas.
- Registrar notas del alumno.
- Registrar feedback del coach.

### Etapa 5 - Progreso

- Historial por ejercicio.
- Grafico de progreso.
- Peso corporal.
- Estatura.
- Medidas opcionales.
- Marcas personales.

### Etapa 6 - Datos medicos

- Lesiones.
- Restricciones.
- Medicamentos relevantes si el alumno acepta informarlo.
- Contacto de emergencia.
- Consentimiento de tratamiento de datos sensibles.

### Etapa 7 - Mejoras futuras

- Pagos.
- Asistencia.
- Notificaciones por WhatsApp.
- Reportes mensuales.
- App movil si el flujo lo justifica.

## Rutas propuestas

```text
/                 Landing publica
/login            Entrada privada
/admin            Panel administrador
/admin/alumnos    Gestion de alumnos
/admin/coaches    Gestion de coaches
/admin/rutinas    Gestion de rutinas
/coach            Panel coach
/coach/alumnos    Alumnos asignados
/coach/rutinas    Rutinas creadas
/alumno           Panel alumno
/alumno/rutina    Rutina actual
/alumno/progreso  Historial y mediciones
```

## Regla de oro para avanzar

Cada etapa debe cumplir esto antes de pasar a la siguiente:

- No rompe la landing.
- Funciona en preview.
- Tiene permisos correctos.
- Esta documentada.
- Se puede revertir sin perder datos.

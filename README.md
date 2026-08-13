# Jornadas del Bienestar · Secretaría de Bienestar Sonora

Micrositio institucional para consulta territorial, resultados y evidencias de las Jornadas del Bienestar en Hermosillo, Sonora.

## Arquitectura
- Frontend estático: HTML5, CSS3 y JavaScript.
- Mapa: Leaflet + OpenStreetMap.
- Backend independiente: Supabase **JORNADAS**.
- Auth: Supabase Auth con perfiles `admin` y `capturista`.
- Autorización: Row Level Security (RLS) en PostgreSQL.
- Evidencias: Supabase Storage privado, con acceso regulado por políticas.
- Trazabilidad: bitácora de cambios en base de datos.

## Roles
- **Administrador:** administración integral, publicación, eliminación, usuarios y bitácora.
- **Capturista:** creación y edición de borradores y carga de evidencias.
- **Público:** lectura exclusiva de jornadas publicadas.

## Seguridad
La web utiliza únicamente una **publishable key** de Supabase. No contiene `service_role`, secret keys ni credenciales con privilegios elevados. La autorización se hace en Supabase mediante Auth y RLS; no depende de ocultar controles en el navegador.

## Acceso
- Sitio público: `/jornadas/`
- Panel interno: `/jornadas/admin/`

La primera cuenta administrativa se activa únicamente con el correo autorizado configurado para el sistema.

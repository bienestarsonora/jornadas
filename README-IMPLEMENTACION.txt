JORNADAS DEL BIENESTAR · VERSIÓN PREMIUM + SUPABASE
====================================================

ESTADO DEL BACKEND
- Proyecto Supabase independiente: JORNADAS
- URL: https://zaticxkysgobkyhebmhf.supabase.co
- Base de datos, Auth, RLS, Storage privado y bitácora creados.
- Security Advisor: 0 hallazgos al momento de generar este paquete.
- El frontend usa únicamente la publishable key. NO contiene service_role ni secret keys.

ARCHIVOS
- index.html / styles.css / app.js: micrositio público premium.
- admin/: panel autenticado de administración.
- assets/logo-bienestar.jpg: logo institucional proporcionado.
- config.js: URL y publishable key del proyecto JORNADAS.

ROLES
ADMIN
- Crear, editar, publicar y eliminar jornadas.
- Subir y administrar evidencias.
- Invitar/desactivar capturistas.
- Consultar bitácora.

CAPTURISTA
- Acceso autenticado.
- Captura y edición operativa.
- Sin eliminación de jornadas.
- Sin administración de usuarios.
- La interfaz limita las jornadas publicadas al administrador; la base aplica control adicional al flujo de publicación.

PASO MANUAL NECESARIO EN SUPABASE AUTH
La integración disponible no permite modificar la pantalla Auth > URL Configuration. En Supabase, proyecto JORNADAS:
1. Authentication > URL Configuration.
2. Site URL:
   https://bienestarsonora.github.io/jornadas/
3. Agregar a Redirect URLs:
   https://bienestarsonora.github.io/jornadas/
   https://bienestarsonora.github.io/jornadas/admin/

PRIMER ADMINISTRADOR
Después de publicar estos archivos:
1. Abrir:
   https://bienestarsonora.github.io/jornadas/admin/?setup=1
2. Usar exclusivamente el correo autorizado:
   arnoldoacun@gmail.com
3. Crear una contraseña de mínimo 12 caracteres.
4. Confirmar el correo si Supabase lo solicita.
5. Iniciar sesión normalmente en /jornadas/admin/.

La base solo permite la activación inicial como admin a ese correo confirmado y únicamente mientras no exista otro administrador activo.

DESPUÉS DEL PRIMER ADMIN
Recomendación: Authentication > Providers > Email y desactivar nuevos registros públicos (Allow new users / Sign ups), porque los capturistas se crearán por invitación desde el panel del administrador.

IMÁGENES
- Bucket: jornadas-evidencias
- Privado.
- Máximo 8 MB por imagen.
- Tipos admitidos: JPG, PNG y WebP.
- Los archivos no dependen de localStorage ni se incrustan en la página.

IMPORTANTE
El repositorio GitHub conectado a este chat permite lectura pero no escritura. Por eso este paquete está listo para reemplazar los archivos del repositorio bienestarsonora/jornadas conservando la estructura de carpetas.

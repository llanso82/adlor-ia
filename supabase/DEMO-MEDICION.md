# Medición de la demo

Primero aplicar `0003_demo_measurement.sql` en el proyecto Supabase existente `bciiywoszpssauxvbkar`. No requiere otra base, suscripción, clave privada ni permiso de lectura pública. Luego desplegar el frontend y verificar los eventos con `qa=1` antes de usar enlaces comerciales. Sin migración aplicada la medición de visitas no funciona: no reportar ceros.

Enlaces: `/demo/?utm_source=prospectos|usem|bni&utm_medium=email&utm_campaign=adlor-demo-20261023`. Prospectos puede añadir `utm_content=B-04` u otro ID activo autorizado. Los desconocidos se clasifican como `directo`. No incluir nombre, correo ni empresa en la URL.

Se cuentan sesiones por pestaña/origen de hasta 30 minutos, no personas únicas. Las recargas y reintentos usan la misma clave UUID y el servidor ignora duplicados. Correo y WhatsApp registran intenciones por canal/sesión, no mensajes enviados. Do Not Track y Global Privacy Control omiten esos eventos; bloqueadores o red pueden reducir el conteo. Enlaces reenviados conservan su origen, que no prueba identidad.

Las solicitudes reales son filas aceptadas en `visitors` con `source=demo:prospectos|demo:usem|demo:bni|demo:directo`. No dependen de FormSubmit ni implican cita acordada. `qa=1` escribe eventos `is_test=true` y solicitudes `source=demo-qa:...`; excluirlas siempre. Los reintentos de formulario tras un resultado incierto conservan el UUID mientras siga abierta la página. Si se recarga en ese estado, comprobar manualmente antes de reenviar.

Para resultados usar `demo_report.sql` con fechas UTC reales, vía acceso del propietario; no cambiar RLS para leer desde el navegador. La consulta devuelve sólo agregados. Ver el detalle de solicitudes únicamente desde el panel privado y dar seguimiento con permiso de la persona. Correos recibidos por fuera del formulario, reuniones acordadas y ventas requieren evidencia independiente. No sumarlos automáticamente ni confundirlos con clics.

No hay email automático de aviso para este formulario: las solicitudes quedan en Supabase. El operador debe revisar el panel privado. No anunciar seguimiento automático de solicitudes del formulario hasta verificar ese acceso en la rutina.

Pruebas de cliente: `node tests/demo-measurement.test.mjs`. Pruebas SQL: `tests/demo-measurement-db.sql`, **sólo en base local nueva y desechable**, nunca en Supabase ni en una base con datos. Comprueban permisos, límites e idempotencia.

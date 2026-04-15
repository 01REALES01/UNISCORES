# Ideas - Notificaciones

## Iconos dinámicos por deporte
- Cambiar el icono genérico `<Zap>` de las notificaciones `score_update` por un `<SportIcon>` que lea `metadata.sport`
- Ejemplo: balón de fútbol para goles, balón de volley para sets
- Archivos a modificar: `notification-bell.tsx`, `notificaciones/page.tsx`

## Notificaciones personalizadas por jugador
- Si un usuario está vinculado como jugador, notificarle cuando su equipo/partido tiene cambios
- Podría usar la tabla `jugadores` con `profile_id` para filtrar

## Sonidos diferenciados
- Sonido distinto para gol vs set terminado vs partido finalizado

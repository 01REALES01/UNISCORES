# Bug: Perfil de atleta no es clickeable en partidos de natación

## Síntoma

En la vista pública de un partido de natación (`/partido/[id]`), el nombre del atleta aparece pero **no lleva a su perfil** al hacer clic. El enlace a `/perfil/{profile_id}` solo se activa cuando `p.profile_id` tiene valor; actualmente siempre es `undefined`.

## Causa raíz

El problema está en `src/app/api/admin/import-natacion/route.ts`.

Al importar el Excel, cada participante se construye así (líneas ~254-261):

```ts
const participante = {
    id: generateShortId(),
    nombre: nombre,
    carrera: carreraMatched,
    carrera_id: carreraId,
    estado: 'pending',
    puntos: 0,
    jugador_id: playerId   // ← se agrega aquí...
};
```

Luego, antes de guardar en `marcador_detalle`, se **elimina** `jugador_id` (línea ~306):

```ts
let finalParticipantes = participantes.map(p => {
    const clone = { ...p };
    delete clone.jugador_id; // ← limpieza interna
    return clone;
});
```

El campo `profile_id` **nunca se busca ni se guarda**. La tabla `jugadores` sí tiene una columna `profile_id` (UUID que apunta a `profiles`), pero el import no la lee.

## Archivos relevantes

| Archivo | Línea | Qué hace |
|---|---|---|
| `src/app/api/admin/import-natacion/route.ts` | ~200–260 | Crea/busca jugador, construye objeto participante — **falta leer `profile_id`** |
| `src/app/partido/[id]/page.tsx` | ~465–480 | Renderiza la tarjeta; activa el link solo si `p.profile_id` existe |
| `src/shared/components/race-control.tsx` | ~460–475 | Mismo chequeo en el panel admin |

## Fix propuesto

En `import-natacion/route.ts`, al hacer el upsert/select del jugador, leer también su `profile_id` e incluirlo en el objeto participante:

```ts
// Buscar jugador existente
const { data: existing } = await supabase
    .from('jugadores')
    .select('id, profile_id')           // ← agregar profile_id
    .eq('nombre', nombre)
    .eq('carrera_id', carreraId)
    .limit(1)
    .maybeSingle();

// Al crear uno nuevo, hacer select del profile_id también
const { data: created } = await supabase
    .from('jugadores')
    .insert({ nombre, carrera_id: carreraId, ... })
    .select('id, profile_id')           // ← agregar profile_id
    .single();

// Construir participante
const participante = {
    id: generateShortId(),
    nombre,
    carrera: carreraMatched,
    carrera_id: carreraId,
    profile_id: jugadorData.profile_id ?? null,  // ← nuevo campo
    estado: 'pending',
    puntos: 0,
    jugador_id: playerId,
};
```

El campo `profile_id` debe **quedarse** en el objeto final guardado en `marcador_detalle.participantes[]` (a diferencia de `jugador_id` que se limpia).

## Consideración adicional

Para los partidos que ya fueron importados **sin** `profile_id`, los participantes existentes en `marcador_detalle` no tendrán el campo. Habrá que correr un script de backfill o re-importar.

Script de backfill sugerido (SQL):

```sql
-- Para cada partido de natación finalizado/programado,
-- actualizar profile_id en marcador_detalle.participantes
-- uniéndose con jugadores por nombre + carrera_id
-- (requiere lógica en app layer o función plpgsql si el JSON es complejo)
```

O hacerlo desde la app: iterar partidos con `marcador_detalle->>'tipo' = 'carrera'`,
para cada participante con `jugador_id` conocido, leer `jugadores.profile_id` y parchear el JSON.

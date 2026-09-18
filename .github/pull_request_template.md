## Qué cambia

<!-- Una o dos frases. Qué hace este PR y por qué. -->

## Tipo

- [ ] `fix` — corrige un bug
- [ ] `feat` — funcionalidad nueva
- [ ] `docs` — sólo documentación
- [ ] `chore` — tooling, CI, mantenimiento
- [ ] **breaking** — rompe compatibilidad con proyectos que ya usan el Tridente

## Comprobaciones

- [ ] Edité `protocol/tridente.spec.json`, **no** los archivos generados
- [ ] `node scripts/sync.mjs` ejecutado y los archivos regenerados están en el commit
- [ ] `node scripts/sync.mjs --check` pasa
- [ ] `node scripts/validate.mjs` da **>= 95 / 100**
- [ ] `node --test` pasa
- [ ] Si toqué los scripts de inicialización: hay una prueba de paridad Bash ↔ PowerShell
- [ ] Si añadí una herramienta de IA: está en `adapters[]` del spec **y** en el mapa de adaptadores de los dos scripts

## Puntaje del validador

```
<!-- Pega aquí la salida de: node scripts/validate.mjs -->
```

## Notas para quien revise

<!-- Decisiones discutibles, alternativas descartadas, contexto que no se ve en el diff. -->

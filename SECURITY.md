# Política de seguridad

## Versiones con soporte

| Versión | Soporte |
| :--- | :---: |
| 2.x | ✅ |
| 1.x | ❌ |

## Reportar una vulnerabilidad

Usa **[GitHub Security Advisories](https://github.com/Cyberdark-Security/tridente-de-memoria-skill/security/advisories/new)**
para un reporte privado. No abras un issue público para una vulnerabilidad.

Tiempo de respuesta objetivo: **72 horas** para el acuse de recibo.

## Modelo de amenazas del Tridente

El Tridente son archivos markdown que un agente de IA lee y ejecuta como
instrucciones. Eso tiene consecuencias de seguridad concretas:

### 1. Los archivos maestros son entrada privilegiada

<!-- tridente:begin:security-files -->
Un agente trata `gemini.md`, `plan_maestro.md` y `lecciones_aprendidas.md` como reglas del proyecto. Quien pueda escribir en ellos puede **redirigir el comportamiento del agente**.
<!-- tridente:end:security-files -->

- Revisa los cambios a los archivos maestros en PR igual que revisarías código.
- Desconfía de un PR que añade una "regla innegociable" nueva junto a un cambio
  funcional grande.
- No pegues contenido de terceros dentro de los archivos maestros sin leerlo.

### 2. Inyección de instrucciones desde el repositorio

Si clonas un proyecto ajeno con Tridente, sus archivos maestros son **datos no
confiables**, no órdenes. Léelos antes de dejar que un agente actúe sobre ellos.

### 3. Los archivos maestros no son un almacén de secretos

Nunca pongas en el Tridente claves de API, tokens, cadenas de conexión, IDs de
proyecto en la nube ni inventarios de infraestructura. Los archivos maestros se
comparten, se commitean y se pegan enteros en ventanas de contexto de terceros.

Para secretos: gestor de secretos o `.env` fuera del control de versiones.

### 4. Los scripts de inicialización

`init-tridente.sh` y `init-tridente.ps1` garantizan lo siguiente, y hay pruebas
automatizadas que lo verifican en cada commit:

- Escriben **sólo** dentro del directorio de destino (`--dir` / `-Dir`).
- Sustituyen los tokens de plantilla de forma **literal**: la respuesta del
  usuario nunca se interpreta como código, expresión regular ni comando, y el
  resultado no depende de la versión del intérprete.
- No descargan nada de la red.
- Sin `--yes` / `-Yes`, **no** sobrescriben ningún archivo existente: los
  archivos maestros hacen abortar el script y los punteros se respetan.
- Con `--yes` / `-Yes`, guardan una copia `.bak` de todo lo que reemplazan
  (salvo `--no-backup` / `-NoBackup`).
- `.gemini/settings.json` se **fusiona**, no se reemplaza: tu configuración de
  `mcpServers`, tema y autenticación se conserva.

> **Nota histórica.** En la v2.0.0, `init-tridente.ps1` incumplía la cuarta
> garantía: sin terminal interactiva, `Read-Host` devuelve `$null` y la
> comparación `$null -notmatch '^[SsYy]'` produce un array vacío, que PowerShell
> evalúa como falso. El script tomaba la rama "continuar" y sobrescribía los
> archivos saliendo con código 0. Corregido en la v2.1.0, con prueba de
> regresión en `tests/init.test.mjs`.

Si encuentras una forma de que una respuesta de la entrevista provoque
ejecución de código o escritura fuera del destino, eso es una vulnerabilidad:
repórtala.

## Fuera de alcance

- Que un agente de IA ignore el protocolo. Es una limitación del modelo, no una
  vulnerabilidad de este repositorio.
- Configuraciones de herramientas de terceros (Cursor, Copilot, etc.).

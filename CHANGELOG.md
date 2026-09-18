# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

Fechas en `YYYY-MM-DD` (ISO 8601), igual que los archivos maestros del Tridente.

## [2.5.1] — 2026-09-17

Remate de la sexta ronda de auditoría.

### Corregido

- El constructor del conjunto de marcadores no aplicaba la exclusión de enlaces
  markdown que su propio comentario prometía y que su check hermano sí aplicaba:
  colaba el texto de dos enlaces y la sintaxis  de un manifiesto de
  PowerShell. Los marcadores sólo se extraen ya de artefactos markdown.
- Una respuesta de dos letras distintas (, ) contaba como sección
  vacía. El mínimo baja a 2 cuando hay dos letras distintas, lo que deja pasar
   sin admitir  ni .

## [2.5.1] — 2026-09-17

Remate de la sexta ronda de auditoría.

### Corregido

- El constructor del conjunto de marcadores no aplicaba la exclusión de enlaces
  markdown que su propio comentario prometía y que su check hermano sí aplicaba:
  colaba el texto de dos enlaces y la sintaxis `[ordered]` de un manifiesto de
  PowerShell. Los marcadores sólo se extraen ya de artefactos markdown.
- Una respuesta de dos letras distintas (`Go`, `Vue`) contaba como sección
  vacía. El mínimo baja a 2 cuando hay dos letras distintas, lo que deja pasar
  `Go` sin admitir `aa` ni `S3`.

## [2.5.0] — 2026-09-17

Quinta ronda de la auditoría adversarial. El hallazgo: la última segunda fuente
de verdad del repositorio no estaba en la documentación, estaba **dentro del
validador**.

### Corregido

- **El medidor de contenido transcribía a mano los hints del spec**, y ya se
  había desincronizado en 3 de 12: `[Por qué]`, `[Cómo se resolvió]` y
  `[Cómo evitar que vuelva a pasar]` no estaban en la lista. Consecuencia
  concreta: una entrada copiada **literalmente** desde `AGENTS.md`, sin editar
  un solo campo, contaba como sección rellena. Ahora los marcadores se extraen
  de los propios artefactos generados y de los hints del spec, y hay una
  comprobación (`ssot.placeholders`) que falla si el generador emite un
  marcador que el medidor no reconoce. Cierra la clase entera, no los tres
  casos de hoy.
- **Coincidencia exacta en vez de por prefijo.** La lista incluía palabras
  españolas corrientes (`Objetivo`, `Impacto`, `Enlace`, `Título`…), así que
  `[Objetivo del sprint 4]` como único contenido de una sección la dejaba a
  cero. Ahora sólo se borra el texto exacto de un marcador conocido.
- **Tres falsos positivos del detector de relleno**, los tres por dar por
  supuesta la escritura latina:
  - `k8s`, `i18n`, `S3` — se exigían dos letras **consecutivas**; ahora dos
    letras, estén donde estén.
  - `2026`, `1.0.0` — el contenido puramente numérico se marcaba como relleno;
    ahora vale con dos dígitos distintos.
  - `支付`, `中文` — el mínimo de tres caracteres es una suposición latina: en
    chino o japonés dos caracteres ya son una respuesta completa.

### Cambiado

- La salida dice ahora que "Contenido real" **mide presencia, no calidad**: un
  comprobador estático no juzga significado y un 100 ahí no es un aval.

### Añadido

- Tres pruebas: que ningún marcador generado sobreviva al medidor, que una
  entrada pegada tal cual desde `AGENTS.md` no cuente como rellena, y que el
  contenido legítimo corto (identificadores, versiones, años, CJK) no se
  marque como relleno.

## [2.4.0] — 2026-09-17

Cuarta ronda de la auditoría adversarial. Dos de los tres defectos de esta
entrada los introdujo la v2.3.0 al endurecer el medidor de contenido: arreglar
la inversión estaba bien, pero el arreglo castigaba a quien escribe bien.

### Corregido

- **Una sección redactada con corchetes se leía como vacía.** `realContent`
  borraba **todo** `[...]` para quitar los marcadores de plantilla, así que
  `[Clean Architecture]`, `[Vitest]`, `[ADR-004]` o `[RFC 7231]` —documentación
  técnica normal— dejaban la sección a cero caracteres y costaban 6,7 puntos.
  Ahora sólo se borran las formas de marcador que genera la plantilla.
- **`xxx` y `???` bajo cada sección sacaban 100.** Ningún comprobador estático
  juzga significado, pero el relleno trivial es barato de rechazar: se exige una
  palabra de dos letras o más y al menos dos caracteres alfanuméricos distintos
  por sección. `MVP` sigue siendo una respuesta válida; `xxx` ya no.
- **Un marcador `tridente:` inventado seguía siendo una zona franca.** El
  generador sólo cazaba ids conocidos en archivos fuera de `injectedBlocks`;
  uno inventado dejaba invisible toda la prosa de dentro.
- **`buildTemplate` reventaba con un `TypeError`** si el spec declaraba un
  archivo maestro sin cuerpo de plantilla. Ahora sale con código 2 y dice cuál
  falta y dónde definirlo.
- El "ronda los 93 puntos" de ambos README y el comentario equivalente de las
  pruebas quedaron obsoletos al endurecer el medidor. Se retira la cifra: un
  número escrito a mano vuelve a envejecer al siguiente cambio.

### Cambiado

- La paleta del diagrama ya no incluye el color reservado al nodo de código,
  así que un cuarto archivo maestro no se confunde visualmente con él.
- El aviso de carpetas obsoletas no lee archivos binarios.

### Añadido

- Cinco pruebas: el relleno trivial puntúa por debajo del honesto, el contenido
  real por encima, una sección con corchetes legítimos no cuenta como vacía, el
  marcador inventado se detecta, y un archivo maestro sin plantilla falla con
  mensaje en vez de con un volcado de pila.

## [2.3.0] — 2026-09-17

Tercera ronda de la auditoría adversarial. Esta vez el hallazgo no era deriva
sino el propio medidor: **la métrica pagaba más por borrar las preguntas de la
plantilla que por responderlas.**

### Corregido

- **La métrica premiaba vaciar el archivo.** `filled.*` sólo contaba tokens sin
  sustituir y marcadores `[Ej: …]`, así que una sección vacía puntuaba perfecto:
  un Tridente hueco (sólo encabezados, campos con un punto) sacaba **100** y el
  mismo proyecto recién inicializado por el script sacaba **93**. Ahora se mide
  el contenido real bajo cada sección obligatoria, descontando encabezados,
  viñetas, etiquetas de campo y marcadores de plantilla. Con la misma prueba,
  el hueco saca 72 y el honesto 86.7. Hay una prueba que falla si la relación
  vuelve a invertirse.
- **`fmt.date` aceptaba fechas imposibles.** `2026-13-45` tiene la forma de
  ISO 8601 y no existe; ahora se comprueba que la fecha sea real.
- **Dos evasiones de `ssot.prose`.** Sólo escaneaba archivos `.md`, así que un
  nombre de archivo maestro escrito a mano en una plantilla de issue o en un
  script pasaba desapercibido; y un par de marcadores inventado en un archivo
  fuera de `injectedBlocks` cegaba el check en todo ese archivo. Ahora se
  escanean también `.yml`, `.yaml`, `.sh` y `.ps1`, y el generador caza
  marcadores en cualquier `.md` escrito a mano, no sólo en los declarados.
  El primer caso que destapó fue real: el propio CI escribía el nombre de un
  archivo maestro a mano; ahora lo toma del manifiesto.
- **El barrido de artefactos fantasma tenía dos puntos ciegos.** Sólo miraba
  las cuatro primeras líneas, así que un `.mdc` con frontmatter YAML delante
  nunca se detectaba; y excluía los punteros `.json`. Ahora mira el preámbulo
  completo y reconoce la marca de los JSON.
- `na`/`nb` en `docs.parity`: código muerto que el auditor tuvo que señalar dos
  veces porque lo di por borrado sin estarlo.

### Cambiado

- El diagrama mermaid se genera sin mapas escritos a mano: los identificadores
  de nodo salen de los ids del spec y los colores de una paleta indexada. Un
  cuarto archivo maestro, o renombrar un id, ya no produce un nodo `undefined`.
- La tabla de compatibilidad indica cuándo una herramienta necesita un paso
  manual: `CONVENTIONS.md` requiere `aider --read` o `read:` en
  `.aider.conf.yml`, y antes se anunciaba como adaptador automático.
- El aviso sobre `jules_session/` describe **qué** contiene (archivos de
  protocolo antiguos y cuántos con el formato de fecha retirado) en vez de
  limitarse a decir que la carpeta existe.
- La prueba "la suite no deja rastro" recorre todos los archivos de la suite,
  no sólo uno.
- El ejemplo de salida del validador en el README usa el modo repositorio, que
  no nombra archivos maestros y por tanto no envejece con un renombrado.

## [2.2.0] — 2026-09-17

Segunda ronda de la auditoría adversarial. La v2.1.0 cerró los siete agujeros
estructurales, pero dejó la deriva refugiada en la prosa y metió una regresión
en la propia suite de pruebas.

### Corregido

- **La suite de pruebas escribía en el repositorio real.** Dos pruebas rompían
  `README.md` y creaban un huérfano en `templates/` para comprobar que el
  generador los detecta. Como Node ejecuta los archivos de prueba en procesos
  paralelos, `sync --check` fallaba de forma intermitente en otro proceso
  (ventana medida: ~2 %), y una interrupción dejaba el repositorio roto. Ahora
  usan `withRepoCopy`.
- **La prueba "el validador no modifica el repositorio" no podía detectar lo
  que prometía.** Comparaba `git status --porcelain`: si un archivo ya figura
  como modificado, cambiar su contenido deja esa salida idéntica. Ahora compara
  una huella del contenido del árbol.
- **La deriva seguía viva en la prosa.** El diagrama mermaid, las tres tarjetas,
  la nota sobre la colisión de Gemini y la frase de resultado del inicio rápido
  escribían los nombres de los archivos maestros a mano en los dos README, y
  `SECURITY.md` hacía lo mismo. Todos están ahora bajo marcadores generados, y
  un check nuevo (`ssot.prose`) falla si aparece un nombre de archivo maestro
  en prosa escrita a mano fuera de marcadores y de bloques de código.
- **Contradicción "cuatro preguntas" vs "cinco".** El generador listaba
  `{{PROJECT_NAME}}` como pregunta de la entrevista pese a tener
  `default: "@dirname"`, así que `AGENTS.md` ordenaba cinco preguntas mientras
  los scripts y el README hablaban de cuatro.
- **Las preguntas de la Fase Cero seguían escritas a mano en los dos scripts**,
  y la versión de PowerShell las tenía sin acentos. Ahora salen de
  `TRIDENTE_ASK_*` en los manifiestos: una sola redacción para `AGENTS.md`,
  bash y PowerShell.
- **El barrido de huérfanos sólo cubría `templates/`.** Quitar una herramienta
  del spec dejaba su puntero en el disco, sin que ningún script lo copiara ni
  la documentación lo mencionara, con `sync --check` en verde. Ahora se barren
  todos los artefactos generados, identificados por su cabecera.
- **`.github/copilot-instructions.md` se contradecía a sí mismo**: el enlace
  del cuerpo usaba `../AGENTS.md` y el import `@AGENTS.md`. Ambos usan ahora la
  misma ruta calculada.
- **`protocol/manifest.ps1` se generaba sin BOM**, así que PowerShell 5.1 leía
  los acentos de las preguntas como ANSI.
- `--adapters '*'` se expandía contra el directorio actual (`set -f`).
- Se restauran los acentos en toda la interfaz de `init-tridente.ps1`.

### Cambiado

- **BREAKING (código de salida) — el modo proyecto ya no aplica el umbral.**
  Un Tridente recién inicializado puntúa ~93 porque el ADN tiene huecos por
  definición; con el umbral por defecto, `npm run validate:project` **nunca**
  podía devolver 0 sobre una entrada válida, y el propio CI tenía que bajar el
  listón a `--min 90` para poder usar su herramienta. Ahora:
  - modo repositorio → puerta de calidad, sale 0 si alcanza el umbral;
  - modo proyecto → diagnóstico, sale 0 si la **estructura** está íntegra y
    reporta el contenido como progreso no bloqueante;
  - `--strict` aplica el umbral también en modo proyecto.
  El `--min 90` desaparece del CI, y hay una prueba que falla si vuelve.
- **El puntaje se normaliza por peso declarado.** Antes se sumaban puntos
  sueltos: las categorías declaraban pesar 100 en total y pesaban 122, así que
  añadir una comprobación cambiaba en silencio cuánto pesaba su categoría.
  Ahora cada categoría vale su peso y el validador aborta si no suman 100.
- `.clinerules` pasa a ser sólo directorio; el archivo heredado se retira
  porque no puede coexistir con él en un sistema de archivos.
- El README ya no promete paridad "byte a byte": la prueba compara contenido
  normalizando el fin de línea de cada plataforma, y eso es lo que dice ahora.

### Añadido

- Seis pruebas nuevas: pesos que suman 100, semántica del código de salida en
  modo proyecto (con y sin `--strict`), un Tridente roto que sí falla, que la
  suite no deja rastro en el repositorio, el barrido de artefactos fantasma y
  que el CI no relaje su propio umbral.

## [2.1.0] — 2026-09-17

Correcciones salidas de una auditoría adversarial independiente de la v2.0.0.
El resumen honesto: la v2.0.0 arregló la deriva documental pero introdujo dos
bugs de pérdida de datos en Windows y dejó tres fuentes de verdad secundarias.

### Corregido

- **CRÍTICO — `init-tridente.ps1` se colgaba indefinidamente sin terminal.**
  La guarda usaba `[Environment]::UserInteractive`, que en Windows devuelve
  `True` aunque *stdin* esté redirigido. Con la entrada cerrada, `Read-Host`
  devuelve `$null`, el bucle "la respuesta no puede estar vacía" nunca
  terminaba y un job de CI se quedaba girando hasta el timeout del runner.
  Ahora la guarda es `[Console]::IsInputRedirected` y un `$null` aborta.
- **CRÍTICO — `init-tridente.ps1` sobrescribía archivos del usuario sin `-Yes`
  y salía con código 0.** `$null -notmatch '^[SsYy]'` no devuelve `$false`:
  devuelve un `Object[]` vacío, que PowerShell evalúa como falso, así que el
  script tomaba la rama "continuar". Se comprueba `$null` explícitamente.
- **La sustitución de tokens dependía de la versión de bash.** `${var//pat/rep}`
  trata `&` y `\` como especiales en el reemplazo desde bash 5.2, pero no antes.
  El escape añadido en la v2.0.0 arreglaba bash 5.2 y **rompía** bash 3.2
  (macOS de fábrica) y 5.0/5.1 (Ubuntu LTS), insertando `\&` y `\\` literales.
  Ahora la sustitución parte y concatena el texto, con el mismo resultado en
  todas las versiones y sin necesidad de escapes.
- **El `AGENTS.md` instalado en un proyecto le ordenaba al agente ejecutar
  cosas inexistentes.** Se copiaba la variante del repositorio, que menciona
  `scripts/validate.mjs`, `templates/` y `protocol/`. Ahora se genera
  `dist/AGENTS.md`, una variante para proyectos, desde el mismo spec.
- **`--yes` destruía configuración ajena.** `.gemini/settings.json` se
  reemplazaba entero, borrando `mcpServers`, tema y autenticación del usuario.
  Ahora se fusiona, y todo lo que se reemplaza deja una copia `.bak`.
- **Borrar un marcador de los README desactivaba la anti-deriva en silencio.**
  `sync --check` detectaba marcadores desconocidos pero no los ausentes. Los
  bloques obligatorios de cada README se declaran ahora en el spec.
- **El spec repetía nombres de archivo en su propia prosa.** Renombrar un
  archivo maestro producía un `AGENTS.md` que se contradecía a sí mismo. Los
  textos usan `{dna}`, `{plan}` y `{lessons}`, y hay una comprobación que lo
  impone.
- **`templates/` era una segunda fuente de verdad.** Los scripts listaban los
  archivos maestros con un glob, así que un `.md` huérfano acabaría en el
  proyecto del usuario tratado como archivo maestro. La lista sale del spec y
  `sync --check` denuncia los huérfanos.
- `.clinerules` no puede ser archivo y directorio a la vez: se adopta el
  formato de directorio, el recomendado por Cline, y el generador verifica que
  ninguna ruta de adaptador sea directorio padre de otra.
- La configuración de Gemini CLI usaba sólo la clave plana `contextFileName`,
  obsoleta; ahora emite también el esquema anidado `context.fileName`.
- `~/.gemini/extensions/` exige un `gemini-extension.json` que este repositorio
  no tiene: la ruta de instalación para Gemini CLI era inválida.
- `validate.mjs --min abc` reportaba como fallido un repositorio perfecto
  (`umbral NaN`) y `--project --json` auditaba un directorio inexistente
  llamado `--json`.
- El validador contaba como encabezados los ejemplos dentro de bloques de
  código, lo que relajaba el chequeo de anclas.
- Los archivos maestros volvían a perder el salto de línea final por una
  sustitución de comandos; hay una prueba dedicada para que no vuelva a pasar.

### Cambiado

- Los scripts de inicialización ya **no contienen datos del protocolo**: los
  nombres, roles, tokens y el mapa de adaptadores vienen de
  `protocol/manifest.sh` y `protocol/manifest.ps1`, generados desde el spec.
  Añadir una herramienta nueva es una entrada en el spec y nada más.
- Un adaptador desconocido en `--adapters` ahora falla con código 2 en vez de
  avisar y decir "inicializado".
- Una bandera sin valor sale con código 2, igual que una opción desconocida.
- El aviso de colisión distingue lo que se reescribe de lo que se respeta.
- CI: se prueba en macOS (bash 3.2) y en el Node mínimo declarado, ShellCheck
  se instala desde la distribución en vez de usar una acción anclada a una
  rama móvil, el chequeo de diferencias usa `git status --porcelain` para ver
  también los archivos nuevos, y hay trabajos dedicados al comportamiento sin
  terminal en ambas plataformas.
- Auditar ya no escribe: las pruebas que ejecutan el generador en modo
  escritura trabajan sobre una copia temporal del repositorio.

### Añadido

- Adaptadores para Devin Desktop (`.devin/rules/`) y Cline en formato de
  directorio (`.clinerules/`).
- 21 pruebas nuevas, entre ellas las regresiones de los dos bugs críticos de
  PowerShell y una que compara el resultado con `patsub_replacement` activo e
  inactivo para garantizar independencia de la versión de bash.
- Comprobaciones nuevas del validador: nombres de archivo escritos a mano en el
  spec, bloques de README ausentes, huérfanos en `templates/`, coherencia de
  los manifiestos con el spec en ambos sentidos, pureza del `AGENTS.md`
  instalado y comportamiento no interactivo de ambos scripts.

## [2.0.0] — 2026-09-17

Reescritura arquitectónica. El problema de fondo era que el protocolo estaba
escrito siete veces (README, README_EN, AGENTS.md, SKILL.md, tres plantillas y
dos scripts) y cada copia derivaba por su cuenta. Ahora hay una sola fuente.

### Añadido

- **Fuente única de verdad**: `protocol/tridente.spec.json` describe los tres
  archivos maestros, sus secciones, el orden de lectura y escritura, los
  formatos de entrada, el formato de fecha y la lista de herramientas soportadas.
- **Generador** `scripts/sync.mjs`: produce `AGENTS.md`, `docs/AGENTS.en.md`,
  `SKILL.md`, `templates/*.md`, los punteros de cada herramienta y los bloques
  marcados de los README. `--check` falla si algo se desvió (lo usa CI).
- **Validador con puntaje** `scripts/validate.mjs`: audita el repositorio
  (`node scripts/validate.mjs`) o el Tridente de un proyecto
  (`--project <dir>`) y devuelve una nota de 0 a 100 con desglose por categoría.
- **Compatibilidad multi-agente**: punteros generados para Cursor, Claude Code,
  Gemini CLI, GitHub Copilot, Windsurf, Cline, Roo Code, JetBrains Junie,
  Amazon Q, Firebase Studio y Aider. Todos reenvían a `AGENTS.md`; ninguno
  duplica el protocolo.
- **Versión en inglés de las instrucciones**: `docs/AGENTS.en.md`, generada
  desde el mismo spec que la española.
- Banderas no interactivas en ambos scripts de inicialización
  (`--goal`, `--stack`, `--rules`, `--milestone`, `--dir`, `--adapters`,
  `--yes`, `--quiet`, `--help`), aptas para CI.
- Suite de pruebas (`node --test`) que verifica que **Bash y PowerShell
  producen archivos idénticos** (comparación de contenido, normalizando el
  fin de línea propio de cada plataforma).
- CI en GitHub Actions sobre Linux, macOS y Windows.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`,
  `.editorconfig`, `.gitattributes`, plantillas de issue y de pull request.

### Cambiado

- **BREAKING — formato de fecha**: de `DD/MM/AAAA` a `YYYY-MM-DD` (ISO 8601).
  El formato anterior no es ordenable y se confunde con `MM/DD/AAAA`, lo que
  rompía el orden cronológico de la bitácora de decisiones.
- **BREAKING — campos de las entradas**: `lecciones_aprendidas.md` usa siempre
  cuatro campos (`Problema`, `Solución`, `Prevención`, `Impacto en reglas`).
  Antes, `AGENTS.md` documentaba tres y las plantillas cuatro.
- **BREAKING — idioma de los campos**: las claves de la bitácora son
  `Decisión / Razón / Impacto / Relacionado`. Antes `AGENTS.md` las documentaba
  en inglés (`Decision / Reason / Impact / Related`) contra plantillas en
  español, así que un agente que siguiera `AGENTS.md` escribía campos que no
  coincidían con el archivo que estaba editando.
- Los scripts de inicialización ya no incrustan el texto de las plantillas:
  leen `templates/*.md` y sustituyen tokens `{{...}}`. Script y plantilla no
  pueden desincronizarse.
- `AGENTS.md` pasa a español (el idioma del protocolo y de los nombres de
  archivo). El inglés vive en `docs/AGENTS.en.md`.
- Banner reducido de 1 435 KB a 448 KB.

### Corregido

- **`init-tridente.ps1` no funcionaba en Windows 11 de fábrica.** Usaba
  `Out-File -Encoding utf8NoBOM`, que no existe en Windows PowerShell 5.1; con
  `$ErrorActionPreference = "Stop"` el script abortaba después de hacer las
  cuatro preguntas y no escribía nada.
- **`init-tridente.ps1` no se podía ni parsear en PowerShell 5.1.** El archivo
  estaba en UTF-8 sin BOM y 5.1 lo interpretaba como ANSI, lo que corrompía los
  acentos y los emojis y rompía literales de cadena. Ahora se guarda con BOM.
- **Interpolación de `&` en Bash 5.2+.** En `${var//patrón/reemplazo}`, un `&`
  en el reemplazo se expande al texto coincidente: una respuesta como
  `"pagos & cobros"` insertaba `{{GOAL}}` en el archivo final.
- Los punteros en subdirectorios enlazaban a `AGENTS.md` con ruta relativa
  incorrecta (`.roo/rules/AGENTS.md` en vez de `../../AGENTS.md`).
- Anclas rotas en los índices de ambos README.
- `SKILL.md` declaraba `name: tridente-de-memoria`, pero las instrucciones de
  instalación hacían `git clone` sin directorio de destino, creando
  `tridente-de-memoria-skill/`. El nombre del directorio ahora es explícito.
- Los archivos generados terminan siempre en salto de línea, en las dos
  plataformas.

### Seguridad

- `GCP_Proyectos/` (inventario de infraestructura interna) queda ignorado por
  git: estaba sin rastrear y sin ignorar dentro de un repositorio público, a un
  `git add .` de publicarse.
- Las respuestas de la entrevista se insertan de forma literal en las dos
  plataformas; no se interpretan como código ni como expresión regular.
- `SECURITY.md` documenta el modelo de amenazas de tratar archivos markdown
  como instrucciones privilegiadas de un agente.

## [1.0.0] — 2026-06-20

- Versión inicial: tres archivos maestros, `AGENTS.md`, `SKILL.md`, plantillas
  y scripts de inicialización para Bash y PowerShell.

[2.5.1]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.5.1
[2.5.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.5.0
[2.4.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.4.0
[2.3.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.3.0
[2.2.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.2.0
[2.1.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.1.0
[2.0.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v2.0.0
[1.0.0]: https://github.com/Cyberdark-Security/tridente-de-memoria-skill/releases/tag/v1.0.0

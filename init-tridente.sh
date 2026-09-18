#!/usr/bin/env bash
#
# 🔱 Tridente de Memoria — inicialización (Unix / macOS / WSL / Git Bash)
# https://github.com/Cyberdark-Security/tridente-de-memoria-skill
#
# Genera los archivos maestros a partir de templates/ y deja AGENTS.md
# (+ punteros por herramienta) en el proyecto de destino.
#
# Este script no contiene datos del protocolo: los nombres de archivo, los
# tokens y el mapa de adaptadores vienen de protocol/manifest.sh, que genera
# scripts/sync.mjs desde el SSOT. El texto de los archivos viene de templates/.
# Por construcción, no puede desincronizarse de la documentación.
#
# Compatible con bash 3.2 (macOS de fábrica) en adelante.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/templates"
MANIFEST="$SCRIPT_DIR/protocol/manifest.sh"

# ------------------------------------------------------------------ manifiesto

if [ ! -f "$MANIFEST" ]; then
    printf '✗ %s\n' "No encuentro protocol/manifest.sh en $SCRIPT_DIR." >&2
    printf '  %s\n' "¿Clonaste el repositorio completo? Regenéralo con: node scripts/sync.mjs" >&2
    exit 1
fi
# shellcheck source=protocol/manifest.sh
. "$MANIFEST"

VERSION="$TRIDENTE_VERSION"

# ------------------------------------------------------------------- opciones

TARGET_DIR="$PWD"
PROJECT_NAME=""
GOAL=""
STACK=""
RULES=""
MILESTONE=""
FORCE=0
QUIET=0
ADAPTERS="all"
USE_COLOR=1
BACKUP=1

usage() {
    cat <<USAGE
🔱 Tridente de Memoria v$VERSION — inicialización

USO
  init-tridente.sh [opciones]

Sin opciones de contenido, el script hace la entrevista de la Fase Cero.
Con las cuatro respuestas pasadas por bandera, corre sin interacción (apto para CI).

OPCIONES
  -d, --dir <ruta>        Directorio de destino (por defecto: el actual)
  -n, --name <texto>      Nombre del proyecto (por defecto: nombre del directorio)
  -g, --goal <texto>      Objetivo principal del proyecto
  -s, --stack <texto>     Stack tecnológico
  -r, --rules <texto>     Regla innegociable
  -m, --milestone <texto> Primer hito o sprint
  -a, --adapters <modo>   all | none | lista separada por comas
                          Válidos: ${TRIDENTE_ADAPTER_KEYS[*]}
  -y, --yes               Sobrescribe archivos existentes sin preguntar
      --no-backup         No guarda copia .bak de lo que sobrescriba
  -q, --quiet             Sin salida salvo errores
      --no-color          Desactiva colores
  -h, --help              Muestra esta ayuda
  -v, --version           Muestra la versión

CÓDIGOS DE SALIDA
  0  correcto
  1  error de ejecución (destino no escribible, falta un dato, abortado)
  2  error de uso (opción desconocida o sin valor)

EJEMPLOS
  init-tridente.sh
  init-tridente.sh -g "API de pagos" -s "Go + Postgres" -r "Sin ORM" -m "MVP" -y
  init-tridente.sh --dir ../mi-proyecto --adapters claude,cursor,copilot
USAGE
}

need_value() {  # need_value <bandera> <valor?>
    if [ "$#" -lt 2 ] || [ -z "${2:-}" ]; then
        printf '✗ %s requiere un valor.\n' "$1" >&2
        printf '  Prueba: init-tridente.sh --help\n' >&2
        exit 2
    fi
}

while [ $# -gt 0 ]; do
    case "$1" in
        -d|--dir)        need_value "$1" "${2:-}"; TARGET_DIR="$2"; shift 2 ;;
        -n|--name)       need_value "$1" "${2:-}"; PROJECT_NAME="$2"; shift 2 ;;
        -g|--goal)       need_value "$1" "${2:-}"; GOAL="$2"; shift 2 ;;
        -s|--stack)      need_value "$1" "${2:-}"; STACK="$2"; shift 2 ;;
        -r|--rules)      need_value "$1" "${2:-}"; RULES="$2"; shift 2 ;;
        -m|--milestone)  need_value "$1" "${2:-}"; MILESTONE="$2"; shift 2 ;;
        -a|--adapters)   need_value "$1" "${2:-}"; ADAPTERS="$2"; shift 2 ;;
        -y|--yes|--force) FORCE=1; shift ;;
        --no-backup)     BACKUP=0; shift ;;
        -q|--quiet)      QUIET=1; shift ;;
        --no-color)      USE_COLOR=0; shift ;;
        -h|--help)       usage; exit 0 ;;
        -v|--version)    echo "$VERSION"; exit 0 ;;
        *) printf '✗ Opción desconocida: %s\n' "$1" >&2
           printf '  Prueba: init-tridente.sh --help\n' >&2
           exit 2 ;;
    esac
done

# --------------------------------------------------------------------- estilo

if [ "$USE_COLOR" -eq 1 ] && [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    C_GREEN=$'\033[0;32m'; C_BLUE=$'\033[0;34m'; C_CYAN=$'\033[0;36m'
    C_MAGENTA=$'\033[0;35m'; C_YELLOW=$'\033[1;33m'; C_RED=$'\033[0;31m'
    C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'; C_OFF=$'\033[0m'
else
    C_GREEN=''; C_BLUE=''; C_CYAN=''; C_MAGENTA=''; C_YELLOW=''
    C_RED=''; C_BOLD=''; C_DIM=''; C_OFF=''
fi

say()  { [ "$QUIET" -eq 1 ] || printf '%s\n' "$*"; }
warn() { printf '%s\n' "${C_YELLOW}$*${C_OFF}" >&2; }
die()  { printf '%s\n' "${C_RED}✗ $*${C_OFF}" >&2; exit 1; }

# ------------------------------------------------------------------ pre-vuelo

[ -d "$TEMPLATE_DIR" ] || die "No encuentro templates/ en $SCRIPT_DIR. ¿Clonaste el repositorio completo?"
mkdir -p -- "$TARGET_DIR" || die "No puedo crear el directorio $TARGET_DIR"
TARGET_DIR="$(cd -- "$TARGET_DIR" && pwd)"
[ -w "$TARGET_DIR" ] || die "Sin permiso de escritura en $TARGET_DIR"

# Los archivos maestros salen del manifiesto, no de un glob sobre templates/:
# un .md huérfano en esa carpeta no debe acabar en el proyecto del usuario.
for f in "${TRIDENTE_MASTERS[@]}"; do
    [ -f "$TEMPLATE_DIR/$f" ] || die "Falta la plantilla templates/$f. Regenera con: node scripts/sync.mjs"
done

# ------------------------------------------------------------- qué se va a escribir

# Resuelve la lista de adaptadores pedida ANTES de avisar de colisiones, para
# que el aviso enumere todos los destinos y no sólo los archivos maestros.
SELECTED_ADAPTERS=()
adapter_path_for() {  # adapter_path_for <clave> -> imprime la ruta, o nada
    local want="$1" i
    for i in $(seq 0 $((${#TRIDENTE_ADAPTER_KEYS[@]} - 1))); do
        if [ "${TRIDENTE_ADAPTER_KEYS[$i]}" = "$want" ]; then
            printf '%s' "${TRIDENTE_ADAPTER_PATHS[$i]}"
            return 0
        fi
    done
    return 1
}

if [ "$ADAPTERS" = "all" ]; then
    SELECTED_ADAPTERS=("${TRIDENTE_ADAPTER_PATHS[@]}")
elif [ "$ADAPTERS" = "none" ]; then
    SELECTED_ADAPTERS=()
else
    # AGENTS.md siempre: es la fuente a la que apuntan los demás.
    SELECTED_ADAPTERS=("AGENTS.md")
    OLD_IFS="$IFS"; IFS=','
    set -f  # sin globbing: '--adapters *' no debe expandirse contra el cwd
    for w in $ADAPTERS; do
        IFS="$OLD_IFS"
        w="$(printf '%s' "$w" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
        [ -n "$w" ] || continue
        if p="$(adapter_path_for "$w")"; then
            SELECTED_ADAPTERS+=("$p")
        else
            printf '✗ Adaptador desconocido: %s\n' "$w" >&2
            printf '  Válidos: %s\n' "${TRIDENTE_ADAPTER_KEYS[*]}" >&2
            exit 2
        fi
        IFS=','
    done
    set +f
    IFS="$OLD_IFS"
fi

say ""
say "${C_MAGENTA}╔══════════════════════════════════════════════════╗${C_OFF}"
say "${C_MAGENTA}║${C_OFF}  ${C_BOLD}🔱 Tridente de Memoria${C_OFF} ${C_DIM}v$VERSION${C_OFF}                   ${C_MAGENTA}║${C_OFF}"
say "${C_MAGENTA}║${C_OFF}  Memoria persistente para agentes de IA          ${C_MAGENTA}║${C_OFF}"
say "${C_MAGENTA}╚══════════════════════════════════════════════════╝${C_OFF}"
say ""
say "${C_DIM}Destino: $TARGET_DIR${C_OFF}"
say ""

# Colisiones. Se distinguen dos casos, porque el riesgo no es el mismo:
#  - archivos maestros: SIEMPRE se reescriben → hay que pedir permiso.
#  - punteros: sin --yes se respetan tal cual → basta con avisar.
# Con --yes se reescribe todo, y por eso se guarda copia .bak de cada archivo.
EXISTING=()
for f in "${TRIDENTE_MASTERS[@]}"; do
    [ -e "$TARGET_DIR/$f" ] && EXISTING+=("$f")
done

KEPT=()
if [ "${#SELECTED_ADAPTERS[@]}" -gt 0 ]; then
    for f in "${SELECTED_ADAPTERS[@]}"; do
        if [ -e "$TARGET_DIR/$f" ]; then
            if [ "$FORCE" -eq 1 ]; then EXISTING+=("$f"); else KEPT+=("$f"); fi
        fi
    done
fi
if [ "${#KEPT[@]}" -gt 0 ]; then
    warn "ℹ️  Se respetarán (ya existen): ${KEPT[*]}"
    warn "   Usa --yes para reemplazarlos; se guardará copia .bak de cada uno."
fi

if [ "${#EXISTING[@]}" -gt 0 ] && [ "$FORCE" -ne 1 ]; then
    warn "⚠️  Ya existen: ${EXISTING[*]}"
    if [ ! -t 0 ]; then
        die "Sin terminal interactiva. Usa --yes para sobrescribir (se guardará copia .bak)."
    fi
    printf '%s' "¿Sobrescribirlos? (s/N): "
    if ! IFS= read -r reply; then
        die "Entrada cerrada. Inicialización abortada; no se modificó nada."
    fi
    case "$reply" in
        [SsYy]*) ;;
        *) die "Inicialización abortada. No se modificó nada." ;;
    esac
fi

# ------------------------------------------------------------------ entrevista

# La variable de shell que recibe cada token: {{GOAL}} -> GOAL.
var_for_token() { printf '%s' "${1#\{\{}" | sed 's/}}$//'; }

ask() {  # ask <nombre-var> <pregunta> <pista>
    local __var="$1" __q="$2" __hint="$3" __cur __ans
    eval "__cur=\${$__var}"
    [ -n "$__cur" ] && return 0
    if [ ! -t 0 ]; then
        die "Falta un dato obligatorio ($__q) y no hay terminal interactiva. Pásalo por bandera (--help)."
    fi
    printf '%s\n' "${C_GREEN}${C_BOLD}?${C_OFF} ${C_GREEN}${__q}${C_OFF}"
    [ -n "$__hint" ] && printf '%s\n' "  ${C_DIM}${__hint}${C_OFF}"
    while :; do
        printf '%s' "  > "
        if ! IFS= read -r __ans; then
            die "Entrada cerrada sin respuesta. Pasa el dato por bandera (--help)."
        fi
        # Recorta espacios en los extremos.
        __ans="${__ans#"${__ans%%[![:space:]]*}"}"
        __ans="${__ans%"${__ans##*[![:space:]]}"}"
        [ -n "$__ans" ] && break
        printf '%s\n' "  ${C_YELLOW}La respuesta no puede estar vacía.${C_OFF}"
    done
    eval "$__var=\$__ans"
    say ""
}

# Las preguntas y sus pistas salen del manifiesto, igual que todo lo demás.
for i in $(seq 0 $((${#TRIDENTE_ASK_TOKENS[@]} - 1))); do
    ask "$(var_for_token "${TRIDENTE_ASK_TOKENS[$i]}")" \
        "${TRIDENTE_ASK_QUESTIONS[$i]}" \
        "${TRIDENTE_ASK_HINTS[$i]}"
done

[ -n "$PROJECT_NAME" ] || PROJECT_NAME="$(basename -- "$TARGET_DIR")"
TODAY="$(date "$TRIDENTE_DATE_FORMAT")"

# --------------------------------------------------------------- renderizado

# Quita la cabecera "archivo generado": sólo tiene sentido en este repositorio.
strip_header() {
    sed -e '/<!-- tridente:header-start -->/,/<!-- tridente:header-end -->/d' -e '/./,$!d'
}

# Sustitución por partición del texto. No usa ${var//pat/rep}: en bash >= 5.2
# un '&' o un '\' en la cadena de reemplazo son especiales, y en bash < 5.2 no.
# Partir y concatenar se comporta igual en todas las versiones, y la respuesta
# del usuario nunca se interpreta como código ni como expresión regular.
#
# Opera sobre la global SUBST_BUF en vez de imprimir: `$(...)` recorta los
# saltos de línea finales y el archivo saldría sin el último \n.
SUBST_BUF=""
subst() {  # subst <token> <valor>
    local token="$1" value="$2" text="$SUBST_BUF" out=""
    while [ "${text#*"$token"}" != "$text" ]; do
        out="$out${text%%"$token"*}$value"
        text="${text#*"$token"}"
    done
    SUBST_BUF="$out$text"
}

render_to() {  # render_to <plantilla> <destino>
    SUBST_BUF="$(cat -- "$1"; printf 'x')" || die "No puedo leer la plantilla $1"
    SUBST_BUF="${SUBST_BUF%x}"
    subst '{{PROJECT_NAME}}' "$PROJECT_NAME"
    subst '{{DATE}}'         "$TODAY"
    subst '{{GOAL}}'         "$GOAL"
    subst '{{STACK}}'        "$STACK"
    subst '{{RULES}}'        "$RULES"
    subst '{{MILESTONE}}'    "$MILESTONE"
    printf '%s' "$SUBST_BUF" | strip_header > "$2"
}

backup_if_needed() {  # backup_if_needed <ruta-absoluta>
    [ "$BACKUP" -eq 1 ] || return 0
    [ -e "$1" ] || return 0
    cp -- "$1" "$1.bak"
    say "  ${C_DIM}↺${C_OFF} $(basename -- "$1").bak ${C_DIM}(copia de seguridad)${C_OFF}"
}

say "${C_BLUE}⚙️  Generando el Tridente…${C_OFF}"
say ""

CREATED=()
for f in "${TRIDENTE_MASTERS[@]}"; do
    backup_if_needed "$TARGET_DIR/$f"
    render_to "$TEMPLATE_DIR/$f" "$TARGET_DIR/$f"
    CREATED+=("$f")
    say "  ${C_GREEN}✓${C_OFF} $f"
done

# Verificación: no debe quedar ningún token sin sustituir.
LEFTOVER=""
for f in "${TRIDENTE_MASTERS[@]}"; do
    if grep -q '{{[A-Z_]*}}' "$TARGET_DIR/$f" 2>/dev/null; then
        LEFTOVER="$LEFTOVER $f"
    fi
done
[ -z "$LEFTOVER" ] || die "Quedaron tokens sin sustituir en:$LEFTOVER (reporta este bug)"

# ------------------------------------------------------------------ punteros

# Fusiona el contextFileName del Tridente con la configuración de Gemini que ya
# tuviera el proyecto (mcpServers, tema, auth…), en vez de pisarla.
merge_gemini_settings() {  # merge_gemini_settings <origen> <destino>
    if [ ! -e "$2" ] || ! command -v node >/dev/null 2>&1; then
        cp -- "$1" "$2"
        return 0
    fi
    node -e '
      const fs = require("fs");
      const [src, dst] = process.argv.slice(1);
      const add = JSON.parse(fs.readFileSync(src, "utf8"));
      let cur = {};
      try { cur = JSON.parse(fs.readFileSync(dst, "utf8")); } catch { cur = {}; }
      const files = add.context.fileName;
      cur.context = cur.context || {};
      const prev = cur.context.fileName ?? cur.contextFileName ?? [];
      cur.context.fileName = [...new Set([...(Array.isArray(prev) ? prev : [prev]), ...files])];
      cur.contextFileName = cur.context.fileName;
      fs.writeFileSync(dst, JSON.stringify(cur, null, 2) + "\n");
    ' "$1" "$2" || cp -- "$1" "$2"
}

copy_adapter() {  # copy_adapter <ruta-relativa>
    local rel="$1" src dst
    # AGENTS.md se instala desde dist/: la variante del repositorio habla de
    # scripts/ y templates/, que no existen en el proyecto de destino.
    if [ "$rel" = "AGENTS.md" ] && [ -f "$SCRIPT_DIR/dist/AGENTS.md" ]; then
        src="$SCRIPT_DIR/dist/AGENTS.md"
    else
        src="$SCRIPT_DIR/$rel"
    fi
    dst="$TARGET_DIR/$rel"
    [ -f "$src" ] || return 0
    if [ -e "$dst" ] && [ "$FORCE" -ne 1 ]; then
        say "  ${C_DIM}·${C_OFF} $rel ${C_DIM}(ya existía, se respeta)${C_OFF}"
        return 0
    fi
    mkdir -p -- "$(dirname -- "$dst")"
    backup_if_needed "$dst"
    case "$rel" in
        .gemini/settings.json) merge_gemini_settings "$src" "$dst" ;;
        *.json)                cp -- "$src" "$dst" ;;
        *)                     strip_header < "$src" > "$dst" ;;
    esac
    CREATED+=("$rel")
    say "  ${C_GREEN}✓${C_OFF} $rel"
}

if [ "${#SELECTED_ADAPTERS[@]}" -gt 0 ]; then
    say ""
    say "${C_BLUE}🔌 Punteros para agentes…${C_OFF}"
    say ""
    for p in "${SELECTED_ADAPTERS[@]}"; do copy_adapter "$p"; done
fi

# ------------------------------------------------------------------- resumen

say ""
say "${C_GREEN}${C_BOLD}✅ Tridente de Memoria inicializado.${C_OFF}"
say ""
i=0
for f in "${TRIDENTE_MASTERS[@]}"; do
    say "  ${C_CYAN}${TRIDENTE_ROLES[$i]}${C_OFF} — $f"
    i=$((i + 1))
done
say ""
say "${C_DIM}${#CREATED[@]} archivo(s) escrito(s) en $TARGET_DIR${C_OFF}"
say ""
say "${C_BLUE}Siguiente paso:${C_OFF} abre tu agente de IA y dile:"
say "  ${C_BOLD}\"Lee el Tridente de Memoria y empecemos a trabajar\"${C_OFF}"
say ""

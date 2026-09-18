<#
.SYNOPSIS
    Tridente de Memoria — inicializacion (Windows).

.DESCRIPTION
    Genera los archivos maestros a partir de templates/ y deja AGENTS.md
    (+ punteros por herramienta) en el proyecto de destino.

    Este script no contiene datos del protocolo: los nombres de archivo, los
    tokens y el mapa de adaptadores vienen de protocol/manifest.ps1, que genera
    scripts/sync.mjs desde el SSOT. El texto de los archivos viene de templates/.
    Por construccion, no puede desincronizarse de la documentacion.

    Compatible con Windows PowerShell 5.1 y PowerShell 7+.

.PARAMETER Dir
    Directorio de destino. Por defecto, el actual.

.PARAMETER Name
    Nombre del proyecto. Por defecto, el nombre del directorio de destino.

.PARAMETER Goal
    Objetivo principal del proyecto.

.PARAMETER Stack
    Stack tecnologico.

.PARAMETER Rules
    Regla innegociable.

.PARAMETER Milestone
    Primer hito o sprint.

.PARAMETER Adapters
    'all' (por defecto), 'none' o lista separada por comas. Las claves validas
    salen de protocol/manifest.ps1.

.PARAMETER Yes
    Sobrescribe archivos existentes sin preguntar.

.PARAMETER NoBackup
    No guarda copia .bak de lo que sobrescriba.

.PARAMETER Quiet
    Sin salida salvo errores.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\init-tridente.ps1

.EXAMPLE
    .\init-tridente.ps1 -Goal "API de pagos" -Stack "Go + Postgres" -Rules "Sin ORM" -Milestone "MVP" -Yes

.LINK
    https://github.com/Cyberdark-Security/tridente-de-memoria-skill
#>
[CmdletBinding()]
param(
    [string]$Dir = '.',
    [string]$Name = '',
    [string]$Goal = '',
    [string]$Stack = '',
    [string]$Rules = '',
    [string]$Milestone = '',
    [string]$Adapters = 'all',
    [switch]$Yes,
    [switch]$NoBackup,
    [switch]$Quiet,
    [switch]$NoColor,
    [switch]$Version
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# La consola de Windows necesita esto para no romper acentos ni emojis.
try { [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false) } catch { }

$ScriptDir = Split-Path -Parent $PSCommandPath
$TemplateDir = Join-Path $ScriptDir 'templates'
$ManifestPath = Join-Path $ScriptDir 'protocol/manifest.ps1'

# --------------------------------------------------------------------- salidas

function Fail {
    param([string]$Text, [int]$Code = 1)
    [Console]::Error.WriteLine("X $Text")
    exit $Code
}

if (-not (Test-Path -LiteralPath $ManifestPath)) {
    Fail "No encuentro protocol/manifest.ps1 en $ScriptDir. Regenera con: node scripts/sync.mjs"
}
. $ManifestPath

if ($Version) { Write-Output $TridenteVersion; exit 0 }

# ------------------------------------------------------------------ utilidades

$script:UseColor = (-not $NoColor) -and (-not $env:NO_COLOR)

function Say {
    param([string]$Text = '', [string]$Color = 'Gray')
    if ($Quiet) { return }
    if ($script:UseColor) { Write-Host $Text -ForegroundColor $Color } else { Write-Host $Text }
}

# Escribe UTF-8 sin BOM en PowerShell 5.1 y 7+ por igual.
# (el valor utf8NoBOM de Out-File solo existe en PowerShell 6+; en 5.1 el
#  encoding utf8 escribe BOM, que rompe a los consumidores estrictos.)
function Write-Utf8NoBom {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][AllowEmptyString()][string]$Content)
    $dir = Split-Path -Parent $Path
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

# Quita la cabecera "archivo generado": solo tiene sentido en este repositorio.
function Remove-GeneratedHeader {
    param([Parameter(Mandatory)][AllowEmptyString()][string]$Text)
    $out = [regex]::Replace(
        $Text,
        '(?s)<!--\s*tridente:header-start\s*-->.*?<!--\s*tridente:header-end\s*-->\r?\n?',
        ''
    )
    return $out.TrimStart("`r", "`n")
}

# [Environment]::UserInteractive devuelve True en Windows aunque stdin este
# redirigido; IsInputRedirected si distingue. Sin esta comprobacion, Read-Host
# devuelve $null en EOF y el bucle de la entrevista no termina nunca.
function Test-CanPrompt {
    try { return -not [Console]::IsInputRedirected } catch { return $false }
}

function Read-Answer {
    param([string]$Question, [string]$Hint)
    if (-not (Test-CanPrompt)) {
        Fail "Falta un dato obligatorio ($Question) y la sesion no es interactiva. Pasalo por parametro (Get-Help .\init-tridente.ps1)."
    }
    Say "? $Question" 'Green'
    if ($Hint) { Say "  $Hint" 'DarkGray' }
    while ($true) {
        $answer = Read-Host '  >'
        # EOF: Read-Host devuelve $null. Abortar en vez de girar en el bucle.
        if ($null -eq $answer) { Fail "Entrada cerrada sin respuesta ($Question). Pasalo por parametro." }
        $answer = $answer.Trim()
        if ($answer) { Say ''; return $answer }
        Say '  La respuesta no puede estar vacia.' 'Yellow'
    }
}

# ------------------------------------------------------------------- pre-vuelo

if (-not (Test-Path -LiteralPath $TemplateDir)) {
    Fail "No encuentro templates/ en $ScriptDir. Clonaste el repositorio completo?"
}
if (-not (Test-Path -LiteralPath $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
$TargetDir = (Resolve-Path -LiteralPath $Dir).Path

foreach ($f in $TridenteMasters) {
    if (-not (Test-Path -LiteralPath (Join-Path $TemplateDir $f))) {
        Fail "Falta la plantilla templates/$f. Regenera con: node scripts/sync.mjs"
    }
}

# ----------------------------------------------------- que se va a escribir

$selectedAdapters = New-Object System.Collections.Generic.List[string]
if ($Adapters -eq 'all') {
    foreach ($p in $TridenteAdapters.Values) { $selectedAdapters.Add($p) | Out-Null }
} elseif ($Adapters -ne 'none') {
    $selectedAdapters.Add('AGENTS.md') | Out-Null
    foreach ($raw in ($Adapters -split ',')) {
        $key = $raw.Trim().ToLowerInvariant()
        if (-not $key) { continue }
        if ($TridenteAdapters.Contains($key)) {
            if (-not $selectedAdapters.Contains($TridenteAdapters[$key])) {
                $selectedAdapters.Add($TridenteAdapters[$key]) | Out-Null
            }
        } else {
            Fail ("Adaptador desconocido: '$key'. Validos: " + ($TridenteAdapters.Keys -join ', ')) 2
        }
    }
}

Say ''
Say '+==================================================+' 'Magenta'
Say "|  Tridente de Memoria v$TridenteVersion" 'Magenta'
Say '|  Memoria persistente para agentes de IA' 'Magenta'
Say '+==================================================+' 'Magenta'
Say ''
Say "Destino: $TargetDir" 'DarkGray'
Say ''

# Colisiones. Se distinguen dos casos, porque el riesgo no es el mismo:
#  - archivos maestros: SIEMPRE se reescriben -> hay que pedir permiso.
#  - punteros: sin -Yes se respetan tal cual -> basta con avisar.
# Con -Yes se reescribe todo, y por eso se guarda copia .bak de cada archivo.
$existing = New-Object System.Collections.Generic.List[string]
$kept = New-Object System.Collections.Generic.List[string]
foreach ($f in $TridenteMasters) {
    if (Test-Path -LiteralPath (Join-Path $TargetDir $f)) {
        if (-not $existing.Contains($f)) { $existing.Add($f) | Out-Null }
    }
}
foreach ($f in $selectedAdapters) {
    if (Test-Path -LiteralPath (Join-Path $TargetDir $f)) {
        if ($Yes) {
            if (-not $existing.Contains($f)) { $existing.Add($f) | Out-Null }
        } elseif (-not $kept.Contains($f)) {
            $kept.Add($f) | Out-Null
        }
    }
}
if ($kept.Count -gt 0) {
    Say ("Se respetaran (ya existen): " + ($kept -join ', ')) 'Yellow'
    Say '   Usa -Yes para reemplazarlos; se guardara copia .bak de cada uno.' 'Yellow'
}

if ($existing.Count -gt 0 -and -not $Yes) {
    Say ("Ya existen: " + ($existing -join ', ')) 'Yellow'
    if (-not (Test-CanPrompt)) {
        Fail 'Sesion no interactiva. Usa -Yes para sobrescribir (se guardara copia .bak).'
    }
    $reply = Read-Host 'Sobrescribirlos? (s/N)'
    # $null -notmatch devuelve un array vacio (falsy) y la rama "continuar" se
    # tomaria sola, pisando archivos del usuario. Comprobar $null explicitamente.
    if ($null -eq $reply -or [string]::IsNullOrWhiteSpace($reply) -or $reply -notmatch '^[SsYy]') {
        Fail 'Inicializacion abortada. No se modifico nada.'
    }
}

# ------------------------------------------------------------------ entrevista

# Las preguntas y sus pistas salen del manifiesto, igual que todo lo demas:
# asi coinciden palabra por palabra con las que AGENTS.md le ordena hacer a un
# agente sin terminal, y con las del script de bash.
$answers = @{ '{{GOAL}}' = $Goal; '{{STACK}}' = $Stack; '{{RULES}}' = $Rules; '{{MILESTONE}}' = $Milestone }
foreach ($q in $TridenteAsk) {
    if (-not $answers.ContainsKey($q.Token)) {
        Fail "El manifiesto pregunta por $($q.Token) y este script no sabe donde guardarlo."
    }
    if (-not $answers[$q.Token]) { $answers[$q.Token] = Read-Answer $q.Question $q.Hint }
}
$Goal = $answers['{{GOAL}}']
$Stack = $answers['{{STACK}}']
$Rules = $answers['{{RULES}}']
$Milestone = $answers['{{MILESTONE}}']

if (-not $Name) { $Name = Split-Path -Leaf $TargetDir }
$Today = Get-Date -Format $TridenteDateFormat

# ----------------------------------------------------------------- renderizado

$tokens = [ordered]@{
    '{{PROJECT_NAME}}' = $Name
    '{{DATE}}'         = $Today
    '{{GOAL}}'         = $Goal
    '{{STACK}}'        = $Stack
    '{{RULES}}'        = $Rules
    '{{MILESTONE}}'    = $Milestone
}
foreach ($t in $TridenteTokens) {
    if (-not $tokens.Contains($t)) { Fail "El manifiesto declara el token $t y este script no sabe rellenarlo." }
}

function Backup-IfNeeded {
    param([string]$Path)
    if ($NoBackup) { return }
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Copy-Item -LiteralPath $Path -Destination "$Path.bak" -Force
    Say ("  ~ " + (Split-Path -Leaf $Path) + ".bak (copia de seguridad)") 'DarkGray'
}

Say 'Generando el Tridente...' 'Cyan'
Say ''

$created = New-Object System.Collections.Generic.List[string]

foreach ($file in $TridenteMasters) {
    $dst = Join-Path $TargetDir $file
    Backup-IfNeeded $dst
    $text = [System.IO.File]::ReadAllText((Join-Path $TemplateDir $file))
    foreach ($key in $tokens.Keys) {
        # Replace(string, string) es literal: la entrada del usuario nunca se
        # interpreta como expresion regular.
        $text = $text.Replace($key, [string]$tokens[$key])
    }
    $text = Remove-GeneratedHeader $text
    Write-Utf8NoBom -Path $dst -Content $text
    $created.Add($file) | Out-Null
    Say "  OK $file" 'Green'
}

$leftover = @()
foreach ($file in $TridenteMasters) {
    if ([System.IO.File]::ReadAllText((Join-Path $TargetDir $file)) -match '\{\{[A-Z_]+\}\}') { $leftover += $file }
}
if ($leftover.Count -gt 0) { Fail ("Quedaron tokens sin sustituir en: " + ($leftover -join ', ') + " (reporta este bug)") }

# ------------------------------------------------------------------- punteros

# Fusiona el contexto del Tridente con la configuracion de Gemini que ya
# tuviera el proyecto (mcpServers, tema, auth...), en vez de pisarla.
function Merge-GeminiSettings {
    param([string]$Src, [string]$Dst)
    if (-not (Test-Path -LiteralPath $Dst)) {
        Copy-Item -LiteralPath $Src -Destination $Dst -Force
        return
    }
    try {
        $add = Get-Content -LiteralPath $Src -Raw | ConvertFrom-Json
        $cur = Get-Content -LiteralPath $Dst -Raw | ConvertFrom-Json
        $files = @($add.context.fileName)
        $prev = @()
        if ($cur.PSObject.Properties.Name -contains 'context' -and
            $cur.context.PSObject.Properties.Name -contains 'fileName') {
            $prev = @($cur.context.fileName)
        } elseif ($cur.PSObject.Properties.Name -contains 'contextFileName') {
            $prev = @($cur.contextFileName)
        }
        $merged = @(($prev + $files) | Select-Object -Unique)
        if ($cur.PSObject.Properties.Name -notcontains 'context') {
            $cur | Add-Member -NotePropertyName context -NotePropertyValue ([pscustomobject]@{}) -Force
        }
        $cur.context | Add-Member -NotePropertyName fileName -NotePropertyValue $merged -Force
        $cur | Add-Member -NotePropertyName contextFileName -NotePropertyValue $merged -Force
        Write-Utf8NoBom -Path $Dst -Content (($cur | ConvertTo-Json -Depth 20) + "`n")
    } catch {
        Copy-Item -LiteralPath $Src -Destination $Dst -Force
    }
}

function Copy-Adapter {
    param([string]$Rel)
    # AGENTS.md se instala desde dist/: la variante del repositorio habla de
    # scripts/ y templates/, que no existen en el proyecto de destino.
    if ($Rel -eq 'AGENTS.md' -and (Test-Path -LiteralPath (Join-Path $ScriptDir 'dist/AGENTS.md'))) {
        $src = Join-Path $ScriptDir 'dist/AGENTS.md'
    } else {
        $src = Join-Path $ScriptDir $Rel
    }
    $dst = Join-Path $TargetDir $Rel
    if (-not (Test-Path -LiteralPath $src)) { return }
    if ((Test-Path -LiteralPath $dst) -and -not $Yes) {
        Say "  - $Rel (ya existia, se respeta)" 'DarkGray'
        return
    }
    $dstDir = Split-Path -Parent $dst
    if ($dstDir -and -not (Test-Path -LiteralPath $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
    Backup-IfNeeded $dst
    if ($Rel -eq '.gemini/settings.json') {
        Merge-GeminiSettings -Src $src -Dst $dst
    } elseif ($Rel -like '*.json') {
        Copy-Item -LiteralPath $src -Destination $dst -Force
    } else {
        Write-Utf8NoBom -Path $dst -Content (Remove-GeneratedHeader ([System.IO.File]::ReadAllText($src)))
    }
    $script:created.Add($Rel) | Out-Null
    Say "  OK $Rel" 'Green'
}

if ($selectedAdapters.Count -gt 0) {
    Say ''
    Say 'Punteros para agentes...' 'Cyan'
    Say ''
    foreach ($rel in $selectedAdapters) { Copy-Adapter $rel }
}

# -------------------------------------------------------------------- resumen

Say ''
Say 'Tridente de Memoria inicializado.' 'Green'
Say ''
for ($i = 0; $i -lt $TridenteMasters.Count; $i++) {
    Say ("  " + $TridenteRoles[$i] + " - " + $TridenteMasters[$i]) 'Cyan'
}
Say ''
Say "$($created.Count) archivo(s) escrito(s) en $TargetDir" 'DarkGray'
Say ''
Say 'Siguiente paso: abre tu agente de IA y dile:' 'Blue'
Say '  "Lee el Tridente de Memoria y empecemos a trabajar"' 'White'
Say ''

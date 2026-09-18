#!/usr/bin/env node
/**
 * Tridente de Memoria — validador con puntaje.
 *
 *   node scripts/validate.mjs                 audita ESTE repositorio (modo skill)
 *   node scripts/validate.mjs --project [dir] audita el Tridente de un proyecto
 *   node scripts/validate.mjs --json          salida JSON
 *   node scripts/validate.mjs --min 95        umbral (por defecto 95)
 *   node scripts/validate.mjs --strict        en modo proyecto, exige el umbral
 *   node scripts/validate.mjs --no-tests      omite ejecutar la suite de pruebas
 *
 * Código de salida:
 *   - Modo repositorio: 0 si el puntaje >= umbral. Es una puerta de calidad.
 *   - Modo proyecto: 0 si la ESTRUCTURA está íntegra. El contenido a medio
 *     rellenar baja el puntaje pero no falla: un Tridente recién creado tiene
 *     huecos por definición, y una barra de progreso no tiene aprobado.
 *     Con --strict se aplica también el umbral.
 *   - 2 si el uso es incorrecto.
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  // Un valor que empieza por "--" es la bandera siguiente, no el valor.
  const v = i >= 0 ? argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : d;
};
const usageError = (msg) => {
  console.error(`✗ ${msg}`);
  console.error('  Uso: node scripts/validate.mjs [--project <dir>] [--min <n>] [--json]');
  process.exit(2);
};

const JSON_OUT = has('--json');
// Omite la comprobación que ejecuta `node --test`. Lo usan las propias pruebas
// al invocar al validador, para no anidar una ejecución de la suite dentro de
// otra: en un runner lento eso tarda minutos y agota cualquier timeout.
//
// La variable de entorno es el cinturón además de los tirantes: al lanzar la
// suite se marca el entorno, y cualquier validador que esa suite invoque —con
// bandera o sin ella— hereda la marca y no vuelve a lanzarla. Así la recursión
// es imposible por construcción, en vez de depender de acordarse del flag.
const NESTED = process.env.TRIDENTE_VALIDATING === '1';
const NO_TESTS = has('--no-tests') || NESTED;
const MIN = Number(val('--min', '95'));
if (!Number.isFinite(MIN) || MIN < 0 || MIN > 100) usageError('--min debe ser un número entre 0 y 100.');
const PROJECT_MODE = has('--project');
const PROJECT_DIR = PROJECT_MODE ? resolve(val('--project', '.')) : null;
if (PROJECT_MODE && !existsSync(PROJECT_DIR)) usageError(`El directorio no existe: ${PROJECT_DIR}`);

const spec = JSON.parse(readFileSync(join(ROOT, 'protocol', 'tridente.spec.json'), 'utf8'));
const byId = Object.fromEntries(spec.files.map((f) => [f.id, f]));

// ------------------------------------------------------------------ utilidades

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const exists = (p) => existsSync(p);
const tryRead = (p) => (exists(p) ? read(p) : null);

/** Todos los archivos bajo un directorio, sin exclusiones. */
function walkAll(dir, acc = []) {
  if (!exists(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkAll(p, acc);
    else acc.push(p);
  }
  return acc;
}

function walk(dir, filter, acc = [], base = dir) {
  if (!exists(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    // jules_session/ y GCP_Proyectos/ no forman parte del skill; su presencia
    // la denuncia hyg.stray-absent, no hace falta contarla dos veces.
    if (['.git', 'node_modules', 'jules_session', 'GCP_Proyectos'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, acc, base);
    else if (filter(p)) acc.push(p);
  }
  return acc;
}

function run(cmd, args, opts = {}) {
  try {
    const out = execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
      ...opts,
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** GitHub slug de un encabezado markdown. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, '')
    // El selector de variación U+FE0F sobrevive de forma inconsistente al
    // slugger de GitHub; lo normalizamos fuera en ambos lados de la comparación.
    .replace(/️/g, '')
    .replace(/\s+/g, '-');
}

function headingsOf(md) {
  // Los bloques de código contienen encabezados de ejemplo ("### YYYY-MM-DD —
  // [Título]"); contarlos haría permisivo el chequeo de anclas.
  const clean = md.replace(/^```[\s\S]*?^```/gm, '');
  return [...clean.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].trim());
}

// ------------------------------------------------- marcadores de plantilla

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Textos entre corchetes que el Tridente emite como marcador para rellenar.
 *
 * NO se escriben a mano: se extraen de los propios artefactos generados y se
 * completan con los hints del spec. Una lista transcrita sería una segunda
 * fuente de verdad dentro del validador, y ya se desincronizó una vez: tres
 * hints que el generador emite en `AGENTS.md` no estaban en la lista, así que
 * una entrada pegada literalmente desde ahí contaba como sección rellena.
 */
function placeholderLiterals() {
  const out = new Set();

  // 1. Todo `[...]` que aparezca en un artefacto markdown generado es, por
  //    definición, texto que el usuario debe sustituir. Sólo markdown: en un
  //    manifiesto de PowerShell, `[ordered]@{` es sintaxis del lenguaje.
  for (const g of spec.generated.filter((p) => /\.(md|mdc)$/.test(p))) {
    const t = tryRead(join(ROOT, g));
    if (t === null) continue;
    for (const m of t.matchAll(/\[[^\]\n]{1,120}\]/g)) {
      const inner = m[0].slice(1, -1).trim();
      if (!inner || /^[ x]$/i.test(inner)) continue; // casillas de tarea
      // Un enlace markdown `[texto](url)` no es un marcador para rellenar:
      // borrarlo convertiría en "sección vacía" un texto que cita un enlace.
      if (t.includes(`${m[0]}(`)) continue;
      out.add(m[0]);
    }
  }

  // 2. Los hints del spec, por si alguno no llegara a ningún artefacto.
  const hints = [
    ...Object.values(spec.entries).flatMap((e) => (e.fields ?? []).flatMap((f) => [f.hint, f.hintEn])),
    ...spec.init.tokens.map((t) => t.hint),
  ].filter(Boolean);
  for (const h of hints) out.add(`[${h}]`);

  return out;
}

const PLACEHOLDERS = placeholderLiterals();
const PLACEHOLDER_RE = PLACEHOLDERS.size
  ? new RegExp([...PLACEHOLDERS].map(escapeRe).join('|'), 'g')
  : /(?!)/g;

/**
 * Texto que una persona escribió de verdad en una sección: sin marcadores de
 * plantilla, encabezados, viñetas, separadores de tabla ni etiquetas de campo.
 *
 * Los corchetes se quitan por coincidencia EXACTA con un marcador conocido, no
 * por forma: `[Vitest]`, `[ADR-004]` o `[RFC 7231]` son documentación técnica
 * normal y deben contar como contenido.
 */
function realContent(body) {
  return body
    .replace(/\{\{[A-Z_]+\}\}/g, '')
    .replace(PLACEHOLDER_RE, '')
    .replace(/^\s*[-*]\s*\[[ x]\]/gim, '') // casillas de tarea
    .replace(/^\s*\|[\s:|-]*\|\s*$/gm, '') // separadores de tabla
    .replace(/\*\*[^*]+:\*\*/g, '') // etiquetas de campo "**Decisión:**"
    .replace(/^#{1,6}\s.*$/gm, '')
    .replace(/[\s*_`>|—·:.\-]/g, '')
    .trim();
}

/**
 * ¿Esto es contenido o relleno?
 *
 * Un comprobador estático no juzga significado: esta categoría mide PRESENCIA,
 * no calidad, y un 100 aquí no avala que lo escrito sea bueno. Lo que sí puede
 * hacer es descartar lo barato — `xxx`, `???`, `aaa` no son respuestas.
 *
 * Los criterios están elegidos para no castigar contenido legítimo corto:
 * `k8s` e `i18n` tienen letras no consecutivas, `2026` y `1.0.0` son sólo
 * dígitos, y en chino o japonés dos caracteres ya son una respuesta completa.
 */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

function minCharsFor(content) {
  // Tres caracteres es una suposición latina: 支付 ("pagos") es una respuesta.
  if (CJK.test(content)) return 2;
  // Y también lo es `Go`. Dos caracteres bastan cuando son dos letras
  // DISTINTAS: deja pasar `Go` y `Vue` sin abrir la puerta a `aa` ni a `S3`.
  const letters = content.match(/\p{L}/gu) ?? [];
  if (letters.length === 2 && new Set(letters.map((c) => c.toLowerCase())).size === 2) return 2;
  return 3;
}

function looksLikeFiller(content) {
  const alnum = content.replace(/[^\p{L}\p{N}]/gu, '');
  const distinct = new Set(alnum.toLowerCase());
  if (distinct.size < 2) return true; // xxx, aaa, ???, 1111

  const letters = (alnum.match(/\p{L}/gu) ?? []).length;
  const distinctDigits = new Set(alnum.match(/\p{N}/gu) ?? []).size;
  // Dos letras (no necesariamente seguidas: k8s, i18n) o un número con forma
  // de versión o año (2026, 1.0.0).
  return letters < 2 && distinctDigits < 2;
}

// -------------------------------------------------------------- infraestructura

const results = [];
let currentCat = null;

/**
 * Abre una categoría.
 *
 * `weight` es el peso REAL sobre 100: el puntaje final se calcula normalizando
 * cada categoría a su peso, no sumando puntos sueltos. Así, añadir una
 * comprobación redistribuye los puntos dentro de su categoría en vez de
 * cambiar en silencio cuánto pesa esa categoría en el total.
 *
 * `structural` marca las categorías que describen si el Tridente está ROTO
 * (frente a las que miden cuánto se ha rellenado). En modo proyecto sólo las
 * estructurales deciden el código de salida.
 */
function category(name, weight, { structural = true } = {}) {
  currentCat = { name, weight, structural, checks: [] };
  results.push(currentCat);
}

/** check(id, descripción, puntos, fn) — fn devuelve true | string(error) | {ok, detail}. */
function check(id, desc, points, fn) {
  let ok = false;
  let detail = '';
  try {
    const r = fn();
    if (r === true) ok = true;
    else if (r === false) ok = false;
    else if (typeof r === 'string') detail = r;
    else if (r && typeof r === 'object') {
      ok = !!r.ok;
      detail = r.detail ?? '';
    }
  } catch (e) {
    detail = `excepción: ${e.message}`;
  }
  currentCat.checks.push({ id, desc, points: ok ? points : 0, max: points, ok, detail });
}

// ============================================================ MODO REPOSITORIO

function auditRepo() {
  const mdFiles = walk(ROOT, (p) => p.endsWith('.md'));

  // ------------------------------------------------- 1. SSOT y sincronización
  category('SSOT y sincronización', 28);

  check('ssot.sync', 'La documentación derivada coincide con el SSOT (sync --check)', 8, () => {
    const r = run(process.execPath, ['scripts/sync.mjs', '--check']);
    return { ok: r.code === 0, detail: r.code === 0 ? '' : r.out.trim().split('\n').slice(-6).join(' | ') };
  });

  check('ssot.header', 'Todo archivo generado lleva la cabecera "no editar a mano"', 4, () => {
    const bad = spec.generated.filter((g) => {
      const t = tryRead(join(ROOT, g));
      if (t === null) return true;
      if (g.endsWith('.json')) return !t.includes('Tridente de Memoria');
      return !t.includes('tridente:header-start');
    });
    return { ok: bad.length === 0, detail: bad.join(', ') };
  });

  check('ssot.order', 'Ningún documento contradice el orden de lectura/escritura', 5, () => {
    const names = spec.files.map((f) => f.filename);
    const readSeq = spec.readOrder.map((id) => byId[id].filename).join('>');
    const writeSeq = spec.writeOrder.map((id) => byId[id].filename).join('>');
    const bad = [];
    for (const p of mdFiles) {
      const t = read(p);
      // Listas numeradas que citan los 3 archivos maestros.
      const items = [...t.matchAll(/^\s*\d+\.\s+.*$/gm)].map((m) => m[0]);
      for (let i = 0; i + 2 < items.length + 1; i++) {
        const window = items.slice(i, i + 3);
        if (window.length < 3) break;
        const seq = window.map((line) => names.find((n) => line.includes(n)));
        if (seq.every(Boolean) && new Set(seq).size === 3) {
          const j = seq.join('>');
          if (j !== readSeq && j !== writeSeq) bad.push(`${relative(ROOT, p)}: ${j}`);
        }
      }
    }
    return { ok: bad.length === 0, detail: [...new Set(bad)].join(' · ') };
  });

  check('ssot.date', 'No quedan formatos de fecha antiguos (DD/MM/AAAA)', 4, () => {
    const bad = [];
    for (const p of [...mdFiles, join(ROOT, 'init-tridente.sh'), join(ROOT, 'init-tridente.ps1')]) {
      if (!exists(p)) continue;
      // La justificación del spec cita el formato viejo a propósito: no cuenta.
      const t = read(p).split(spec.dateFormat.rationale).join('');
      const hit = t.match(/\[DD\/MM\/(?:AAAA|YYYY)\]|dd\/MM\/yyyy|\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
      if (hit) bad.push(`${relative(ROOT, p)} (${hit[0]})`);
    }
    return { ok: bad.length === 0, detail: bad.join(', ') };
  });

  check('ssot.hardcode', 'El spec no repite nombres de archivo maestros en su prosa', 4, () => {
    // Un `gemini.md` escrito a mano dentro de un hint sobrevive a un renombrado
    // y produce un AGENTS.md que se contradice a sí mismo.
    const masters = spec.files.map((f) => f.filename);
    const bad = [];
    const walkSpec = (node, path) => {
      if (typeof node === 'string') {
        // `files[].filename` y `aliases` son la definición: ahí sí van literales.
        if (/^files\[\d+]\.(filename|aliases)/.test(path)) return;
        if (/^generated\[/.test(path) || /^injectedBlocks/.test(path)) return;
        for (const m of masters) if (node.includes(m)) bad.push(`${path}: "${m}"`);
      } else if (Array.isArray(node)) {
        node.forEach((v, i) => walkSpec(v, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) walkSpec(v, path ? `${path}.${k}` : k);
      }
    };
    walkSpec(spec, '');
    return { ok: bad.length === 0, detail: bad.slice(0, 5).join(' · ') };
  });

  check('ssot.injected-blocks', 'Los documentos conservan todos sus bloques obligatorios', 4, () => {
    const bad = [];
    for (const [file, ids] of Object.entries(spec.injectedBlocks ?? {})) {
      const t = tryRead(join(ROOT, file));
      if (t === null) {
        bad.push(`falta ${file}`);
        continue;
      }
      const missing = ids.filter((id) => !t.includes(`tridente:begin:${id}`));
      if (missing.length) bad.push(`${file}: ${missing.join(', ')}`);
    }
    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  check('ssot.prose', 'La prosa escrita a mano no repite nombres de archivo maestros', 4, () => {
    // `ssot.hardcode` vigila el spec y el generador vigila lo generado, pero
    // un nombre suelto en la prosa de un README sobrevive a un renombrado y
    // vuelve a desincronizar la documentación. Se permite dentro de bloques
    // inyectados (se regeneran) y dentro de bloques de código (son ejemplos).
    const generated = new Set(spec.generated.map((g) => join(ROOT, g)));
    const masters = spec.files.map((f) => f.filename);
    const bad = [];
    // No sólo .md: una plantilla de issue o un script también pueden fijar un
    // nombre de archivo que sobreviva a un renombrado del spec.
    const handwritten = walk(ROOT, (p) => /\.(md|ya?ml|sh|ps1)$/.test(p));
    for (const p of handwritten) {
      if (generated.has(p)) continue;
      const rel = relative(ROOT, p).split('\\').join('/');
      // CHANGELOG e historial documentan el pasado a propósito.
      if (['CHANGELOG.md', 'templates/README.md'].includes(rel)) continue;
      const stripped = read(p)
        .replace(/<!--\s*tridente:begin:[\w-]+\s*-->[\s\S]*?<!--\s*tridente:end:[\w-]+\s*-->/g, '')
        .replace(/^```[\s\S]*?^```/gm, '')
        .replace(/`[^`\n]*`/g, (m) => (masters.some((n) => m.includes(n)) ? m : ''));
      for (const m of masters) {
        if (stripped.includes(m)) bad.push(`${rel}: "${m}"`);
      }
    }
    return { ok: bad.length === 0, detail: [...new Set(bad)].slice(0, 6).join(' · ') };
  });

  check('ssot.placeholders', 'Ningún marcador generado sobrevive al medidor de contenido', 4, () => {
    // El fallo simétrico: si el generador emite un `[hint]` que el medidor no
    // reconoce, una entrada pegada tal cual desde AGENTS.md cuenta como
    // sección rellena. Se comprueba contra los artefactos, no contra una lista.
    const survivors = new Set();
    for (const g of spec.generated.filter((p) => /\.(md|mdc)$/.test(p))) {
      const t = tryRead(join(ROOT, g));
      if (t === null) continue;
      for (const m of t.matchAll(/\[[^\]\n]{1,120}\]/g)) {
        const inner = m[0].slice(1, -1).trim();
        if (!inner || /^[ x]$/i.test(inner)) continue;
        // Los enlaces markdown no son marcadores para rellenar.
        if (t.includes(`${m[0]}(`)) continue;
        if (realContent(m[0]).length > 0) survivors.add(`${g}: ${m[0]}`);
      }
    }
    return { ok: survivors.size === 0, detail: [...survivors].slice(0, 5).join(' · ') };
  });

  check('ssot.orphans', 'templates/ no contiene archivos huérfanos', 3, () => {
    const dir = join(ROOT, 'templates');
    if (!exists(dir)) return { ok: false, detail: 'no existe templates/' };
    const legit = new Set([...spec.files.map((f) => f.filename), 'README.md']);
    const orphans = readdirSync(dir).filter((n) => n.endsWith('.md') && !legit.has(n));
    return { ok: orphans.length === 0, detail: orphans.join(', ') };
  });

  check('ssot.tokens', 'Los tokens de plantilla coinciden con el spec', 4, () => {
    const declared = new Set(spec.init.tokens.map((t) => t.token));
    const problems = [];
    for (const t of spec.init.tokens) {
      for (const fid of t.files) {
        const tpl = tryRead(join(ROOT, 'templates', byId[fid].filename));
        if (tpl === null || !tpl.includes(t.token)) problems.push(`falta ${t.token} en ${byId[fid].filename}`);
      }
    }
    for (const f of spec.files) {
      const tpl = tryRead(join(ROOT, 'templates', f.filename));
      if (tpl === null) continue;
      for (const m of tpl.matchAll(/\{\{[A-Z_]+\}\}/g)) {
        if (!declared.has(m[0])) problems.push(`token no declarado ${m[0]} en ${f.filename}`);
      }
    }
    return { ok: problems.length === 0, detail: problems.join(' · ') };
  });

  // ------------------------------------------------ 2. Compatibilidad agentes
  category('Compatibilidad multi-agente', 18);

  const nonNative = spec.adapters.filter((a) => a.kind !== 'native');

  check('compat.files', 'Existe un puntero para cada herramienta declarada', 8, () => {
    const missing = nonNative.filter((a) => !exists(join(ROOT, a.path))).map((a) => a.path);
    return { ok: missing.length === 0, detail: missing.join(', ') };
  });

  check('compat.points', 'Cada puntero reenvía a AGENTS.md', 4, () => {
    const bad = nonNative
      .filter((a) => {
        const t = tryRead(join(ROOT, a.path));
        return t === null || !t.includes('AGENTS.md');
      })
      .map((a) => a.path);
    return { ok: bad.length === 0, detail: bad.join(', ') };
  });

  check('compat.thin', 'Los punteros no duplican el protocolo (sin deriva posible)', 3, () => {
    const keys = [...spec.entries.lesson.fields, ...spec.entries.decision.fields].map((f) => f.key);
    const fat = nonNative
      .filter((a) => {
        const t = tryRead(join(ROOT, a.path));
        if (t === null) return false;
        const restates = keys.filter((k) => t.includes(`**${k}:**`)).length;
        return t.length > 3000 || restates >= 3;
      })
      .map((a) => a.path);
    return { ok: fat.length === 0, detail: fat.join(', ') };
  });

  check('compat.skill', 'El frontmatter de SKILL.md es válido para Claude Code / Cursor', 3, () => {
    const t = tryRead(join(ROOT, 'SKILL.md'));
    if (t === null) return { ok: false, detail: 'SKILL.md no existe' };
    const fm = t.match(/^---\n([\s\S]*?)\n---/);
    if (!fm) return { ok: false, detail: 'sin frontmatter YAML' };
    const name = fm[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const desc = fm[1].match(/^description:\s*([\s\S]*?)(?=\n\w+:|$)/m)?.[1]?.trim();
    const errs = [];
    if (!name) errs.push('falta name');
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errs.push(`name no es kebab-case: ${name}`);
    else if (name !== spec.protocol.id) errs.push(`name (${name}) != spec.protocol.id (${spec.protocol.id})`);
    if (!desc) errs.push('falta description');
    else if (desc.length < 20 || desc.length > 1024) errs.push(`description de ${desc.length} caracteres`);
    if (/\n\s*>-?\s*$/.test(fm[1].split('description:')[0])) errs.push('description multilínea frágil');
    return { ok: errs.length === 0, detail: errs.join('; ') };
  });

  check('compat.no-gemini-collision', 'No hay GEMINI.md en la raíz (colisiona con gemini.md)', 2, () => {
    const entries = readdirSync(ROOT);
    const hits = entries.filter((e) => e.toLowerCase() === 'gemini.md');
    return { ok: hits.length === 0, detail: hits.join(', ') };
  });

  // --------------------------------------------------- 3. Integridad documental
  category('Integridad documental', 14);

  check('docs.links', 'Todos los enlaces e imágenes relativos resuelven', 5, () => {
    const broken = [];
    for (const p of mdFiles) {
      const t = read(p);
      for (const m of t.matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const target = m[1];
        if (/^(https?:|mailto:|file:|#|data:)/.test(target)) continue;
        const clean = target.split('#')[0];
        if (!clean) continue;
        if (!exists(resolve(dirname(p), decodeURIComponent(clean)))) {
          broken.push(`${relative(ROOT, p)} → ${target}`);
        }
      }
    }
    return { ok: broken.length === 0, detail: broken.slice(0, 6).join(' · ') };
  });

  check('docs.anchors', 'Todas las anclas internas (#...) resuelven a un encabezado', 4, () => {
    const broken = [];
    for (const p of mdFiles) {
      const t = read(p);
      const slugs = new Set(headingsOf(t).map(slug));
      for (const m of t.matchAll(/\[[^\]]*\]\(#([^)\s]+)\)/g)) {
        const a = decodeURIComponent(m[1]).toLowerCase().replace(/️/g, '');
        if (!slugs.has(a)) broken.push(`${relative(ROOT, p)} → #${m[1]}`);
      }
    }
    return { ok: broken.length === 0, detail: broken.slice(0, 6).join(' · ') };
  });

  check('docs.parity', 'Paridad de secciones entre versión ES e EN', 3, () => {
    const pairs = [
      ['README.md', 'README_EN.md'],
      ['AGENTS.md', 'docs/AGENTS.en.md'],
    ];
    const bad = [];
    for (const [es, en] of pairs) {
      const a = tryRead(join(ROOT, es));
      const b = tryRead(join(ROOT, en));
      if (a === null || b === null) {
        bad.push(`falta ${a === null ? es : en}`);
        continue;
      }
      const ha = (a.match(/^##\s/gm) || []).length;
      const hb = (b.match(/^##\s/gm) || []).length;
      if (ha !== hb) bad.push(`${es} tiene ${ha} secciones H2 y ${en} tiene ${hb}`);
    }
    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  check('docs.markers', 'Los README usan marcadores auto-sincronizados', 3, () => {
    const bad = [];
    for (const f of ['README.md', 'README_EN.md']) {
      const t = tryRead(join(ROOT, f));
      if (t === null) {
        bad.push(`falta ${f}`);
        continue;
      }
      const n = (t.match(/<!--\s*tridente:begin:/g) || []).length;
      if (n < 3) bad.push(`${f} sólo tiene ${n} bloque(s) sincronizado(s)`);
    }
    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  // ------------------------------------------------------------- 4. Scripts
  category('Scripts de inicialización', 18);

  const SH = join(ROOT, 'init-tridente.sh');
  const PS = join(ROOT, 'init-tridente.ps1');

  check('sh.exists', 'Ambos scripts existen y se referencian en la documentación', 3, () => {
    if (!exists(SH) || !exists(PS)) return { ok: false, detail: 'falta un script' };
    const agents = read(join(ROOT, 'AGENTS.md'));
    return {
      ok: agents.includes('init-tridente.sh') && agents.includes('init-tridente.ps1'),
      detail: 'AGENTS.md no menciona ambos scripts',
    };
  });

  check('sh.help', 'Ambos scripts responden a --help / -? sin efectos secundarios', 3, () => {
    const a = run('bash', [SH, '--help']);
    const okSh = a.code === 0 && /USO|USAGE/.test(a.out);
    let okPs = true;
    let psDetail = '';
    const pwsh = ['pwsh', 'powershell'].find((c) => run(c, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major']).code === 0);
    if (pwsh) {
      const b = run(pwsh, ['-NoProfile', '-Command', `Get-Help -Full '${PS}' | Out-String`]);
      okPs = b.code === 0 && /SYNOPSIS|SINOPSIS/i.test(b.out);
      if (!okPs) psDetail = 'Get-Help falla sobre init-tridente.ps1';
    } else {
      psDetail = '(PowerShell no disponible, omitido)';
    }
    return { ok: okSh && okPs, detail: [okSh ? '' : 'bash --help falla', psDetail].filter(Boolean).join('; ') };
  });

  check('sh.encoding', 'Codificación correcta: .ps1 con BOM UTF-8, .sh sin BOM y con shebang', 3, () => {
    const psBuf = readFileSync(PS);
    const shBuf = readFileSync(SH);
    const errs = [];
    if (!(psBuf[0] === 0xef && psBuf[1] === 0xbb && psBuf[2] === 0xbf)) {
      errs.push('init-tridente.ps1 sin BOM UTF-8 (Windows PowerShell 5.1 lo leería como ANSI)');
    }
    if (shBuf[0] === 0xef) errs.push('init-tridente.sh tiene BOM');
    if (!read(SH).startsWith('#!')) errs.push('init-tridente.sh sin shebang');
    if (read(SH).includes('\r\n')) errs.push('init-tridente.sh con CRLF');
    return { ok: errs.length === 0, detail: errs.join('; ') };
  });

  check('sh.syntax', 'Ambos scripts pasan el análisis sintáctico de su intérprete', 3, () => {
    const a = run('bash', ['-n', SH]);
    const errs = [];
    if (a.code !== 0) errs.push(`bash -n: ${a.out.trim().slice(0, 160)}`);
    const pwsh = ['pwsh', 'powershell'].find((c) => run(c, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major']).code === 0);
    if (pwsh) {
      const script =
        `$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${PS.replace(/'/g, "''")}',[ref]$null,[ref]$e);` +
        `if($e -and $e.Count){$e|ForEach-Object{$_.Message};exit 1}`;
      const b = run(pwsh, ['-NoProfile', '-Command', script]);
      if (b.code !== 0) errs.push(`parser PS: ${b.out.trim().slice(0, 160)}`);
    }
    return { ok: errs.length === 0, detail: errs.join('; ') };
  });

  check('sh.no-duplication', 'Los scripts no incrustan datos del protocolo', 3, () => {
    const headings = spec.files.flatMap((f) => f.sections.map((s) => `## ${s.heading}`));
    const masters = spec.files.map((f) => f.filename);
    const roles = spec.files.map((f) => f.role);
    const bad = [];
    for (const p of [SH, PS]) {
      const rel = relative(ROOT, p);
      // Los comentarios no son datos ejecutables: se excluyen del escaneo.
      const code = read(p)
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');
      const hit = [
        ...headings.filter((h) => code.includes(h)),
        // Nombres y roles deben venir del manifiesto, no escritos a mano:
        // tras un renombrado, el resumen final mentiría.
        ...masters.filter((m) => code.includes(m)),
        ...roles.filter((r) => code.includes(`"${r}"`) || code.includes(`'${r}'`)),
      ];
      if (hit.length) bad.push(`${rel} incrusta: ${[...new Set(hit)].slice(0, 3).join(', ')}`);
      if (!/templates/.test(code)) bad.push(`${rel} no lee templates/`);
      if (!/manifest\.(sh|ps1)/.test(code)) bad.push(`${rel} no carga el manifiesto del spec`);
    }
    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  check('sh.manifest', 'Los manifiestos reflejan exactamente el spec, en ambos sentidos', 3, () => {
    const expected = [];
    const seen = new Set();
    for (const a of spec.adapters) {
      if (a.kind === 'native' && a.path !== 'AGENTS.md') continue;
      if (seen.has(a.path)) continue;
      seen.add(a.path);
      expected.push([a.key, a.path]);
    }
    const bad = [];

    const sh = tryRead(join(ROOT, 'protocol', 'manifest.sh'));
    if (sh === null) bad.push('falta protocol/manifest.sh');
    else {
      const keys = sh.match(/TRIDENTE_ADAPTER_KEYS=\(([^)]*)\)/)?.[1].match(/"([^"]*)"/g) ?? [];
      const paths = sh.match(/TRIDENTE_ADAPTER_PATHS=\(([^)]*)\)/)?.[1].match(/"([^"]*)"/g) ?? [];
      if (keys.length !== paths.length) bad.push(`manifest.sh: ${keys.length} claves vs ${paths.length} rutas`);
      const pairs = keys.map((k, i) => [k.slice(1, -1), (paths[i] ?? '').slice(1, -1)]);
      if (JSON.stringify(pairs) !== JSON.stringify(expected)) bad.push('manifest.sh no coincide con spec.adapters');
      const masters = (sh.match(/TRIDENTE_MASTERS=\(([^)]*)\)/)?.[1].match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
      if (JSON.stringify(masters) !== JSON.stringify(spec.files.map((f) => f.filename))) {
        bad.push('manifest.sh: lista de maestros distinta del spec');
      }
    }

    const ps = tryRead(join(ROOT, 'protocol', 'manifest.ps1'));
    if (ps === null) bad.push('falta protocol/manifest.ps1');
    else {
      const block = ps.match(/\$TridenteAdapters = \[ordered\]@\{([\s\S]*?)\n\}/)?.[1] ?? '';
      const pairs = [...block.matchAll(/'([^']+)'\s*=\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
      if (JSON.stringify(pairs) !== JSON.stringify(expected)) bad.push('manifest.ps1 no coincide con spec.adapters');
    }

    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  check('sh.noninteractive', 'Sin TTY, ambos scripts fallan rápido en vez de colgarse o pisar archivos', 4, () => {
    const tmp = mkdtempSync(join(tmpdir(), 'tridente-val-'));
    const bad = [];
    try {
      // Falta un dato obligatorio y no hay terminal: debe abortar, no girar.
      const a = run('bash', [SH, '--dir', tmp, '-s', 's', '-r', 'r', '-m', 'm', '--yes', '--no-color'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 20000,
      });
      if (a.code === 0) bad.push('bash no aborta al faltar --goal sin TTY');

      // Colisión sin --yes: no debe tocar el archivo del usuario.
      writeFileSync(join(tmp, byId.dna.filename), '# centinela\n');
      const b = run('bash', [SH, '--dir', tmp, '-g', 'g', '-s', 's', '-r', 'r', '-m', 'm', '--no-color'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 20000,
      });
      if (b.code === 0) bad.push('bash no aborta ante colisión sin --yes');
      if (!read(join(tmp, byId.dna.filename)).includes('centinela')) bad.push('bash sobrescribió sin permiso');

      const pwsh = ['pwsh', 'powershell'].find((c) => run(c, ['-NoProfile', '-Command', 'exit 0']).code === 0);
      if (pwsh) {
        const c = run(pwsh, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, '-Dir', tmp,
          '-Goal', 'g', '-Stack', 's', '-Rules', 'r', '-Milestone', 'm', '-NoColor'],
          { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
        if (c.code === 0) bad.push('PowerShell no aborta ante colisión sin -Yes');
        if (!read(join(tmp, byId.dna.filename)).includes('centinela')) bad.push('PowerShell sobrescribió sin permiso');
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  check('sh.project-agents', 'El AGENTS.md que se instala no cita rutas del repositorio del skill', 3, () => {
    const t = tryRead(join(ROOT, 'dist', 'AGENTS.md'));
    if (t === null) return { ok: false, detail: 'falta dist/AGENTS.md' };
    const leaks = ['scripts/', 'templates/', 'protocol/', 'docs/AGENTS', 'init-tridente.', 'sync.mjs', 'validate.mjs']
      .filter((needle) => t.replace(/<!--[\s\S]*?-->/g, '').includes(needle));
    return { ok: leaks.length === 0, detail: leaks.length ? `menciona: ${leaks.join(', ')}` : '' };
  });

  // ----------------------------------------------------- 5. Higiene del repo
  category('Higiene del repositorio', 8);

  const hygiene = [
    ['LICENSE', 'LICENSE'],
    ['CONTRIBUTING.md', 'CONTRIBUTING.md'],
    ['SECURITY.md', 'SECURITY.md'],
    ['CODE_OF_CONDUCT.md', 'CODE_OF_CONDUCT.md'],
    ['CHANGELOG.md', 'CHANGELOG.md'],
    ['.editorconfig', '.editorconfig'],
    ['.gitattributes', '.gitattributes'],
  ];
  for (const [id, path] of hygiene) {
    check(`hyg.${id}`, `Existe ${id}`, 1, () => exists(join(ROOT, path)));
  }

  check('hyg.templates', 'Plantillas de issue y de pull request', 1, () => {
    const okIssue = exists(join(ROOT, '.github', 'ISSUE_TEMPLATE'));
    const okPr = exists(join(ROOT, '.github', 'pull_request_template.md'));
    return { ok: okIssue && okPr, detail: [okIssue ? '' : 'sin ISSUE_TEMPLATE', okPr ? '' : 'sin pull_request_template.md'].filter(Boolean).join('; ') };
  });

  const STRAY = ['jules_session', 'GCP_Proyectos'];

  check('hyg.stray-ignored', 'Directorios ajenos excluidos del control de versiones', 1, () => {
    const gi = tryRead(join(ROOT, '.gitignore')) ?? '';
    const unignored = STRAY.filter((d) => exists(join(ROOT, d)) && !new RegExp('^' + d + '/?$', 'm').test(gi));
    return { ok: unignored.length === 0, detail: unignored.join(', ') };
  });

  check('hyg.stray-absent', 'Sin copias obsoletas del protocolo en el árbol de trabajo', 1, () => {
    // .gitignore protege al repositorio, no al agente: un agente que lee la
    // carpeta encuentra jules_session/ con el protocolo v1 (fechas DD/MM/AAAA)
    // y acaba con dos versiones contradictorias en contexto.
    const present = STRAY.filter((d) => exists(join(ROOT, d)));
    // El aviso describe el riesgo concreto: no basta con decir que la carpeta
    // existe, porque lo que hace daño es lo que un agente lee dentro.
    const describe = (d) => {
      const files = walkAll(join(ROOT, d)).filter((f) => /.(md|txt|ya?ml|json|sh|ps1)$/i.test(f));
      const legacy = files.filter((f) =>
        /DD\/MM\/(?:AAAA|YYYY)|\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(tryRead(f) ?? ''),
      );
      const proto = files.filter((f) => /(?:AGENTS|SKILL)\.md$/i.test(f));
      const bits = [];
      if (proto.length) bits.push(`${proto.length} archivo(s) de protocolo antiguos`);
      if (legacy.length) bits.push(`${legacy.length} con fechas en el formato retirado`);
      return `${d}/${bits.length ? ` (${bits.join(', ')})` : ''}`;
    };
    return {
      ok: present.length === 0,
      detail: present.length
        ? `${present.map(describe).join(' · ')} — un agente que lea la carpeta se llevará ambas versiones a contexto. ` +
          `Sácalo del repositorio: rm -rf ${present.join(' ')}`
        : '',
    };
  });

  check('hyg.banner', 'El banner pesa menos de 500 KB', 1, () => {
    const p = join(ROOT, 'banner.png');
    if (!exists(p)) return { ok: false, detail: 'banner.png no existe' };
    const kb = Math.round(statSync(p).size / 1024);
    return { ok: kb < 500, detail: `${kb} KB` };
  });

  // ------------------------------------------------------- 6. Pruebas y CI
  category('Pruebas y CI', 14);

  // La suite de pruebas invoca al validador y el validador invoca a la suite:
  // sin esta salida, una llamada desde un test lanza una ejecución anidada que
  // en un runner lento supera cualquier timeout razonable.
  if (!NO_TESTS) {
    check('test.run', 'La suite de pruebas pasa', 7, () => {
      if (!exists(join(ROOT, 'tests'))) return { ok: false, detail: 'no hay carpeta tests/' };
      const r = run(process.execPath, ['--test'], {
        timeout: 600000,
        env: { ...process.env, TRIDENTE_VALIDATING: '1' },
      });
      const m = r.out.match(/^# fail (\d+)$/m);
      return {
        ok: r.code === 0,
        detail: r.code === 0 ? '' : `fallos: ${m?.[1] ?? '?'} — ${r.out.trim().split('\n').slice(-4).join(' | ')}`,
      };
    });
  }

  check('test.count', 'Al menos 20 aserciones de prueba', 4, () => {
    if (!exists(join(ROOT, 'tests'))) return false;
    const files = walk(join(ROOT, 'tests'), (p) => p.endsWith('.mjs') || p.endsWith('.js'));
    const n = files.reduce((acc, p) => acc + (read(p).match(/\bit\(|\btest\(/g) || []).length, 0);
    return { ok: n >= 20, detail: `${n} pruebas` };
  });

  check('ci.workflow', 'CI ejecuta sync --check, validate y tests en Linux y Windows', 4, () => {
    const dir = join(ROOT, '.github', 'workflows');
    if (!exists(dir)) return { ok: false, detail: 'sin .github/workflows' };
    const all = walk(dir, (p) => /\.ya?ml$/.test(p))
      .map(read)
      .join('\n');
    const errs = [];
    if (!/sync\.mjs\s+--check/.test(all)) errs.push('no corre sync --check');
    if (!/validate\.mjs/.test(all)) errs.push('no corre validate');
    if (!/--test/.test(all)) errs.push('no corre las pruebas');
    if (!/windows-latest/.test(all)) errs.push('no prueba en Windows');
    if (!/ubuntu-latest/.test(all)) errs.push('no prueba en Linux');
    if (!/macos-latest/.test(all)) errs.push('no prueba en macOS (bash 3.2)');
    // El mínimo declarado en package.json debe probarse, no sólo declararse.
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    const min = pkg.engines?.node?.replace(/[^\d.]/g, '');
    if (min && !all.includes(min)) errs.push(`no prueba el Node mínimo declarado (${min})`);
    if (/uses:\s*\S+@master/.test(all)) errs.push('acción de terceros anclada a una rama móvil');
    if (!/git status --porcelain/.test(all)) errs.push('el chequeo de diferencias no ve archivos nuevos');
    return { ok: errs.length === 0, detail: errs.join('; ') };
  });
}

// =============================================================== MODO PROYECTO

function auditProject(dir) {
  const find = (f) => {
    const cands = [f.filename, ...f.aliases];
    for (const c of cands) {
      const p = join(dir, c);
      if (exists(p)) return p;
    }
    return null;
  };

  category('Presencia del Tridente', 30);
  for (const f of spec.files) {
    check(`have.${f.id}`, `Existe ${f.filename} (${f.role})`, 10, () => {
      const p = find(f);
      return { ok: !!p, detail: p ? '' : `busqué: ${[f.filename, ...f.aliases].join(', ')}` };
    });
  }

  category('Estructura de secciones', 25);
  for (const f of spec.files) {
    const pts = Math.round(25 / spec.files.length);
    check(`sect.${f.id}`, `${f.filename} tiene todas sus secciones obligatorias`, pts, () => {
      const p = find(f);
      if (!p) return { ok: false, detail: 'archivo ausente' };
      const hs = headingsOf(read(p)).map((h) => h.toLowerCase());
      const missing = f.sections
        .filter((s) => s.required && !hs.some((h) => h.includes(s.heading.toLowerCase())))
        .map((s) => s.heading);
      return { ok: missing.length === 0, detail: missing.join(', ') };
    });
  }

  category('Contenido real (no plantilla)', 20, { structural: false });

  /** Contenido de cada sección `##` de un documento, indexado por encabezado. */
  function sectionsOf(text) {
    const out = new Map();
    const parts = text.split(/^##\s+(.+)$/gm);
    for (let i = 1; i < parts.length; i += 2) out.set(parts[i].trim(), parts[i + 1] ?? '');
    return out;
  }

  /**
   * Texto útil de una sección: sin tokens, sin marcadores de plantilla, sin
   * encabezados, viñetas ni etiquetas de campo. Lo que queda es lo que una
   * persona escribió de verdad.
   *
   * Sin esto la métrica premiaba **borrar** las preguntas de la plantilla en
   * vez de responderlas: una sección vacía puntuaba perfecto y una sección con
   * los ejemplos intactos puntuaba peor.
   */
  for (const f of spec.files) {
    const pts = Math.round(20 / spec.files.length);
    check(`filled.${f.id}`, `${f.filename} tiene contenido real en cada sección`, pts, () => {
      const p = find(f);
      if (!p) return { ok: false, detail: 'archivo ausente' };
      const t = read(p);

      const tokens = (t.match(/\{\{[A-Z_]+\}\}/g) || []).length;
      if (tokens) return { ok: false, detail: `${tokens} token(s) sin rellenar` };

      const sections = sectionsOf(t);
      const thin = [];
      const filler = [];
      for (const s of f.sections.filter((x) => x.required)) {
        const key = [...sections.keys()].find((k) => k.toLowerCase().includes(s.heading.toLowerCase()));
        const body = key === undefined ? '' : sections.get(key);
        const content = realContent(body);
        if (content.length < minCharsFor(content)) thin.push(`${s.heading} (${content.length} car.)`);
        else if (looksLikeFiller(content)) filler.push(s.heading);
      }
      if (thin.length || filler.length) {
        const parts = [];
        if (thin.length) parts.push(`sin contenido real: ${thin.join(', ')}`);
        if (filler.length) parts.push(`relleno sin significado: ${filler.join(', ')}`);
        return { ok: false, detail: parts.join(' · ') };
      }

      const placeholders = (t.match(/\[(?:Ej:|Descripción|Tarea futura|¿|Regla \d|Componente|Qué)/g) || []).length;
      return { ok: placeholders <= 6, detail: placeholders ? `${placeholders} marcador(es) de plantilla por rellenar` : '' };
    });
  }

  category('Formato y sincronía', 25);

  check('fmt.date', `Todas las fechas usan ${spec.dateFormat.display} y existen`, 8, () => {
    const iso = new RegExp(spec.dateFormat.regex.replace(/^\^|\$$/g, ''), 'g');
    const bad = [];
    for (const f of spec.files) {
      const p = find(f);
      if (!p) continue;
      const t = read(p);

      const legacy = t.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g);
      if (legacy) bad.push(`${f.filename}: formato antiguo ${[...new Set(legacy)].slice(0, 3).join(', ')}`);

      // El formato correcto no basta: 2026-13-45 encaja con la forma y no existe.
      const impossible = [...new Set(t.match(iso) ?? [])].filter((d) => {
        const parsed = new Date(`${d}T00:00:00Z`);
        return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== d;
      });
      if (impossible.length) bad.push(`${f.filename}: fecha inexistente ${impossible.slice(0, 3).join(', ')}`);
    }
    return { ok: bad.length === 0, detail: bad.join(' · ') };
  });

  check('fmt.fields', 'Las entradas de bitácora y lección tienen todos sus campos', 8, () => {
    const problems = [];
    for (const [kind, entry] of Object.entries(spec.entries)) {
      if (kind === 'mine') continue;
      const f = byId[entry.file];
      const p = find(f);
      if (!p) continue;
      const t = read(p);
      const secIdx = t.toLowerCase().indexOf(entry.section.toLowerCase());
      if (secIdx < 0) {
        problems.push(`${f.filename}: falta la sección "${entry.section}"`);
        continue;
      }
      const body = t.slice(secIdx);
      const nEntries = (body.match(/^###\s+\d{4}-\d{2}-\d{2}/gm) || []).length;
      if (nEntries === 0) {
        problems.push(`${f.filename}: sin entradas fechadas en "${entry.section}"`);
        continue;
      }
      for (const field of entry.fields.filter((x) => x.required)) {
        const n = (body.match(new RegExp(`\\*\\*${field.key}:?\\*\\*`, 'g')) || []).length;
        if (n < nEntries) problems.push(`${f.filename}: "${field.key}" aparece ${n} vez/veces para ${nEntries} entrada(s)`);
      }
    }
    return { ok: problems.length === 0, detail: problems.slice(0, 4).join(' · ') };
  });

  check('fmt.crosslinks', 'Los tres archivos se referencian entre sí (un solo organismo)', 5, () => {
    const missing = [];
    for (const f of spec.files) {
      const p = find(f);
      if (!p) continue;
      const t = read(p);
      for (const other of spec.files) {
        if (other.id === f.id) continue;
        if (!t.includes(other.filename)) missing.push(`${f.filename} no menciona ${other.filename}`);
      }
    }
    return { ok: missing.length === 0, detail: missing.join(' · ') };
  });

  check('fmt.agents', 'AGENTS.md presente en la raíz del proyecto', 4, () => {
    return exists(join(dir, 'AGENTS.md'));
  });
}

// ------------------------------------------------------------------- ejecución

if (PROJECT_MODE) auditProject(PROJECT_DIR);
else auditRepo();

// El puntaje sale de los PESOS declarados, no de la suma de puntos: así el
// reparto entre categorías es una decisión explícita y no un efecto colateral
// de cuántas comprobaciones tenga cada una.
const totalWeight = results.reduce((a, c) => a + c.weight, 0);
if (totalWeight !== 100) {
  console.error(`✗ Error interno: los pesos de las categorías suman ${totalWeight}, no 100.`);
  process.exit(2);
}

let score = 0;
for (const cat of results) {
  cat.earned = cat.checks.reduce((a, c) => a + c.points, 0);
  cat.max = cat.checks.reduce((a, c) => a + c.max, 0);
  cat.pct = cat.max ? Math.round((cat.earned / cat.max) * 100) : 100;
  score += cat.max ? (cat.earned / cat.max) * cat.weight : cat.weight;
}
score = Math.round(score * 10) / 10;

// Dos modos, dos semánticas:
//  - repositorio: puerta de calidad para quien contribuye (pasa/no pasa).
//  - proyecto: diagnóstico. Un Tridente recién creado tiene el ADN a medio
//    llenar por definición; eso es progreso pendiente, no un fallo. Sólo
//    bloquea lo estructural, salvo que se pida --strict.
const STRICT = has('--strict');
const brokenCats = results.filter((c) => c.structural && c.earned < c.max);
const passed = PROJECT_MODE && !STRICT ? brokenCats.length === 0 : score >= MIN;

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        mode: PROJECT_MODE ? 'project' : 'repo',
        target: PROJECT_MODE ? PROJECT_DIR : ROOT,
        score,
        min: MIN,
        gate: PROJECT_MODE && !STRICT ? 'structural' : 'threshold',
        passed,
        brokenCategories: brokenCats.map((c) => c.name),
        categories: results,
      },
      null,
      2,
    ),
  );
} else {
  const bar = (pct) => {
    const n = Math.round(pct / 5);
    return '█'.repeat(n) + '░'.repeat(20 - n);
  };
  console.log('');
  console.log(`🔱 Tridente de Memoria — auditoría (${PROJECT_MODE ? 'proyecto' : 'repositorio del skill'})`);
  console.log(`   ${PROJECT_MODE ? PROJECT_DIR : ROOT}`);
  console.log('');
  for (const cat of results) {
    const tag = cat.structural ? '' : '  · progreso (mide presencia, no calidad)';
    console.log(`${bar(cat.pct)} ${String(cat.pct).padStart(3)}%  ${cat.name}  [peso ${cat.weight}]${tag}`);
    for (const c of cat.checks) {
      if (c.ok) continue;
      console.log(`      ✗ ${c.desc} [-${c.max}]`);
      if (c.detail) console.log(`        ${c.detail}`);
    }
  }
  console.log('');
  const gate = PROJECT_MODE && !STRICT
    ? 'estructura íntegra'
    : `umbral ${MIN}`;
  console.log(`${passed ? '✅' : '❌'} PUNTAJE: ${score.toFixed(1)} / 100   (${gate})`);
  if (PROJECT_MODE && !STRICT) {
    if (passed && score < 100) {
      console.log('   La estructura está completa. El puntaje sube conforme rellenes el contenido.');
      console.log('   Usa --strict para exigir también el umbral.');
    } else if (!passed) {
      console.log(`   Roto en: ${brokenCats.map((c) => c.name).join(', ')}. Corrige los ✗ de arriba.`);
    }
  } else if (!passed) {
    console.log(`   Faltan ${(MIN - score).toFixed(1)} puntos. Corrige los ✗ de arriba.`);
  }
  console.log('');
}

process.exit(passed ? 0 : 1);

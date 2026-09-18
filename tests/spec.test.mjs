/** El SSOT debe ser internamente coherente antes de generar nada a partir de él. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spec, byId, existsRoot } from './helpers.mjs';

test('el spec declara exactamente tres archivos maestros', () => {
  assert.equal(spec.files.length, 3, 'el Tridente tiene tres puntas');
});

test('cada archivo maestro tiene id, nombre, rol y propósito en los dos idiomas', () => {
  for (const f of spec.files) {
    for (const k of ['id', 'filename', 'role', 'roleEn', 'purpose', 'purposeEn', 'extract', 'extractEn', 'emoji']) {
      assert.ok(f[k], `${f.id}: falta "${k}"`);
    }
    assert.ok(f.filename.endsWith('.md'), `${f.id}: el nombre debe terminar en .md`);
    assert.ok(Array.isArray(f.sections) && f.sections.length > 0, `${f.id}: sin secciones`);
  }
});

test('los ids de archivo son únicos y los nombres también', () => {
  assert.equal(new Set(spec.files.map((f) => f.id)).size, spec.files.length);
  assert.equal(new Set(spec.files.map((f) => f.filename)).size, spec.files.length);
});

test('readOrder y writeOrder cubren los tres archivos sin repetir', () => {
  for (const [name, order] of [['readOrder', spec.readOrder], ['writeOrder', spec.writeOrder]]) {
    assert.equal(order.length, spec.files.length, `${name}: longitud incorrecta`);
    assert.equal(new Set(order).size, order.length, `${name}: ids repetidos`);
    for (const id of order) assert.ok(byId[id], `${name}: id desconocido "${id}"`);
  }
});

test('el orden de escritura empieza por las lecciones y termina por el plan', () => {
  // Es la regla que da sentido al "orden sagrado": el plan referencia a los
  // otros dos, así que se escribe al final.
  assert.equal(spec.writeOrder[0], 'lessons');
  assert.equal(spec.writeOrder.at(-1), 'plan');
});

test('el formato de fecha es ISO 8601 y su regex acepta el ejemplo', () => {
  assert.equal(spec.dateFormat.display, 'YYYY-MM-DD');
  assert.match(spec.dateFormat.example, new RegExp(spec.dateFormat.regex));
  assert.ok(spec.dateFormat.rationale.length > 20, 'toda decisión rompedora necesita justificación');
});

test('las secciones a las que apuntan las entradas existen en su archivo', () => {
  for (const [kind, entry] of Object.entries(spec.entries)) {
    const file = byId[entry.file];
    assert.ok(file, `${kind}: apunta a un archivo inexistente "${entry.file}"`);
    const headings = file.sections.map((s) => s.heading);
    assert.ok(headings.includes(entry.section), `${kind}: "${entry.section}" no está en ${file.filename} (${headings.join(', ')})`);
  }
});

test('los campos de cada entrada están en español e inglés y son únicos', () => {
  for (const [kind, entry] of Object.entries(spec.entries)) {
    if (!entry.fields) continue;
    const keys = entry.fields.map((f) => f.key);
    assert.equal(new Set(keys).size, keys.length, `${kind}: claves repetidas`);
    for (const f of entry.fields) {
      assert.ok(f.key && f.keyEn && f.hint && f.hintEn, `${kind}/${f.key}: faltan traducciones`);
    }
  }
});

test('la lección tiene los cuatro campos, incluido el impacto en reglas', () => {
  // Esta era la deriva concreta: AGENTS.md documentaba tres campos y las
  // plantillas cuatro, así que cada agente escribía una cosa distinta.
  const keys = spec.entries.lesson.fields.map((f) => f.key);
  assert.deepEqual(keys, ['Problema', 'Solución', 'Prevención', 'Impacto en reglas']);
});

test('la bitácora usa claves en español, como las plantillas', () => {
  const keys = spec.entries.decision.fields.map((f) => f.key);
  assert.deepEqual(keys, ['Decisión', 'Razón', 'Impacto', 'Relacionado']);
});

test('las plantillas de encabezado de entrada usan los marcadores {date} y {title}', () => {
  for (const [kind, entry] of Object.entries(spec.entries)) {
    if (!entry.headingTemplate) continue;
    assert.ok(entry.headingTemplate.includes('{date}'), `${kind}: sin {date}`);
    assert.ok(entry.headingTemplate.includes('{title}'), `${kind}: sin {title}`);
  }
});

test('no hay dos adaptadores apuntando al mismo archivo con distinto formato', () => {
  const kindByPath = new Map();
  for (const a of spec.adapters) {
    if (kindByPath.has(a.path)) {
      assert.equal(kindByPath.get(a.path), a.kind, `${a.path}: dos "kind" distintos`);
    }
    kindByPath.set(a.path, a.kind);
  }
});

test('ningún adaptador ocupa la ruta de un archivo maestro', () => {
  const masters = new Set(spec.files.map((f) => f.filename.toLowerCase()));
  for (const a of spec.adapters) {
    assert.ok(!masters.has(a.path.toLowerCase()), `${a.path} colisiona con un archivo maestro`);
  }
});

test('ningún adaptador colisiona con otro ignorando mayúsculas (Windows y macOS)', () => {
  // GEMINI.md y gemini.md son el MISMO archivo en NTFS y en APFS por defecto.
  // Varias herramientas pueden compartir una misma ruta (AGENTS.md nativo):
  // eso no es colisión, así que se deduplica antes de comparar.
  const paths = [...new Set([...spec.adapters.map((a) => a.path), ...spec.files.map((f) => f.filename)])];
  const lower = paths.map((p) => p.toLowerCase());
  const dupes = lower.filter((p, i) => lower.indexOf(p) !== i);
  assert.deepEqual([...new Set(dupes)], [], 'colisión en sistemas de archivos insensibles a mayúsculas');
});

test('cada adaptador declara herramienta, ruta, tipo y justificación', () => {
  const kinds = new Set(['native', 'markdown', 'mdc', 'import', 'json-context']);
  for (const a of spec.adapters) {
    assert.ok(a.tool && a.path && a.kind && a.note, `adaptador incompleto: ${JSON.stringify(a)}`);
    assert.ok(kinds.has(a.kind), `${a.tool}: kind desconocido "${a.kind}"`);
  }
});

test('todos los tokens de inicialización apuntan a archivos declarados', () => {
  for (const t of spec.init.tokens) {
    assert.match(t.token, /^\{\{[A-Z_]+\}\}$/, `token mal formado: ${t.token}`);
    for (const fid of t.files) assert.ok(byId[fid], `${t.token}: archivo desconocido "${fid}"`);
  }
});

test('spec.generated lista archivos que existen en el disco', () => {
  const missing = spec.generated.filter((g) => !existsRoot(g));
  assert.deepEqual(missing, [], 'ejecuta: node scripts/sync.mjs');
});

test('la versión del protocolo sigue versionado semántico', () => {
  assert.match(spec.protocol.version, /^\d+\.\d+\.\d+$/);
});

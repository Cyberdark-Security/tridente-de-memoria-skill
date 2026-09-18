/** El generador debe ser determinista y no dejar nada sin sincronizar. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, spec, byId, readRoot, existsRoot, run, withRepoCopy } from './helpers.mjs';

test('sync --check pasa: no hay documentación desincronizada', () => {
  const r = run(process.execPath, ['scripts/sync.mjs', '--check']);
  assert.equal(r.code, 0, r.out);
});

test('sync es idempotente: ejecutarlo dos veces no cambia nada', () => {
  // Se ejecuta sobre una copia: auditar el repositorio no debe escribir en él.
  withRepoCopy((copy) => {
    const first = run(process.execPath, [join(copy, 'scripts/sync.mjs')], { cwd: copy });
    assert.equal(first.code, 0, first.out);
    const second = run(process.execPath, [join(copy, 'scripts/sync.mjs')], { cwd: copy });
    assert.equal(second.code, 0, second.out);
    assert.match(second.out, /Ya estaba todo sincronizado/, second.out);
  });
});

test('sync repara un archivo generado editado a mano', () => {
  withRepoCopy((copy) => {
    const victim = join(copy, 'CLAUDE.md');
    writeFileSync(victim, '# lo edité a mano y rompí el puntero\n');

    const check = run(process.execPath, [join(copy, 'scripts/sync.mjs'), '--check'], { cwd: copy });
    assert.notEqual(check.code, 0, 'sync --check no detectó la edición manual');

    assert.equal(run(process.execPath, [join(copy, 'scripts/sync.mjs')], { cwd: copy }).code, 0);
    assert.match(readFileSync(victim, 'utf8'), /AGENTS\.md/, 'sync no restauró el puntero');
  });
});

test('todo archivo generado lleva la cabecera "no editar a mano"', () => {
  for (const g of spec.generated) {
    const t = readRoot(g);
    if (g.endsWith('.json')) {
      assert.match(t, /Tridente de Memoria/, `${g}: sin nota de procedencia`);
    } else {
      assert.ok(t.includes('tridente:header-start'), `${g}: sin cabecera de archivo generado`);
      assert.ok(t.includes('tridente:header-end'), `${g}: cabecera sin cerrar`);
    }
  }
});

test('todo archivo generado termina en un único salto de línea', () => {
  for (const g of spec.generated) {
    const raw = readFileSync(join(ROOT, g), 'utf8');
    assert.ok(raw.endsWith('\n'), `${g}: sin salto de línea final`);
    assert.ok(!raw.endsWith('\n\n'), `${g}: saltos de línea finales de más`);
  }
});

test('AGENTS.md contiene el orden de lectura correcto', () => {
  const t = readRoot('AGENTS.md');
  const positions = spec.readOrder.map((id) => t.indexOf(byId[id].filename));
  for (const p of positions) assert.ok(p > 0);
  const sorted = [...positions].sort((a, b) => a - b);
  assert.deepEqual(positions, sorted, 'el orden de lectura aparece desordenado en AGENTS.md');
});

test('AGENTS.md documenta los cuatro campos de la lección', () => {
  const t = readRoot('AGENTS.md');
  for (const f of spec.entries.lesson.fields) {
    assert.ok(t.includes(`**${f.key}:**`), `AGENTS.md no documenta el campo "${f.key}"`);
  }
});

test('AGENTS.md documenta los campos de la bitácora con las claves del spec', () => {
  const t = readRoot('AGENTS.md');
  for (const f of spec.entries.decision.fields) {
    assert.ok(t.includes(`**${f.key}:**`), `AGENTS.md no documenta el campo "${f.key}"`);
  }
});

test('AGENTS.md no contiene claves de campo en inglés (la deriva de la v1)', () => {
  const t = readRoot('AGENTS.md');
  for (const f of spec.entries.decision.fields) {
    assert.ok(!t.includes(`**${f.keyEn}:**`), `AGENTS.md mezcla la clave inglesa "${f.keyEn}"`);
  }
});

test('el frontmatter de SKILL.md es válido', () => {
  const t = readRoot('SKILL.md');
  const fm = t.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(fm, 'SKILL.md no tiene frontmatter');
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  assert.equal(name, spec.protocol.id);
  assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'name debe ser kebab-case');
  const desc = fm[1].match(/^description:\s*(.+)$/m)?.[1].trim();
  assert.ok(desc && desc.length >= 20 && desc.length <= 1024, `description de longitud inválida`);
  assert.ok(!desc.startsWith('>'), 'description debe ser una sola línea, no un bloque plegado');
});

test('SKILL.md indica un directorio de clonado que coincide con el name', () => {
  // Bug de la v1: `git clone <repo>` creaba tridente-de-memoria-skill/, que no
  // coincide con `name: tridente-de-memoria` y rompe la carga del skill.
  const t = readRoot('SKILL.md');
  const clone = t.match(/git clone \S+ (\S+)/);
  assert.ok(clone, 'SKILL.md no muestra un comando de clonado');
  assert.ok(clone[1].endsWith(spec.protocol.id), `el destino del clone (${clone[1]}) no termina en ${spec.protocol.id}`);
});

test('cada puntero de herramienta reenvía a AGENTS.md con ruta relativa válida', () => {
  for (const a of spec.adapters.filter((x) => x.kind !== 'native')) {
    const t = readRoot(a.path);
    assert.ok(t.includes('AGENTS.md'), `${a.path} no menciona AGENTS.md`);
    if (a.kind === 'json-context') continue;
    const depth = a.path.split('/').length - 1;
    const expected = depth ? '../'.repeat(depth) + 'AGENTS.md' : 'AGENTS.md';
    assert.ok(t.includes(`](${expected})`), `${a.path}: el enlace no es ${expected}`);
  }
});

test('los punteros son delgados: no reproducen el protocolo', () => {
  const keys = [...spec.entries.lesson.fields, ...spec.entries.decision.fields].map((f) => f.key);
  for (const a of spec.adapters.filter((x) => x.kind !== 'native')) {
    const t = readRoot(a.path);
    const restated = keys.filter((k) => t.includes(`**${k}:**`));
    assert.ok(restated.length < 3, `${a.path} duplica el protocolo (${restated.join(', ')})`);
    assert.ok(t.length < 3000, `${a.path} pesa ${t.length} caracteres; un puntero debe ser corto`);
  }
});

test('el puntero de Cursor lleva frontmatter con alwaysApply', () => {
  const t = readRoot('.cursor/rules/tridente.mdc');
  assert.match(t, /^---\n[\s\S]*alwaysApply:\s*true[\s\S]*?\n---/);
});

test('el puntero de Claude Code usa la sintaxis de import', () => {
  assert.match(readRoot('CLAUDE.md'), /^@AGENTS\.md$/m);
});

test('la configuración de Gemini CLI es JSON válido y apunta a AGENTS.md', () => {
  const cfg = JSON.parse(readRoot('.gemini/settings.json'));
  assert.ok(Array.isArray(cfg.contextFileName));
  assert.ok(cfg.contextFileName.includes('AGENTS.md'));
  assert.ok(cfg.contextFileName.includes(byId.dna.filename));
});

test('no existe GEMINI.md en la raíz: colisionaría con gemini.md', () => {
  assert.equal(existsRoot('GEMINI.md') && !existsRoot('gemini.md'), false);
});

test('las plantillas contienen todos sus tokens declarados', () => {
  for (const t of spec.init.tokens) {
    for (const fid of t.files) {
      const tpl = readRoot(`templates/${byId[fid].filename}`);
      assert.ok(tpl.includes(t.token), `${byId[fid].filename} no contiene ${t.token}`);
    }
  }
});

test('las plantillas no contienen tokens no declarados', () => {
  const declared = new Set(spec.init.tokens.map((t) => t.token));
  for (const f of spec.files) {
    const tpl = readRoot(`templates/${f.filename}`);
    for (const m of tpl.matchAll(/\{\{[A-Z_]+\}\}/g)) {
      assert.ok(declared.has(m[0]), `${f.filename}: token no declarado ${m[0]}`);
    }
  }
});

test('cada plantilla tiene todas sus secciones obligatorias', () => {
  for (const f of spec.files) {
    const tpl = readRoot(`templates/${f.filename}`);
    for (const s of f.sections.filter((x) => x.required)) {
      assert.ok(tpl.includes(`## ${s.emoji} ${s.heading}`), `${f.filename}: falta la sección "${s.heading}"`);
    }
  }
});

test('cada plantilla referencia a las otras dos (un solo organismo)', () => {
  for (const f of spec.files) {
    const tpl = readRoot(`templates/${f.filename}`);
    for (const other of spec.files) {
      if (other.id === f.id) continue;
      assert.ok(tpl.includes(other.filename), `${f.filename} no menciona ${other.filename}`);
    }
  }
});

test('la versión inglesa de AGENTS existe y tiene las mismas secciones H2', () => {
  const es = readRoot('AGENTS.md');
  const en = readRoot('docs/AGENTS.en.md');
  const nEs = (es.match(/^##\s/gm) || []).length;
  const nEn = (en.match(/^##\s/gm) || []).length;
  assert.equal(nEs, nEn, `ES tiene ${nEs} secciones y EN tiene ${nEn}`);
});

test('los README exponen bloques auto-sincronizados', () => {
  for (const f of ['README.md', 'README_EN.md']) {
    const n = (readRoot(f).match(/<!--\s*tridente:begin:/g) || []).length;
    assert.ok(n >= 3, `${f} sólo tiene ${n} bloque(s) sincronizado(s)`);
  }
});

test('todo bloque abierto en los README se cierra', () => {
  for (const f of ['README.md', 'README_EN.md']) {
    const t = readRoot(f);
    const opens = [...t.matchAll(/<!--\s*tridente:begin:([\w-]+)\s*-->/g)].map((m) => m[1]);
    const closes = [...t.matchAll(/<!--\s*tridente:end:([\w-]+)\s*-->/g)].map((m) => m[1]);
    assert.deepEqual(opens, closes, `${f}: marcadores descuadrados`);
  }
});

test('ningún documento usa el formato de fecha antiguo', () => {
  const files = [...spec.generated, 'README.md', 'README_EN.md', 'CHANGELOG.md', 'CONTRIBUTING.md'];
  for (const f of files) {
    if (!existsRoot(f)) continue;
    const t = readRoot(f).split(spec.dateFormat.rationale).join('');
    const hit = t.match(/\[DD\/MM\/(?:AAAA|YYYY)\]|dd\/MM\/yyyy|\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    assert.equal(hit, null, `${f} usa un formato de fecha antiguo: ${hit?.[0]}`);
  }
});

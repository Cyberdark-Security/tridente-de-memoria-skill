/**
 * Portabilidad entre versiones de intérprete.
 *
 * El objetivo es que el resultado no dependa de la versión de bash: macOS trae
 * /bin/bash 3.2 de fábrica y Ubuntu LTS trae 5.0/5.1, mientras que Git Bash y
 * las distribuciones recientes traen 5.2. Entre 5.1 y 5.2 cambió la semántica
 * del reemplazo en `${var//patrón/rep}` (`patsub_replacement`), y ahí es donde
 * un '&' en la respuesta del usuario corrompía el archivo generado.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { ROOT, spec, read, withTmpDir, withRepoCopy, run, listFiles } from './helpers.mjs';

const SH = join(ROOT, 'init-tridente.sh');

/**
 * Huella del contenido del árbol de trabajo. Se usa en vez de
 * `git status --porcelain` porque un archivo que ya figura como modificado
 * deja la salida de porcelain idéntica aunque su contenido cambie.
 */
function treeFingerprint() {
  const h = createHash('sha256');
  for (const rel of listFiles(ROOT).filter((p) => !p.startsWith('.git/') && !p.includes('node_modules/'))) {
    h.update(rel);
    h.update(readFileSync(join(ROOT, rel)));
  }
  return h.digest('hex');
}

/** ¿Soporta este bash la opción que cambia la semántica del reemplazo? */
const hasPatsub = run('bash', ['-c', 'shopt -q patsub_replacement; echo $?']).out.trim() !== '';

test('el script no usa el reemplazo de ${var//pat/rep} sobre datos del usuario', () => {
  // La sustitución se hace partiendo y concatenando, que se comporta igual en
  // todas las versiones de bash. Si alguien vuelve a introducir //pat/rep con
  // una variable de entrada, esta prueba lo caza.
  const code = readFileSync(SH, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  const risky = [...code.matchAll(/\$\{[A-Za-z_][A-Za-z0-9_]*\/\/[^}]*\}/g)].map((m) => m[0]);
  assert.deepEqual(risky, [], `reemplazo dependiente de la versión de bash: ${risky.join(', ')}`);
});

test('la sustitución da el mismo resultado con patsub_replacement activo e inactivo', (t) => {
  if (!hasPatsub) {
    t.skip('este bash no soporta patsub_replacement; no hay nada que comparar');
    return;
  }
  const hostile = 'pagos & cobros C:\\a\\b \\& 100% $HOME `id` "x"';
  const results = [];
  for (const shopt of ['-s', '-u']) {
    withTmpDir((dir) => {
      // BASH_ENV se ejecuta al arrancar un bash no interactivo, así que el
      // script corre con la semántica de reemplazo forzada en cada sentido.
      const envFile = join(dir, 'force.sh');
      writeFileSync(envFile, `shopt ${shopt} patsub_replacement 2>/dev/null || true\n`);
      const out = join(dir, 'out');
      const r = run('bash', [SH, '--dir', out, '-n', 'demo', '-g', hostile,
        '-s', 'Go', '-r', 'Sin ORM', '-m', 'MVP', '--yes', '--quiet', '--no-color'],
        { env: { ...process.env, BASH_ENV: envFile } });
      assert.equal(r.code, 0, r.out);
      results.push(read(join(out, spec.files.find((f) => f.id === 'dna').filename)));
    });
  }
  assert.equal(results[0], results[1], 'el resultado cambia según la versión de bash');
  assert.ok(results[0].includes(hostile), 'la respuesta del usuario se alteró al insertarse');
});

test('el script no usa construcciones posteriores a bash 3.2', () => {
  // macOS trae /bin/bash 3.2.57 y el shebang es `#!/usr/bin/env bash`.
  const code = readFileSync(SH, 'utf8')
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  const modern = [
    [/\bdeclare\s+-A\b/, 'arrays asociativos (bash 4+)'],
    [/\bmapfile\b|\breadarray\b/, 'mapfile/readarray (bash 4+)'],
    [/\$\{[A-Za-z_][A-Za-z0-9_]*\^\^\}|\$\{[A-Za-z_][A-Za-z0-9_]*,,\}/, 'cambio de caja ${v^^}/${v,,} (bash 4+)'],
    [/\becho\s+-e\b/, 'echo -e (no portable)'],
    [/\[\[\s+-v\s/, '[[ -v var ]] (bash 4.2+)'],
  ];
  const found = modern.filter(([re]) => re.test(code)).map(([, name]) => name);
  assert.deepEqual(found, [], `construcciones no disponibles en bash 3.2: ${found.join(', ')}`);
});

test('el manifiesto de bash sólo contiene asignaciones, sin lógica', () => {
  // Se carga con `source`: cualquier cosa ejecutable ahí sería sorpresa.
  const lines = readFileSync(join(ROOT, 'protocol/manifest.sh'), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  for (const l of lines) {
    assert.match(l, /^[A-Z_][A-Z0-9_]*=/, `línea ejecutable en un manifiesto de datos: ${l}`);
  }
});

test('el manifiesto de PowerShell sólo contiene asignaciones, sin lógica', () => {
  const text = readFileSync(join(ROOT, 'protocol/manifest.ps1'), 'utf8');
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  // Se permiten las continuaciones de los literales de tabla hash y de array.
  for (const l of lines) {
    const ok =
      /^\$\w+\s*=/.test(l) || // asignación
      /^'[^']+'\s*=\s*'[^']*'$/.test(l) || // par clave = valor
      (l.startsWith('@{') && l.endsWith('}')) || // elemento @{ ... } de un array
      l === '}' ||
      l === ')';
    assert.ok(ok, `línea ejecutable en un manifiesto de datos: ${l}`);
  }
});

test('el validador es determinista: dos ejecuciones dan el mismo puntaje', () => {
  const a = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--json', '--min', '0']).out);
  const b = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--json', '--min', '0']).out);
  assert.equal(a.score, b.score);
});

test('el validador no modifica el repositorio al auditarlo', () => {
  // `git status --porcelain` NO basta: si un archivo ya figura como modificado,
  // cambiar su contenido deja la salida idéntica. Hay que comparar el contenido.
  const before = treeFingerprint();
  run(process.execPath, ['scripts/validate.mjs', '--min', '0']);
  assert.equal(treeFingerprint(), before, 'auditar cambió archivos del árbol de trabajo');
});

test('sync --check no escribe nada', () => {
  const before = treeFingerprint();
  run(process.execPath, ['scripts/sync.mjs', '--check']);
  assert.equal(treeFingerprint(), before);
});

test('ningún archivo de la suite deja rastro en el repositorio', () => {
  // Node ejecuta los archivos de prueba en procesos paralelos: una prueba que
  // rompe el README real hace fallar a `sync --check` en OTRO proceso de forma
  // intermitente. Todo lo que muta debe hacerlo sobre una copia.
  //
  // Se recorren todos los archivos de la suite menos éste, para no recursar.
  const self = 'portability.test.mjs';
  const suite = listFiles(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.mjs') && f !== self);
  assert.ok(suite.length >= 2, 'no encontré los archivos de la suite');
  for (const f of suite) {
    const before = treeFingerprint();
    run(process.execPath, ['--test', `tests/${f}`]);
    assert.equal(treeFingerprint(), before, `tests/${f} escribió en el árbol real`);
  }
});

test('el generador detecta un bloque obligatorio borrado a mano', () => {
  // Regresión: borrar el par de marcadores desactivaba la anti-deriva y
  // `sync --check` seguía en verde mientras la tabla mentía.
  withRepoCopy((copy) => {
    const readme = join(copy, 'README.md');
    const id = spec.injectedBlocks['README.md'][0];
    writeFileSync(
      readme,
      readFileSync(readme, 'utf8')
        .replace(`<!-- tridente:begin:${id} -->`, '')
        .replace(`<!-- tridente:end:${id} -->`, ''),
    );
    const r = run(process.execPath, [join(copy, 'scripts/sync.mjs'), '--check'], { cwd: copy });
    assert.notEqual(r.code, 0, 'sync --check no detectó el bloque ausente');
    assert.match(r.out, new RegExp(id));
  });
});

test('el generador detecta un huérfano en templates/', () => {
  withRepoCopy((copy) => {
    writeFileSync(join(copy, 'templates', 'huerfano-de-prueba.md'), '# no declarado en el spec\n');
    const r = run(process.execPath, [join(copy, 'scripts/sync.mjs'), '--check'], { cwd: copy });
    assert.notEqual(r.code, 0, 'sync --check no detectó el huérfano');
    assert.match(r.out, /huerfano-de-prueba/);
  });
});

test('el generador detecta un artefacto generado que ya nadie declara', () => {
  // Quitar una herramienta del spec dejaba su puntero huérfano en el disco:
  // un archivo que ningún script copia y que la documentación no menciona.
  withRepoCopy((copy) => {
    const specPath = join(copy, 'protocol/tridente.spec.json');
    const s = JSON.parse(readFileSync(specPath, 'utf8'));
    s.adapters = s.adapters.filter((a) => a.path !== '.windsurfrules');
    s.generated = s.generated.filter((g) => g !== '.windsurfrules');
    writeFileSync(specPath, JSON.stringify(s, null, 2) + '\n');

    run(process.execPath, [join(copy, 'scripts/sync.mjs')], { cwd: copy });
    const r = run(process.execPath, [join(copy, 'scripts/sync.mjs'), '--check'], { cwd: copy });
    assert.notEqual(r.code, 0, 'sync --check no vio el puntero fantasma');
    assert.match(r.out, /windsurfrules/);
  });
});

test('los pesos de las categorías suman 100 en los dos modos', () => {
  // El puntaje se normaliza por peso: si los pesos no suman 100, el reparto
  // entre categorías deja de ser el declarado sin que nadie se entere.
  for (const args of [['--json', '--min', '0'], ['--project', ROOT, '--json', '--min', '0']]) {
    const r = JSON.parse(run(process.execPath, ['scripts/validate.mjs', ...args]).out);
    const total = r.categories.reduce((a, c) => a + c.weight, 0);
    assert.equal(total, 100, `${r.mode}: los pesos suman ${total}`);
  }
});

test('modo proyecto: sale 0 con la estructura íntegra y 1 con --strict', () => {
  withTmpDir((dir) => {
    run('bash', [SH, '--dir', dir, '-g', 'Objetivo', '-s', 'Go', '-r', 'R', '-m', 'M',
      '--yes', '--quiet', '--no-color']);

    const soft = run(process.execPath, ['scripts/validate.mjs', '--project', dir]);
    assert.equal(soft.code, 0, 'un Tridente recién creado no debería fallar el diagnóstico');

    const strict = run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--strict']);
    assert.equal(strict.code, 1, '--strict debe aplicar el umbral');

    const report = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
    assert.equal(report.gate, 'structural');
    assert.ok(report.score < 100, 'el ADN a medio llenar debe seguir bajando el puntaje');
  });
});

test('modo proyecto: un Tridente roto sí falla, con o sin --strict', () => {
  withTmpDir((dir) => {
    run('bash', [SH, '--dir', dir, '-g', 'Objetivo', '-s', 'Go', '-r', 'R', '-m', 'M',
      '--yes', '--quiet', '--no-color']);
    rmSync(join(dir, spec.files[0].filename));
    const r = run(process.execPath, ['scripts/validate.mjs', '--project', dir]);
    assert.equal(r.code, 1, 'falta un archivo maestro y aun así aprobó');
  });
});

test('el CI no baja el umbral para poder usar su propia herramienta', () => {
  // Si el CI necesita --min para que validate --project pase, el default
  // está mal puesto.
  const ci = readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8');
  const cheats = [...ci.matchAll(/validate\.mjs[^\n]*--min\s+(\d+)/g)].map((m) => m[0]);
  assert.deepEqual(
    cheats.filter((c) => c.includes('--project')),
    [],
    `el CI relaja el umbral en modo proyecto: ${cheats.join(' · ')}`,
  );
});

// ------------------------------------------------- el medidor de contenido

/** Escribe un Tridente sintético con `fill` bajo cada sección obligatoria. */
function writeTrident(dir, fill) {
  for (const f of spec.files) {
    const body = f.sections
      .filter((s) => s.required)
      .map((s) => `## ${s.emoji} ${s.heading}\n\n${fill}`)
      .join('\n\n');
    const others = spec.files.filter((o) => o.id !== f.id).map((o) => o.filename).join(' ');
    writeFileSync(join(dir, f.filename), `# ${f.role}\n\n${others}\n\n${body}\n`);
  }
  writeFileSync(join(dir, 'AGENTS.md'), '');
}

const projectScore = (dir) =>
  JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out).score;

test('el relleno sin significado puntúa por debajo de un Tridente honesto', () => {
  // "xxx" y "???" son baratos de escribir y no son respuestas. Si puntúan igual
  // que el contenido real, la métrica premia teclear cualquier cosa.
  withTmpDir((honest) =>
    withTmpDir((x) =>
      withTmpDir((q) => {
        run('bash', [SH, '--dir', honest, '-g', 'Objetivo', '-s', 'Go', '-r', 'Sin ORM',
          '-m', 'MVP', '--yes', '--quiet', '--no-color']);
        writeTrident(x, 'xxx');
        writeTrident(q, '???');

        const sHonest = projectScore(honest);
        for (const [label, dir] of [['xxx', x], ['???', q]]) {
          assert.ok(
            projectScore(dir) < sHonest,
            `"${label}" puntúa ${projectScore(dir)} y el honesto ${sHonest}`,
          );
        }
      }),
    ),
  );
});

test('el contenido real puntúa por encima del honesto a medio rellenar', () => {
  withTmpDir((honest) =>
    withTmpDir((real) => {
      run('bash', [SH, '--dir', honest, '-g', 'Objetivo', '-s', 'Go', '-r', 'Sin ORM',
        '-m', 'MVP', '--yes', '--quiet', '--no-color']);
      writeTrident(real, 'Clean Architecture con Vitest y cobertura mínima del 80 por ciento.');
      assert.ok(
        projectScore(real) > projectScore(honest),
        'rellenar el ADN debe subir el puntaje',
      );
    }),
  );
});

test('una sección escrita con corchetes legítimos no cuenta como vacía', () => {
  // `[Vitest]`, `[ADR-004]` o `[RFC 7231]` son documentación técnica normal:
  // borrar todo `[...]` castigaba a quien escribe bien.
  withTmpDir((dir) => {
    const dna = spec.files.find((f) => f.id === 'dna');
    const section = dna.sections.find((s) => s.required);
    writeTrident(dir, 'placeholder inicial');
    const p = join(dir, dna.filename);
    writeFileSync(
      p,
      read(p).replace(
        `## ${section.emoji} ${section.heading}\n\nplaceholder inicial`,
        `## ${section.emoji} ${section.heading}\n\n- **Patrón:** [Clean Architecture]\n- **Tests:** [Vitest]`,
      ),
    );
    const report = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
    const c = report.categories.flatMap((x) => x.checks).find((x) => x.id === 'filled.dna');
    assert.ok(!/sin contenido real/.test(c.detail ?? ''), `marcó como vacía una sección llena: ${c.detail}`);
  });
});

test('sync detecta un marcador inventado en cualquier .md escrito a mano', () => {
  withRepoCopy((copy) => {
    const victim = join(copy, 'CONTRIBUTING.md');
    writeFileSync(
      victim,
      readFileSync(victim, 'utf8') +
        '\n<!-- tridente:begin:zzz-inventado -->\nprosa fuera de todo control\n<!-- tridente:end:zzz-inventado -->\n',
    );
    const r = run(process.execPath, [join(copy, 'scripts/sync.mjs'), '--check'], { cwd: copy });
    assert.notEqual(r.code, 0, 'un id inventado sería una zona franca sin vigilancia');
    assert.match(r.out, /zzz-inventado/);
  });
});

test('un archivo maestro sin plantilla falla con un mensaje claro, no con un stack trace', () => {
  withRepoCopy((copy) => {
    const specPath = join(copy, 'protocol/tridente.spec.json');
    const s = JSON.parse(readFileSync(specPath, 'utf8'));
    s.files.push({
      id: 'glossary', filename: 'glosario.md', aliases: [], emoji: '📖',
      role: 'El Léxico', roleEn: 'The Lexicon', index: 4,
      purpose: 'Términos del dominio.', purposeEn: 'Domain terms.',
      extract: 'Términos', extractEn: 'Terms',
      sections: [{ heading: 'Términos', headingEn: 'Terms', emoji: '📖', required: true }],
    });
    s.readOrder.push('glossary');
    s.writeOrder.push('glossary');
    writeFileSync(specPath, JSON.stringify(s, null, 2) + '\n');

    const r = run(process.execPath, [join(copy, 'scripts/sync.mjs')], { cwd: copy });
    assert.equal(r.code, 2, 'debería salir con código de error de uso');
    assert.match(r.out, /No hay cuerpo de plantilla/);
    assert.ok(!/TypeError|at Object\./.test(r.out), `volcó un stack trace:\n${r.out}`);
  });
});

test('ningún marcador que emita el generador sobrevive al medidor de contenido', () => {
  // El fallo simétrico: la lista de marcadores del validador era una segunda
  // fuente de verdad y se desincronizó de los hints del spec, de modo que una
  // entrada pegada literalmente desde AGENTS.md contaba como sección rellena.
  const report = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--json', '--min', '0']).out);
  const c = report.categories.flatMap((x) => x.checks).find((x) => x.id === 'ssot.placeholders');
  assert.ok(c, 'falta la comprobación ssot.placeholders');
  assert.equal(c.ok, true, c.detail);
});

test('una entrada pegada tal cual desde AGENTS.md no cuenta como rellena', () => {
  withTmpDir((dir) => {
    run('bash', [SH, '--dir', dir, '-g', 'Objetivo', '-s', 'Go', '-r', 'Sin ORM',
      '-m', 'MVP', '--yes', '--quiet', '--no-color']);

    // Se copia el bloque de ejemplo de AGENTS.md sin editar un solo campo.
    const lessons = spec.files.find((f) => f.id === 'lessons');
    const entry = spec.entries.lesson;
    const block = [
      entry.headingTemplate.replace('{date}', '2026-09-17').replace('{title}', '[Título]'),
      ...entry.fields.map((f) => `- **${f.key}:** [${f.hint.replace(/\{dna\}/g, spec.files[0].filename)}]`),
    ].join('\n');

    const p = join(dir, lessons.filename);
    writeFileSync(p, read(p).replace(/### \d{4}-\d{2}-\d{2}[\s\S]*$/, `${block}\n`));

    const report = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
    const c = report.categories.flatMap((x) => x.checks).find((x) => x.id === 'filled.lessons');
    assert.equal(c.ok, false, 'una plantilla sin editar se dio por rellena');
  });
});

test('el detector de relleno no castiga contenido legítimo corto', () => {
  // Identificadores con letras no consecutivas, versiones, años y escrituras
  // sin espacios: los tres casos que un umbral latino-céntrico rompía.
  withTmpDir((base) => {
    for (const [label, fill] of [
      ['identificador', 'k8s + i18n'],
      ['version', '1.0.0'],
      ['año', '2026'],
      ['cjk', '支付系统'],
    ]) {
      const dir = join(base, label);
      mkdirSync(dir, { recursive: true });
      writeTrident(dir, fill);
      const report = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
      const content = report.categories.find((c) => c.name.startsWith('Contenido'));
      assert.equal(content.pct, 100, `"${fill}" se marcó como relleno: ${content.checks.find((k) => !k.ok)?.detail}`);
    }
  });
});

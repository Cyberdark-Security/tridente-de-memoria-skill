/**
 * Los scripts de inicialización: comportamiento, seguridad y paridad entre
 * Bash y PowerShell. La paridad es un requisito del proyecto: un usuario de
 * Windows y uno de Linux deben acabar con archivos idénticos.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, spec, read, withTmpDir, run, findPowerShell, listFiles, ANSWERS } from './helpers.mjs';

const SH = join(ROOT, 'init-tridente.sh');
const PS = join(ROOT, 'init-tridente.ps1');
const MASTERS = spec.files.map((f) => f.filename);

const shArgs = (dir, extra = []) => [
  SH, '--dir', dir, '--name', ANSWERS.name,
  '-g', ANSWERS.goal, '-s', ANSWERS.stack, '-r', ANSWERS.rules, '-m', ANSWERS.milestone,
  '--yes', '--quiet', '--no-color', ...extra,
];

const psArgs = (dir, extra = []) => [
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS,
  '-Dir', dir, '-Name', ANSWERS.name,
  '-Goal', ANSWERS.goal, '-Stack', ANSWERS.stack, '-Rules', ANSWERS.rules, '-Milestone', ANSWERS.milestone,
  '-Yes', '-Quiet', '-NoColor', ...extra,
];

// ------------------------------------------------------------------ Bash

test('init-tridente.sh: --help sale 0 y documenta el uso', () => {
  const r = run('bash', [SH, '--help']);
  assert.equal(r.code, 0);
  assert.match(r.out, /USO/);
  assert.match(r.out, /--adapters/);
});

test('init-tridente.sh: --version imprime la versión', () => {
  const r = run('bash', [SH, '--version']);
  assert.equal(r.code, 0);
  assert.match(r.out.trim(), /^\d+\.\d+\.\d+$/);
});

test('init-tridente.sh: una opción desconocida falla con código 2', () => {
  const r = run('bash', [SH, '--no-existe']);
  assert.equal(r.code, 2);
});

test('init-tridente.sh: sintaxis válida (bash -n)', () => {
  assert.equal(run('bash', ['-n', SH]).code, 0);
});

test('init-tridente.sh: genera los tres archivos maestros', () => {
  withTmpDir((dir) => {
    const r = run('bash', shArgs(dir));
    assert.equal(r.code, 0, r.out);
    for (const f of MASTERS) assert.ok(existsSync(join(dir, f)), `falta ${f}`);
  });
});

test('init-tridente.sh: no deja ningún token sin sustituir', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    for (const f of MASTERS) {
      assert.equal(read(join(dir, f)).match(/\{\{[A-Z_]+\}\}/), null, `${f} conserva tokens`);
    }
  });
});

test('init-tridente.sh: inserta las respuestas de forma literal', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    const dna = read(join(dir, 'gemini.md'));
    // Ampersands, comillas, $, backticks y barras invertidas deben sobrevivir
    // intactos. El '&' era un bug real: en bash 5.2 se expandía al patrón.
    assert.ok(dna.includes(ANSWERS.goal), 'el objetivo se alteró al insertarse');
    assert.ok(dna.includes(ANSWERS.rules), 'la regla se alteró al insertarse');
    assert.ok(!dna.includes('{{GOAL}}'), 'el & se expandió al patrón coincidente');
  });
});

test('init-tridente.sh: escribe la fecha de hoy en ISO 8601', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    const d = new Date();
    const today = [d.getFullYear(), d.getMonth() + 1, d.getDate()]
      .map((n, i) => (i ? String(n).padStart(2, '0') : n))
      .join('-');
    const plan = read(join(dir, 'plan_maestro.md'));
    assert.ok(plan.includes(today), `la bitácora no lleva la fecha ${today}`);
    assert.match(plan, new RegExp(`^###\\s+${today}`, 'm'));
  });
});

test('init-tridente.sh: retira la cabecera de archivo generado', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    for (const f of MASTERS) {
      const t = read(join(dir, f));
      assert.ok(!t.includes('tridente:header'), `${f} arrastra la cabecera del generador`);
      assert.ok(!t.includes('sync.mjs'), `${f} menciona un script que el usuario no tiene`);
      assert.ok(t.startsWith('# '), `${f} no empieza por su título`);
    }
  });
});

test('init-tridente.sh: --adapters all copia todos los punteros', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir, ['--adapters', 'all']));
    for (const a of spec.adapters.filter((x) => x.kind !== 'native')) {
      assert.ok(existsSync(join(dir, a.path)), `falta el puntero ${a.path}`);
    }
    assert.ok(existsSync(join(dir, 'AGENTS.md')));
  });
});

test('init-tridente.sh: --adapters none no crea punteros', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir, ['--adapters', 'none']));
    assert.ok(!existsSync(join(dir, 'AGENTS.md')));
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
    for (const f of MASTERS) assert.ok(existsSync(join(dir, f)));
  });
});

test('init-tridente.sh: --adapters con lista copia sólo lo pedido (más AGENTS.md)', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir, ['--adapters', 'claude,cursor']));
    assert.ok(existsSync(join(dir, 'AGENTS.md')), 'AGENTS.md es la fuente: siempre se copia');
    assert.ok(existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(existsSync(join(dir, '.cursor/rules/tridente.mdc')));
    assert.ok(!existsSync(join(dir, '.windsurfrules')), 'copió un adaptador no pedido');
  });
});

test('init-tridente.sh: sin --yes y sin terminal, aborta en vez de sobrescribir', () => {
  withTmpDir((dir) => {
    writeFileSync(join(dir, 'gemini.md'), '# contenido previo del usuario\n');
    const r = run('bash', [
      SH, '--dir', dir, '-g', 'x', '-s', 'y', '-r', 'z', '-m', 'w', '--no-color',
    ]);
    assert.notEqual(r.code, 0, 'debería haber abortado');
    assert.match(read(join(dir, 'gemini.md')), /contenido previo/, 'sobrescribió sin permiso');
  });
});

test('init-tridente.sh: respeta un puntero preexistente aunque copie el resto', () => {
  withTmpDir((dir) => {
    writeFileSync(join(dir, 'CLAUDE.md'), '# mis instrucciones\n');
    run('bash', [
      SH, '--dir', dir, '-g', 'x', '-s', 'y', '-r', 'z', '-m', 'w', '--quiet', '--no-color',
    ]);
    assert.match(read(join(dir, 'CLAUDE.md')), /mis instrucciones/, 'pisó un archivo del usuario');
    assert.ok(existsSync(join(dir, 'AGENTS.md')));
  });
});

test('init-tridente.sh: escribe sólo dentro del directorio de destino', () => {
  withTmpDir((outer) => {
    const target = join(outer, 'proyecto');
    mkdirSync(target);
    writeFileSync(join(outer, 'centinela.txt'), 'intacto\n');
    run('bash', shArgs(target));
    assert.equal(read(join(outer, 'centinela.txt')), 'intacto\n');
    const escaped = listFiles(outer).filter((p) => !p.startsWith('proyecto/') && p !== 'centinela.txt');
    assert.deepEqual(escaped, [], 'escribió fuera del destino');
  });
});

test('init-tridente.sh: crea el directorio de destino si no existe', () => {
  withTmpDir((dir) => {
    const target = join(dir, 'nuevo', 'anidado');
    const r = run('bash', shArgs(target));
    assert.equal(r.code, 0, r.out);
    assert.ok(existsSync(join(target, 'gemini.md')));
  });
});

test('init-tridente.sh: usa el nombre del directorio si no se pasa --name', () => {
  withTmpDir((dir) => {
    const target = join(dir, 'mi-proyecto-xyz');
    run('bash', [SH, '--dir', target, '-g', 'x', '-s', 'y', '-r', 'z', '-m', 'w', '--yes', '--quiet']);
    assert.match(read(join(target, 'gemini.md')), /mi-proyecto-xyz/);
  });
});

test('init-tridente.sh: el Tridente recién creado es estructuralmente perfecto', () => {
  // Presencia, estructura y formato deben salir al 100 % nada más inicializar.
  // El contenido no: el ADN queda a medio llenar a propósito (arquitectura,
  // visión, capas del stack), y el validador debe decirlo en vez de aprobarlo.
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    const r = run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']);
    const report = JSON.parse(r.out);
    const pct = Object.fromEntries(report.categories.map((c) => [c.name, c.pct]));

    assert.equal(pct['Presencia del Tridente'], 100, 'faltan archivos maestros');
    assert.equal(pct['Estructura de secciones'], 100, 'faltan secciones obligatorias');
    assert.equal(pct['Formato y sincronía'], 100, 'fechas, campos o enlaces cruzados mal');
    assert.equal(report.gate, 'structural');
    assert.equal(report.passed, true, 'un Tridente recién creado no debería fallar el diagnóstico');
    // El puntaje inicial no se fija a un número alto a propósito: el medidor de
    // contenido es estricto y el ADN recién creado tiene huecos reales.
    assert.ok(report.score >= 80, `puntaje inicial demasiado bajo: ${report.score}`);
  });
});

test('un Tridente hueco puntúa PEOR que uno recién inicializado', () => {
  // La trampa que hay que evitar: si la métrica sólo cuenta marcadores sin
  // rellenar, borrar las preguntas de la plantilla sube la nota. La métrica
  // pagaría por vaciar el archivo en vez de por responderlo.
  withTmpDir((honest) =>
    withTmpDir((hollow) => {
      run('bash', shArgs(honest));

      // Mismo esqueleto, con las secciones obligatorias vacías.
      for (const f of spec.files) {
        const headings = f.sections
          .filter((s) => s.required)
          .map((s) => `## ${s.emoji} ${s.heading}\n`)
          .join('\n');
        const others = spec.files.filter((o) => o.id !== f.id).map((o) => o.filename).join(' ');
        writeFileSync(join(hollow, f.filename), `# ${f.role}: hueco\n\n${others}\n\n${headings}`);
      }
      writeFileSync(join(hollow, 'AGENTS.md'), '');

      const score = (dir) =>
        JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out).score;

      const sHonest = score(honest);
      const sHollow = score(hollow);
      assert.ok(
        sHollow < sHonest,
        `el hueco puntúa ${sHollow} y el honesto ${sHonest}: la métrica premia vaciar el archivo`,
      );
    }),
  );
});

test('una fecha con forma válida pero inexistente se rechaza', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    const plan = join(dir, byIdLocal('plan').filename);
    writeFileSync(plan, read(plan).replace(/^### \d{4}-\d{2}-\d{2}/m, '### 2026-13-45'));
    const report = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
    const fmt = report.categories.flatMap((c) => c.checks).find((c) => c.id === 'fmt.date');
    assert.equal(fmt.ok, false, '2026-13-45 tiene la forma correcta pero no existe');
    assert.match(fmt.detail, /inexistente/);
  });
});

function byIdLocal(id) {
  return spec.files.find((f) => f.id === id);
}

test('el validador detecta un Tridente a medio llenar y no lo aprueba', () => {
  // El puntaje es un indicador de progreso: llegar a 100 es rellenar el ADN.
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    const before = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
    assert.ok(before.score < 100, 'un ADN con marcadores sin rellenar no debería puntuar 100');

    // Rellenamos el ADN como lo haría una persona y el puntaje debe subir.
    const dnaPath = join(dir, 'gemini.md');
    const filled = readFileSync(dnaPath, 'utf8').replace(/\[(Ej:|¿|Descripción|Tarea futura)[^\]]*\]/g, 'definido');
    writeFileSync(dnaPath, filled);
    const after = JSON.parse(run(process.execPath, ['scripts/validate.mjs', '--project', dir, '--json']).out);
    assert.ok(after.score > before.score, `el puntaje no subió al rellenar (${before.score} → ${after.score})`);
  });
});

// ---------------------------------------------------------------- Encoding

test('init-tridente.ps1 lleva BOM UTF-8 (sin él, PowerShell 5.1 no lo parsea)', () => {
  const b = readFileSync(PS);
  assert.deepEqual([b[0], b[1], b[2]], [0xef, 0xbb, 0xbf]);
});

test('init-tridente.ps1 no usa utf8NoBOM, que no existe en PowerShell 5.1', () => {
  assert.equal(readFileSync(PS, 'utf8').includes('-Encoding utf8NoBOM'), false);
});

test('init-tridente.sh no lleva BOM, tiene shebang y usa LF', () => {
  const raw = readFileSync(SH, 'utf8');
  assert.notEqual(raw.charCodeAt(0), 0xfeff, 'BOM en un script de shell');
  assert.ok(raw.startsWith('#!'), 'sin shebang');
  assert.equal(raw.includes('\r\n'), false, 'CRLF rompe el shebang en Unix');
});

test('los scripts leen templates/ en vez de incrustar las plantillas', () => {
  const headings = spec.files.flatMap((f) => f.sections.map((s) => `## ${s.heading}`));
  for (const p of [SH, PS]) {
    const t = readFileSync(p, 'utf8');
    assert.ok(t.includes('templates'), `${p} no lee templates/`);
    for (const h of headings) {
      assert.equal(t.includes(h), false, `${p} incrusta la sección "${h}" en vez de leerla`);
    }
  }
});

/** Pares (clave, ruta) que el spec espera en los manifiestos generados. */
function expectedAdapterPairs() {
  const seen = new Set();
  const out = [];
  for (const a of spec.adapters) {
    if (a.kind === 'native' && a.path !== 'AGENTS.md') continue;
    if (seen.has(a.path)) continue;
    seen.add(a.path);
    out.push([a.key, a.path]);
  }
  return out;
}

test('el manifiesto de bash refleja exactamente spec.adapters', () => {
  const sh = readFileSync(join(ROOT, 'protocol/manifest.sh'), 'utf8');
  const keys = (sh.match(/TRIDENTE_ADAPTER_KEYS=\(([^)]*)\)/)?.[1].match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
  const paths = (sh.match(/TRIDENTE_ADAPTER_PATHS=\(([^)]*)\)/)?.[1].match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
  assert.equal(keys.length, paths.length, 'arrays paralelos de distinta longitud: el mapeo clave→ruta se desplazaría');
  assert.deepEqual(keys.map((k, i) => [k, paths[i]]), expectedAdapterPairs());
});

test('el manifiesto de PowerShell refleja exactamente spec.adapters', () => {
  const ps = readFileSync(join(ROOT, 'protocol/manifest.ps1'), 'utf8');
  const block = ps.match(/\$TridenteAdapters = \[ordered\]@\{([\s\S]*?)\n\}/)?.[1] ?? '';
  const pairs = [...block.matchAll(/'([^']+)'\s*=\s*'([^']+)'/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(pairs, expectedAdapterPairs());
});

test('ambos manifiestos declaran los mismos archivos maestros que el spec', () => {
  const want = spec.files.map((f) => f.filename);
  const sh = readFileSync(join(ROOT, 'protocol/manifest.sh'), 'utf8');
  const shMasters = (sh.match(/TRIDENTE_MASTERS=\(([^)]*)\)/)?.[1].match(/"([^"]*)"/g) ?? []).map((x) => x.slice(1, -1));
  assert.deepEqual(shMasters, want);
  const ps = readFileSync(join(ROOT, 'protocol/manifest.ps1'), 'utf8');
  const psMasters = (ps.match(/\$TridenteMasters = @\(([^)]*)\)/)?.[1].match(/'([^']*)'/g) ?? []).map((x) => x.slice(1, -1));
  assert.deepEqual(psMasters, want);
});

test('ningún script incrusta nombres ni roles del protocolo', () => {
  // Tras un renombrado en el spec, un nombre escrito a mano mentiría en el
  // resumen final mientras el script crea un archivo distinto.
  for (const p of [SH, PS]) {
    const code = readFileSync(p, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    for (const f of spec.files) {
      assert.equal(code.includes(f.filename), false, `${p} incrusta ${f.filename}`);
      assert.equal(
        code.includes(`"${f.role}"`) || code.includes(`'${f.role}'`),
        false,
        `${p} incrusta el rol "${f.role}"`,
      );
    }
  }
});

test('el AGENTS.md que se instala no cita rutas del repositorio del skill', () => {
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    const t = read(join(dir, 'AGENTS.md')).replace(/<!--[\s\S]*?-->/g, '');
    for (const needle of ['scripts/', 'templates/', 'protocol/', 'docs/AGENTS', 'sync.mjs', 'validate.mjs']) {
      assert.equal(t.includes(needle), false, `AGENTS.md instalado menciona "${needle}", que allí no existe`);
    }
  });
});

test('los archivos maestros generados terminan en salto de línea', () => {
  // Regresión: `$(...)` recorta los saltos finales y rompía la paridad.
  withTmpDir((dir) => {
    run('bash', shArgs(dir));
    for (const f of MASTERS) {
      const raw = readFileSync(join(dir, f), 'utf8');
      assert.ok(raw.endsWith('\n'), `${f} no termina en salto de línea`);
    }
  });
});

test('--adapters con una clave desconocida falla con código 2', () => {
  withTmpDir((dir) => {
    const r = run('bash', shArgs(dir, ['--adapters', 'cursorr']));
    assert.equal(r.code, 2, 'un typo debe fallar, no dejar el proyecto sin el puntero pedido');
  });
});

test('--dir sin valor falla con código 2, igual que una opción desconocida', () => {
  const r = run('bash', [SH, '--dir']);
  assert.equal(r.code, 2);
});

test('--yes guarda copia .bak de lo que sobrescribe', () => {
  withTmpDir((dir) => {
    writeFileSync(join(dir, 'CLAUDE.md'), '# mis instrucciones\n');
    run('bash', shArgs(dir));
    assert.ok(existsSync(join(dir, 'CLAUDE.md.bak')), 'no guardó copia de seguridad');
    assert.match(read(join(dir, 'CLAUDE.md.bak')), /mis instrucciones/);
  });
});

test('--yes fusiona .gemini/settings.json en vez de destruirlo', () => {
  withTmpDir((dir) => {
    mkdirSync(join(dir, '.gemini'), { recursive: true });
    writeFileSync(
      join(dir, '.gemini/settings.json'),
      JSON.stringify({ theme: 'GitHub', mcpServers: { mio: { command: 'node' } } }, null, 2),
    );
    run('bash', shArgs(dir));
    const cfg = JSON.parse(read(join(dir, '.gemini/settings.json')));
    assert.equal(cfg.theme, 'GitHub', 'perdió la configuración del usuario');
    assert.ok(cfg.mcpServers?.mio, 'perdió los mcpServers del usuario');
    assert.ok(cfg.context.fileName.includes('AGENTS.md'), 'no añadió el contexto del Tridente');
  });
});

// ------------------------------------------------------------ PowerShell

const pwsh = findPowerShell();
const psTest = pwsh ? test : test.skip;

psTest('init-tridente.ps1: el parser de PowerShell lo acepta', () => {
  const script =
    `$e=$null;[void][System.Management.Automation.Language.Parser]::ParseFile('${PS.replace(/'/g, "''")}',[ref]$null,[ref]$e);` +
    `if($e -and $e.Count){$e|ForEach-Object{$_.Message};exit 1}`;
  const r = run(pwsh, ['-NoProfile', '-Command', script]);
  assert.equal(r.code, 0, r.out);
});

psTest('init-tridente.ps1: -Version imprime la versión', () => {
  const r = run(pwsh, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, '-Version']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out.trim(), /^\d+\.\d+\.\d+$/);
});

psTest('init-tridente.ps1: genera los tres archivos maestros', () => {
  withTmpDir((dir) => {
    const r = run(pwsh, psArgs(dir));
    assert.equal(r.code, 0, r.out);
    for (const f of MASTERS) assert.ok(existsSync(join(dir, f)), `falta ${f}`);
  });
});

psTest('init-tridente.ps1: escribe UTF-8 sin BOM', () => {
  withTmpDir((dir) => {
    run(pwsh, psArgs(dir));
    for (const f of MASTERS) {
      const b = readFileSync(join(dir, f));
      assert.notDeepEqual([b[0], b[1], b[2]], [0xef, 0xbb, 0xbf], `${f} salió con BOM`);
    }
  });
});

psTest('init-tridente.ps1: inserta las respuestas de forma literal', () => {
  withTmpDir((dir) => {
    run(pwsh, psArgs(dir));
    const dna = read(join(dir, 'gemini.md'));
    assert.ok(dna.includes(ANSWERS.goal));
    assert.ok(dna.includes(ANSWERS.rules));
  });
});

psTest('init-tridente.ps1: sin TTY y sin -Yes, NO sobrescribe archivos del usuario', () => {
  // Regresión: Read-Host devuelve $null en EOF y `$null -notmatch` produce un
  // array vacío (falsy), así que el script tomaba la rama "continuar" y pisaba
  // los archivos saliendo con código 0.
  withTmpDir((dir) => {
    writeFileSync(join(dir, 'gemini.md'), '# contenido previo del usuario\n');
    const r = run(pwsh, [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, '-Dir', dir,
      '-Goal', 'g', '-Stack', 's', '-Rules', 'r', '-Milestone', 'm', '-NoColor',
    ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    assert.notEqual(r.code, 0, 'debería haber abortado');
    assert.match(read(join(dir, 'gemini.md')), /contenido previo/, 'sobrescribió sin permiso');
  });
});

psTest('init-tridente.ps1: sin TTY y sin datos, aborta en vez de colgarse', () => {
  // Regresión: la guarda usaba [Environment]::UserInteractive, que en Windows
  // es True aunque stdin esté redirigido. Read-Host devolvía $null en EOF y el
  // bucle "la respuesta no puede estar vacía" no terminaba nunca.
  withTmpDir((dir) => {
    const r = run(pwsh, [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, '-Dir', dir,
      '-Stack', 's', '-Rules', 'r', '-Milestone', 'm', '-Yes', '-NoColor',
    ], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    assert.notEqual(r.code, 0, 'debería haber abortado por falta de -Goal');
    assert.equal(existsSync(join(dir, 'gemini.md')), false, 'escribió pese a faltar un dato');
  });
});

psTest('init-tridente.ps1: --adapters desconocido falla con código 2', () => {
  withTmpDir((dir) => {
    const r = run(pwsh, psArgs(dir, ['-Adapters', 'cursorr']));
    assert.equal(r.code, 2);
  });
});

psTest('PARIDAD: Bash y PowerShell producen exactamente los mismos archivos', () => {
  withTmpDir((a) =>
    withTmpDir((b) => {
      assert.equal(run('bash', shArgs(a)).code, 0);
      assert.equal(run(pwsh, psArgs(b)).code, 0);

      assert.deepEqual(listFiles(a), listFiles(b), 'los dos scripts crean conjuntos de archivos distintos');

      for (const f of listFiles(a)) {
        const ta = read(join(a, f));
        const tb = read(join(b, f));
        assert.equal(ta, tb, `${f} difiere entre Bash y PowerShell`);
      }
    }),
  );
});

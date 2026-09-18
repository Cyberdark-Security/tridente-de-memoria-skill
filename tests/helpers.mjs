/** Utilidades compartidas por las pruebas. */

import { readFileSync, existsSync, mkdtempSync, rmSync, readdirSync, statSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const spec = JSON.parse(readFileSync(join(ROOT, 'protocol', 'tridente.spec.json'), 'utf8'));
export const byId = Object.fromEntries(spec.files.map((f) => [f.id, f]));

export const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
export const readRoot = (rel) => read(join(ROOT, rel));
export const existsRoot = (rel) => existsSync(join(ROOT, rel));

/** Crea un directorio temporal y lo borra al terminar. */
export function withTmpDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'tridente-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Copia lo imprescindible del repositorio a un directorio temporal.
 * Las pruebas que necesitan ejecutar el generador en modo escritura trabajan
 * ahí: auditar el proyecto no debe modificar el árbol de trabajo real.
 */
export function withRepoCopy(fn) {
  return withTmpDir((dir) => {
    for (const entry of ['protocol', 'scripts', 'templates', 'docs', 'dist', '.cursor', '.gemini',
      '.github', '.roo', '.junie', '.amazonq', '.idx', '.devin', '.clinerules']) {
      const from = join(ROOT, entry);
      if (existsSync(from)) cpSync(from, join(dir, entry), { recursive: true });
    }
    for (const f of ['AGENTS.md', 'SKILL.md', 'README.md', 'README_EN.md', 'CLAUDE.md',
      'CONVENTIONS.md', '.windsurfrules', 'package.json',
      // Documentos escritos a mano: el generador los vigila y las pruebas de
      // deriva necesitan poder alterarlos sin tocar el repositorio real.
      'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'CHANGELOG.md']) {
      const from = join(ROOT, f);
      if (existsSync(from)) cpSync(from, join(dir, f));
    }
    return fn(dir);
  });
}

export function run(cmd, args, opts = {}) {
  try {
    return {
      code: 0,
      out: execFileSync(cmd, args, {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 600000,
        ...opts,
      }),
    };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/** Intérprete de PowerShell disponible, o null. */
let cachedPwsh;
export function findPowerShell() {
  if (cachedPwsh !== undefined) return cachedPwsh;
  cachedPwsh = null;
  for (const c of ['pwsh', 'powershell']) {
    if (run(c, ['-NoProfile', '-Command', 'exit 0']).code === 0) {
      cachedPwsh = c;
      break;
    }
  }
  return cachedPwsh;
}

/** Lista recursiva de archivos bajo `dir`, relativa a `dir`. */
export function listFiles(dir, acc = [], base = dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) listFiles(p, acc, base);
    else acc.push(relative(base, p).split('\\').join('/'));
  }
  return acc.sort();
}

export const sizeKb = (p) => Math.round(statSync(p).size / 1024);

/** Respuestas de la entrevista usadas en las pruebas. Deliberadamente hostiles. */
export const ANSWERS = {
  name: 'proyecto-de-prueba',
  goal: 'API de pagos & conciliación "automática" con 100% de cobertura',
  stack: 'Go 1.23 + PostgreSQL 16 + Docker',
  rules: 'Sin ORM; $HOME y `backticks` son texto literal; a\\b',
  milestone: 'MVP con login y CRUD',
};

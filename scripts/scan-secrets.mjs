#!/usr/bin/env node
/**
 * Barrido de secretos: árbol de trabajo + TODO el historial de git.
 *
 *   node scripts/scan-secrets.mjs            árbol de trabajo e historial
 *   node scripts/scan-secrets.mjs --worktree sólo el árbol de trabajo
 *   node scripts/scan-secrets.mjs --history  sólo el historial
 *
 * Revisa el historial completo (`git rev-list --objects --all`) porque borrar
 * un archivo hoy no lo saca de los commits anteriores: cualquiera que clone el
 * repositorio puede recuperarlo.
 *
 * Sale 1 si encuentra algo. Sin dependencias.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const ONLY_WT = argv.includes('--worktree');
const ONLY_HIST = argv.includes('--history');

/** Credenciales reales, no palabras sueltas: un `password:` en prosa no cuenta. */
const PATTERNS = [
  ['Clave de API de Google', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['Clave de OpenAI', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['Clave de Anthropic', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ['Token de GitHub', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/g],
  ['PAT fino de GitHub', /\bgithub_pat_[A-Za-z0-9_]{50,}\b/g],
  ['Clave de acceso AWS', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ['Secreto de AWS', /aws_secret_access_key\s*[=:]\s*\S{30,}/gi],
  ['Token de Slack', /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g],
  ['Clave privada', /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/g],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['Token Bearer', /\b[Bb]earer\s+[A-Za-z0-9_\-.=]{25,}/g],
  ['Cadena de conexión con credenciales', /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@/g],
  ['Cuenta de servicio de GCP', /"private_key_id"\s*:|"type"\s*:\s*"service_account"/g],
  ['Asignación de secreto', /\b(?:api[_-]?key|apikey|secret|token|passwd|password|access[_-]?token|client[_-]?secret)\b\s*[=:]\s*["'`][^"'`\s]{12,}["'`]/gi],
  ['Twilio / SendGrid', /\bSK[0-9a-fA-F]{32}\b|\bSG\.[A-Za-z0-9_-]{20,}/g],
  ['Stripe', /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g],
  ['Identificador de cliente de AI Studio', /\bgen-lang-client-\d{10}\b/g],
];

const BINARY = /\.(png|jpe?g|gif|ico|pdf|zip|gz|woff2?|ttf|mp4|webm)$/i;
const SKIP_DIRS = new Set(['.git', 'node_modules']);

/**
 * Un valor de ejemplo no es un secreto. Se descartan tokens de plantilla,
 * variables de entorno sin resolver y los rellenos habituales de documentación:
 * si no, el propio generador de este repositorio se denuncia a sí mismo por
 * emitir `Token = '{{MILESTONE}}'`.
 */
const PLACEHOLDER_VALUE =
  /\{\{|\}\}|\$\{|<[a-z_-]+>|\b(?:your|example|sample|dummy|placeholder|changeme|xxx+|tu[_-]?clave|aqui|aquí)\b|\.\.\.|…/i;

const findings = [];

function scan(where, label, text) {
  for (const [name, re] of PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const v = m[0];
      if (PLACEHOLDER_VALUE.test(v)) continue;
      // No se imprime el secreto entero, sólo lo justo para localizarlo.
      const shown = v.length > 24 ? `${v.slice(0, 12)}…${v.slice(-4)}` : v;
      findings.push({ where, name, label, shown });
    }
  }
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 });
}

// ------------------------------------------------------------ árbol de trabajo

function scanWorktree(dir = ROOT) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      scanWorktree(p);
      continue;
    }
    if (BINARY.test(e.name)) continue;
    if (statSync(p).size > 5 * 1024 * 1024) continue;
    scan('árbol', relative(ROOT, p).split('\\').join('/'), readFileSync(p, 'utf8'));
  }
}

// ----------------------------------------------------------------- historial

function scanHistory() {
  let objects;
  try {
    objects = git(['rev-list', '--objects', '--all']).trim().split('\n').filter(Boolean);
  } catch {
    console.log('  (sin historial de git que revisar)');
    return 0;
  }
  let n = 0;
  for (const line of objects) {
    const sp = line.indexOf(' ');
    if (sp < 0) continue;
    const sha = line.slice(0, sp);
    const path = line.slice(sp + 1);
    if (!path || BINARY.test(path)) continue;
    let type;
    try {
      type = git(['cat-file', '-t', sha]).trim();
    } catch {
      continue;
    }
    if (type !== 'blob') continue;
    let content;
    try {
      content = git(['cat-file', '-p', sha]);
    } catch {
      continue;
    }
    scan('historial', path, content);
    n++;
  }
  return n;
}

// ------------------------------------------------------------------ ejecución

console.log('');
console.log('🔍 Barrido de secretos — Tridente de Memoria');
console.log(`   ${ROOT}`);
console.log('');

if (!ONLY_HIST) {
  scanWorktree();
  console.log('✓ Árbol de trabajo revisado.');
}
if (!ONLY_WT) {
  const n = scanHistory();
  console.log(`✓ Historial revisado: ${n} blob(s) de texto en todos los commits y ramas.`);
}

// Material que no debería viajar en el repositorio aunque no sea un secreto.
if (!ONLY_HIST) {
  const sensitive = ['GCP_Proyectos', '.env'];
  for (const s of sensitive) {
    if (!existsSync(join(ROOT, s))) continue;
    const gi = existsSync(join(ROOT, '.gitignore')) ? readFileSync(join(ROOT, '.gitignore'), 'utf8') : '';
    const ignored = new RegExp(`^${s.replace('.', '\\.')}/?$`, 'm').test(gi);
    console.log(`${ignored ? 'ℹ️ ' : '⚠️ '} ${s}/ está en el disco${ignored ? ' e ignorado por git' : ' y NO está ignorado'}`);
  }
}

console.log('');
if (findings.length === 0) {
  console.log('✅ Sin hallazgos. Ningún token ni credencial, ni en el árbol ni en el historial.');
  console.log('');
  process.exit(0);
}

console.log(`❌ ${findings.length} hallazgo(s):`);
console.log('');
for (const f of findings) {
  console.log(`  [${f.where}] ${f.name}`);
  console.log(`      ${f.label} → ${f.shown}`);
}
console.log('');
console.log('Si el hallazgo está en el HISTORIAL, borrar el archivo no basta: hay que');
console.log('reescribir el historial (git filter-repo / BFG) y ROTAR la credencial,');
console.log('porque cualquiera que ya tenga un clon la conserva.');
console.log('');
process.exit(1);

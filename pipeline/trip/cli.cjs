#!/usr/bin/env node
/* node pipeline/trip/cli.cjs <list|validate|render|check|renderers> [trip-id|--all]

   Renderers are discovered, not registered: every pipeline/trip/renderers/*.cjs exporting
   { name, description, outputs(trip) -> Map<filename, string> } is picked up automatically.
   That is what lets one renderer be added without touching any shared file. */
const fs = require('node:fs');
const path = require('node:path');
const { loadTrip, validateTrip, tripIds, errorsIn, repoRoot } = require('./load.cjs');

const renderersDir = path.join(__dirname, 'renderers');
const outRoot = path.join(__dirname, 'out');

const usage = `Usage:
  node pipeline/trip/cli.cjs list
  node pipeline/trip/cli.cjs renderers
  node pipeline/trip/cli.cjs validate [<trip-id>|--all]
  node pipeline/trip/cli.cjs render   [<trip-id>|--all]
  node pipeline/trip/cli.cjs check    [<trip-id>|--all]`;

function loadRenderers() {
  if (!fs.existsSync(renderersDir)) return [];
  return fs.readdirSync(renderersDir).filter(name => name.endsWith('.cjs')).sort().map(file => {
    const mod = require(path.join(renderersDir, file));
    if (!mod || typeof mod.outputs !== 'function' || !mod.name) {
      throw new Error(`pipeline/trip/renderers/${file} must export { name, description, outputs(trip) }.`);
    }
    return mod;
  });
}

function renderTrip(trip) {
  const findings = validateTrip(trip);
  const errors = errorsIn(findings);
  const files = new Map();
  if (errors.length) return { files, findings, errors, byRenderer: new Map() };
  const byRenderer = new Map();
  for (const renderer of loadRenderers()) {
    const produced = renderer.outputs(trip);
    const names = [];
    for (const [name, content] of produced) {
      if (files.has(name)) throw new Error(`Two renderers both produce "${name}"; one of them must be renamed.`);
      if (typeof content !== 'string') throw new Error(`Renderer "${renderer.name}" returned non-string content for "${name}".`);
      files.set(name, content);
      names.push(name);
    }
    byRenderer.set(renderer.name, names);
  }
  return { files, findings, errors, byRenderer };
}

const outputDir = trip => path.join(outRoot, trip.trip.id);

function writeTrip(trip) {
  const result = renderTrip(trip);
  const dir = outputDir(trip);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of result.files) {
    const target = path.join(dir, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return { ...result, dir: path.relative(repoRoot, dir) };
}

function checkTrip(trip) {
  const result = renderTrip(trip);
  const dir = outputDir(trip);
  const stale = [];
  for (const [name, content] of result.files) {
    const target = path.join(dir, name);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) stale.push(name);
  }
  return { ...result, stale, dir: path.relative(repoRoot, dir) };
}

const report = findings => findings.forEach(f =>
  console.log(`  ${f.severity === 'error' ? 'ERROR  ' : 'warning'} [${f.check}] ${f.id}: ${f.message}`));
const targets = argument => (!argument || argument === '--all') ? tripIds() : [argument];

function main(argv) {
  const [command, argument] = argv;
  if (!command || command === 'help' || command === '--help') { console.log(usage); return 0; }

  if (command === 'renderers') {
    const found = loadRenderers();
    if (!found.length) { console.log('No renderers yet. Add pipeline/trip/renderers/<name>.cjs.'); return 0; }
    for (const renderer of found) console.log(`${renderer.name}\n  ${renderer.description || ''}`);
    return 0;
  }

  if (command === 'list') {
    for (const id of tripIds()) {
      const trip = loadTrip(id);
      const slots = trip.days.reduce((n, day) => n + day.slots.length, 0);
      console.log(`${id}\n  ${trip.trip.title} · ${trip.trip.version}`);
      console.log(`  ${trip.trip.start_date} to ${trip.trip.end_date} · ${trip.suppliers.length} suppliers · ${slots} slots · ${trip.inclusions.length} inclusions`);
    }
    return 0;
  }

  if (!['validate', 'render', 'check'].includes(command)) { console.error(usage); return 2; }

  let failed = 0;
  for (const id of targets(argument)) {
    const trip = loadTrip(id);
    if (command === 'validate') {
      const findings = validateTrip(trip);
      const errors = errorsIn(findings);
      console.log(`${id}: ${errors.length} error(s), ${findings.length - errors.length} warning(s)`);
      report(findings);
      if (errors.length) failed = 1;
    }
    if (command === 'render') {
      const result = writeTrip(trip);
      if (result.errors.length) {
        console.error(`${id}: ${result.errors.length} error(s) block rendering.`);
        report(result.errors);
        failed = 1;
      } else {
        console.log(`${id}: wrote ${result.files.size} file(s) from ${result.byRenderer.size} renderer(s) to ${result.dir}`);
      }
    }
    if (command === 'check') {
      const result = checkTrip(trip);
      if (result.errors.length) { console.error(`${id}: ${result.errors.length} error(s).`); report(result.errors); failed = 1; }
      else if (result.stale.length) { console.error(`${id}: stale output(s): ${result.stale.join(', ')}. Run: node pipeline/trip/cli.cjs render ${id}`); failed = 1; }
      else console.log(`${id}: outputs current (${result.files.size} file(s)); ${result.findings.length} warning(s).`);
    }
  }
  return failed;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main, loadRenderers, renderTrip, writeTrip, checkTrip, outputDir, outRoot, renderersDir };

#!/usr/bin/env node
/* node pipeline/cli.cjs <list|validate|render|check|init> [case-id|--all] */
const fs = require('node:fs');
const path = require('node:path');
const { validateCase, loadCase, caseFiles, errorsIn, casesDir, repoRoot } = require('./validate.cjs');
const { writeCase, checkCase } = require('./render.cjs');

const usage = `Usage:
  node pipeline/cli.cjs list
  node pipeline/cli.cjs validate [<case-id>|--all]
  node pipeline/cli.cjs render   [<case-id>|--all]
  node pipeline/cli.cjs check    [<case-id>|--all]
  node pipeline/cli.cjs init <case-id> "Case title"`;

const ids = () => caseFiles().map(file => path.basename(file, '.case.json'));
const targets = argument => (!argument || argument === '--all') ? ids() : [argument];
const report = findings => findings.forEach(f => console.log(`  ${f.severity === 'error' ? 'ERROR  ' : 'warning'} [${f.check}] ${f.id}: ${f.message}`));

function main(argv) {
  const [command, argument, extra] = argv;
  if (!command || command === 'help' || command === '--help') { console.log(usage); return 0; }

  if (command === 'list') {
    for (const id of ids()) {
      const data = loadCase(id);
      const mark = data.case.illustrative === true ? ' [illustrative]' : '';
      console.log(`${id}${mark}\n  ${data.case.title || ''}\n  event ${data.event.id} · ${data.accounts.length} account(s) · ${data.opportunities.length} opportunit${data.opportunities.length === 1 ? 'y' : 'ies'} · prepared ${data.case.prepared_on}`);
    }
    return 0;
  }

  if (command === 'init') {
    if (!argument) { console.error('init needs a case id, e.g. bayside-charter-carnegie-2027-03-03'); return 2; }
    const target = path.join(casesDir, `${argument}.case.json`);
    if (fs.existsSync(target)) { console.error(`${path.relative(repoRoot, target)} already exists.`); return 2; }
    const template = JSON.parse(fs.readFileSync(path.join(casesDir, 'TEMPLATE.json'), 'utf8'));
    template.case.id = argument;
    template.case.title = extra || argument;
    template.case.prepared_on = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(target, JSON.stringify(template, null, 2) + '\n');
    console.log(`Wrote ${path.relative(repoRoot, target)}.
It inherits the event fact spine from "${template.extends_event}"; change or remove extends_event to model a different event.
Next: node pipeline/cli.cjs validate ${argument} — every error names a field still to fill.`);
    return 0;
  }

  if (!['validate', 'render', 'check'].includes(command)) { console.error(usage); return 2; }

  let failed = 0;
  for (const id of targets(argument)) {
    const data = loadCase(id);
    if (command === 'validate') {
      const findings = validateCase(data);
      const errors = errorsIn(findings);
      console.log(`${id}: ${errors.length} error(s), ${findings.length - errors.length} warning(s)`);
      report(findings);
      if (errors.length) failed = 1;
    }
    if (command === 'render') {
      const result = writeCase(data);
      console.log(`${id}: wrote ${result.files.size} file(s) to ${result.dir}`);
      report(result.findings);
      if (result.errors.length) { console.error(`${id}: governance errors block the stage outputs. Only the governance report was written.`); failed = 1; }
    }
    if (command === 'check') {
      const result = checkCase(data);
      if (result.errors.length) { console.error(`${id}: ${result.errors.length} governance error(s).`); report(result.findings); failed = 1; }
      else if (result.stale.length) { console.error(`${id}: stale output(s) in ${result.dir}: ${result.stale.join(', ')}. Run: node pipeline/cli.cjs render ${id}`); failed = 1; }
      else console.log(`${id}: outputs current (${result.files.size} file(s)); ${result.findings.length} warning(s).`);
    }
  }
  return failed;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { main };

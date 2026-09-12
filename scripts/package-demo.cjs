// Copy reviewed browser files verbatim; never regenerate editable materials here.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'demo/carnegie-hall');
const output = path.join(root, 'dist');
// Explicit publication boundary. Add new browser assets/downloads deliberately.
const files = [
  "app.js",
  "assets/troen-logo.webp",
  "exports/Troen - Example Follow-up.md",
  "exports/Troen - Salem Research Note.md",
  "exports/Troen - Wando Director Sheet.docx",
  "exports/Troen - Wando Director Sheet.md",
  "exports/Troen - Wando Research Note.md",
  "exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.docx",
  "exports/carnegie-hall/faq/Troen - Carnegie Hall Director FAQ.md",
  "index.html",
  "logistics/carnegie hall EVENT OVERVIEW.pdf",
  "outputs/01a08da2-45ab-7181-a80f-a887cb079101/Troen - Carnegie Opportunity Review.xlsx",
  "styles.css"
];
for (const file of files) {
  if (!fs.statSync(path.join(source, file)).isFile()) {
    throw new Error(`Missing demo file: ${file}`);
  }
}
// dist is disposable build output, never a source or editable document folder.
fs.rmSync(output, { recursive: true, force: true });
for (const file of files) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(source, file), target);
}
console.log(`Packaged ${files.length} reviewed demo files into dist.`);

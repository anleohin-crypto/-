import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let passed = 0;
const failures = [];
const check = (name, condition, detail='') => {
  if (condition) { passed++; console.log(`PASS ${passed}: ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`); }
};
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const pkg = JSON.parse(read('package.json'));
const html = read('index.html');
const electronMain = read('electron/main.mjs');
const workflow = read('.github/workflows/windows-build.yml');

check('release version is 1.1.0', pkg.version === '1.1.0', `got ${pkg.version}`);
check('Windows build never implicitly publishes', /--publish\s+never/.test(pkg.scripts?.['dist:win'] || ''));
check('packaged app CSP blocks outbound connections', /connect-src\s+'none'/.test(html));
check('renderer keeps nodeIntegration disabled', /nodeIntegration\s*:\s*false/.test(electronMain));
check('renderer keeps contextIsolation enabled', /contextIsolation\s*:\s*true/.test(electronMain));
check('renderer sandbox is enabled', /sandbox\s*:\s*true/.test(electronMain));
check('packaged navigation/window opening is denied', /setWindowOpenHandler/.test(electronMain) && /will-navigate/.test(electronMain));
check('workflow runs core regression', /npm run test:core/.test(workflow));
check('workflow runs XLSX integration', /npm run test:xlsx/.test(workflow));
check('workflow runs backup regression', /npm run test:backup/.test(workflow));
check('workflow performs production build before installer', workflow.indexOf('npm run build') < workflow.indexOf('npm run dist:win'));

const sourceFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|html)$/.test(entry.name)) sourceFiles.push(full);
  }
}
walk(path.join(root, 'src'));
walk(path.join(root, 'electron'));
const source = sourceFiles.map(f => fs.readFileSync(f,'utf8')).join('\n');
check('Google GenAI runtime dependency is absent', !/@google\/genai|GoogleGenerativeAI/.test(source));
check('no remote Google Fonts dependency exists', !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(source + '\n' + html));

if (failures.length) {
  console.error(`\nStatic release checks: ${passed} PASS, ${failures.length} FAIL`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`Static release checks: ${passed}/${passed} PASS`);

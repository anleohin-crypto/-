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
const dashboard = read('src/components/dashboard/DashboardView.tsx');
const drilldown = read('src/components/dashboard/DrilldownModal.tsx');
const importExport = read('src/components/importExport/ImportExportView.tsx');
const notifications = read('src/components/notifications/NotificationsView.tsx');

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

const dashboardDrilldowns = [...dashboard.matchAll(/openDrilldown\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
const uniqueDashboardDrilldowns = [...new Set(dashboardDrilldowns)];
const missingDrilldownRenderers = uniqueDashboardDrilldowns.filter(type => !drilldown.includes(`drilldown.type === '${type}'`) && !drilldown.includes(`drilldown.type === "${type}"`));
check(
  'every Dashboard drilldown action has a matching renderer',
  missingDrilldownRenderers.length === 0,
  missingDrilldownRenderers.length ? `missing: ${missingDrilldownRenderers.join(', ')}` : ''
);

for (const entity of ['tasks', 'clients', 'employees', 'absences']) {
  check(`Excel import supports ${entity}`, importExport.includes(`${entity}:`) || importExport.includes(`'${entity}'`) || importExport.includes(`"${entity}"`));
}
check('Excel import exposes a file picker', /type=["']file["']/.test(importExport) && /accept=["'][^"']*xlsx/.test(importExport));
check('notifications persist per-item dismissal state', /dismissNotification/.test(notifications) && /dismissed/.test(notifications));
check('notifications support clear-all and restore', /clearAllNotifications/.test(notifications) && /restoreDismissedNotifications/.test(notifications));

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

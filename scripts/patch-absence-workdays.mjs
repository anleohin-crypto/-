import fs from 'node:fs';

const file = 'src/components/absences/AbsencesView.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldFn = `  // Calculate working days (excluding Friday & Saturday)\n  const calculateWorkDays = (start: string, end: string) => {\n    if (!start || !end || end < start) return 0;\n    const dStart = new Date(start);\n    const dEnd = new Date(end);\n    let count = 0;\n    const cur = new Date(dStart);\n    while (cur <= dEnd) {\n      const day = cur.getDay();\n      if (day !== 5 && day !== 6) {\n        count++;\n      }\n      cur.setDate(cur.getDate() + 1);\n    }\n    return count;\n  };`;

const newFn = `  // Calculate working days according to the configured organization work week.\n  const calculateWorkDays = (start: string, end: string) => {\n    if (!start || !end || end < start) return 0;\n    const configuredWorkDays = settings.workDaysOfWeek || [0, 1, 2, 3, 4];\n    const dStart = new Date(start);\n    const dEnd = new Date(end);\n    let count = 0;\n    const cur = new Date(dStart);\n    while (cur <= dEnd) {\n      const day = cur.getDay();\n      if (configuredWorkDays.includes(day)) {\n        count++;\n      }\n      cur.setDate(cur.getDate() + 1);\n    }\n    return count;\n  };`;

if (!source.includes(newFn)) {
  if (!source.includes(oldFn)) throw new Error('Workday calculator marker not found');
  source = source.replace(oldFn, newFn);
}

source = source.replace('ימי עבודה מחושבים בטווח (ללא סופ״ש):', 'ימי עבודה מחושבים בטווח לפי הגדרות המערכת:');
source = source.replace('מחושב לפי ימי עבודה בטווח (ללא ימי שישי-שבת)', 'מחושב לפי ימי העבודה המוגדרים במערכת');

fs.writeFileSync(file, source);
console.log('Absence workday calculation now follows settings.workDaysOfWeek.');

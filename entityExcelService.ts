import * as XLSX from 'xlsx';
import { Absence, Client, DuplicateMatch, Employee, ImportEntityType, Task } from '../types';

export type ImportDecision = 'import' | 'skip' | 'update';

export interface SmartImportRow<T = any> {
  rowNumber: number;
  raw: Record<string, any>;
  mapped: Partial<T>;
  errors: string[];
  warnings: string[];
  duplicate?: DuplicateMatch;
  decision: ImportDecision;
}

const norm = (v: any) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const bool = (v: any, fallback = false) => {
  const s = norm(v);
  if (['כן','yes','true','1','פעיל','billable','לחיוב'].includes(s)) return true;
  if (['לא','no','false','0','לא פעיל','non-billable','לא לחיוב'].includes(s)) return false;
  return fallback;
};
const isValidYmd = (y: number, m: number, d: number) => {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const toYmd = (y: number, m: number, d: number) => isValidYmd(y,m,d)
  ? `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  : '';
const date = (v: any) => {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return toYmd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  }
  const s = String(v ?? '').trim();
  if (!s) return '';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return toYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const local = s.match(/^(\d{1,2})[/\.\-](\d{1,2})[/\.\-](\d{4})$/);
  if (local) return toYmd(Number(local[3]), Number(local[2]), Number(local[1]));
  const parsed = new Date(s);
  if (isNaN(parsed.getTime())) return '';
  return toYmd(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
};
const pick = (row: Record<string, any>, names: string[]) => {
  const keys = Object.keys(row);
  for (const name of names) {
    const key = keys.find(k => norm(k) === norm(name) || norm(k).includes(norm(name)));
    if (key) return row[key];
  }
  return '';
};

function duplicate(score: number, existingId: string, existingLabel: string, matchedFields: string[], reason: string): DuplicateMatch | undefined {
  if (score < 40) return undefined;
  return {
    existingId,
    existingLabel,
    score,
    matchedFields,
    reason,
    risk: score >= 95 ? 'exact' : score >= 70 ? 'high' : 'medium',
  };
}

function best<T>(matches: { score: number; item: T; fields: string[]; reason: string }[], id: (x:T)=>string, label:(x:T)=>string) {
  const m = matches.sort((a,b)=>b.score-a.score)[0];
  return m ? duplicate(m.score, id(m.item), label(m.item), m.fields, m.reason) : undefined;
}

export const EntityExcelService = {
  async parseFile(file: File): Promise<{ workbook: XLSX.WorkBook; sheets: string[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
    return { workbook, sheets: workbook.SheetNames };
  },

  rows(workbook: XLSX.WorkBook, sheet: string): Record<string, any>[] {
    const ws = workbook.Sheets[sheet];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, any>[];
  },

  mapAndAnalyze(
    type: ImportEntityType,
    rows: Record<string, any>[],
    existing: { tasks: Task[]; employees: Employee[]; clients: Client[]; absences: Absence[] }
  ): SmartImportRow[] {
    const analyzed: SmartImportRow[] = rows.map((raw, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      let mapped: any = {};
      let dupe: DuplicateMatch | undefined;

      if (type === 'clients') {
        mapped = {
          code: String(pick(raw, ['קוד לקוח','קוד','client code','code']) || '').trim(),
          name: String(pick(raw, ['שם לקוח','לקוח','name','client']) || '').trim(),
          contactPerson: String(pick(raw, ['איש קשר','contact']) || '').trim(),
          email: String(pick(raw, ['מייל','email']) || '').trim(),
          phone: String(pick(raw, ['טלפון','phone']) || '').trim(),
          isRetainer: bool(pick(raw, ['ריטיינר','is retainer']), false),
          monthlyRetainerHours: num(pick(raw, ['שעות ריטיינר חודשיות','שעות חודשיות','monthly retainer hours']), 0),
          isActive: bool(pick(raw, ['פעיל','סטטוס','active']), true),
          notes: String(pick(raw, ['הערות','notes']) || '').trim(),
        } as Partial<Client>;
        if (!mapped.name) errors.push('שם לקוח חסר');
        if (!mapped.code) warnings.push('קוד לקוח חסר – מומלץ להשלים מזהה עסקי ייחודי');
        if (mapped.monthlyRetainerHours < 0) errors.push('שעות ריטיינר חודשיות לא יכולות להיות שליליות');
        const matches = existing.clients.map(c => {
          let score = 0; const fields:string[]=[];
          if (mapped.code && norm(c.code) === norm(mapped.code)) { score += 100; fields.push('קוד לקוח'); }
          if (mapped.name && norm(c.name) === norm(mapped.name)) { score += 25; fields.push('שם לקוח'); }
          if (mapped.email && norm(c.email) === norm(mapped.email)) { score += 20; fields.push('מייל'); }
          if (mapped.phone && norm(c.phone) === norm(mapped.phone)) { score += 10; fields.push('טלפון'); }
          return { score: Math.min(100,score), item:c, fields, reason:'השוואת קוד, שם, מייל וטלפון' };
        });
        dupe = best(matches, c=>c.id, c=>`${c.name} (${c.code})`);
      }

      if (type === 'employees') {
        mapped = {
          employeeNumber: String(pick(raw, ['מספר עובד','employee number','מס עובד']) || '').trim(),
          name: String(pick(raw, ['שם עובד','עובד','name']) || '').trim(),
          email: String(pick(raw, ['מייל','email']) || '').trim(),
          phone: String(pick(raw, ['טלפון','phone']) || '').trim(),
          role: String(pick(raw, ['תפקיד','role']) || 'עובד').trim(),
          department: String(pick(raw, ['מחלקה','department']) || '').trim(),
          jobPercentage: num(pick(raw, ['אחוז משרה','job percentage']), 100),
          dailyWorkHours: num(pick(raw, ['שעות עבודה ביום','שעות ביום','daily hours']), 9),
          weeklyWorkDays: num(pick(raw, ['ימי עבודה בשבוע','weekly work days']), 5),
          defaultMonthlyHours: num(pick(raw, ['שעות חודשיות','monthly hours']), 0) || undefined,
          startDate: date(pick(raw, ['תאריך התחלה','start date'])) || new Date().toISOString().slice(0,10),
          isActive: bool(pick(raw, ['פעיל','סטטוס','active']), true),
          notes: String(pick(raw, ['הערות','notes']) || '').trim(),
        } as Partial<Employee>;
        if (!mapped.name) errors.push('שם עובד חסר');
        if (mapped.jobPercentage <= 0 || mapped.jobPercentage > 200) errors.push('אחוז משרה חייב להיות גדול מ-0 ועד 200');
        if (mapped.dailyWorkHours <= 0 || mapped.dailyWorkHours > 24) errors.push('שעות עבודה ביום חייבות להיות בין 0 ל-24');
        if (mapped.weeklyWorkDays <= 0 || mapped.weeklyWorkDays > 7) errors.push('ימי עבודה בשבוע חייבים להיות בין 1 ל-7');
        const matches = existing.employees.map(e => {
          let score=0; const fields:string[]=[];
          if (mapped.employeeNumber && norm(e.employeeNumber) === norm(mapped.employeeNumber)) { score+=100; fields.push('מספר עובד'); }
          if (mapped.email && norm(e.email) === norm(mapped.email)) { score+=50; fields.push('מייל'); }
          if (mapped.name && norm(e.name) === norm(mapped.name)) { score+=25; fields.push('שם'); }
          if (mapped.phone && norm(e.phone) === norm(mapped.phone)) { score+=15; fields.push('טלפון'); }
          return { score:Math.min(100,score), item:e, fields, reason:'השוואת מספר עובד, מייל, שם וטלפון' };
        });
        dupe = best(matches, e=>e.id, e=>`${e.name}${e.employeeNumber ? ` (${e.employeeNumber})`:''}`);
      }

      if (type === 'absences') {
        const employeeText = String(pick(raw, ['מספר עובד','עובד','שם עובד','employee']) || '').trim();
        const employee = existing.employees.find(e => norm(e.employeeNumber) === norm(employeeText) || norm(e.name) === norm(employeeText));
        mapped = {
          employeeId: employee?.id || '',
          type: String(pick(raw, ['סוג היעדרות','סוג','type']) || 'חופשה').trim(),
          startDate: date(pick(raw, ['תאריך התחלה','start date'])),
          endDate: date(pick(raw, ['תאריך סיום','end date'])),
          hours: num(pick(raw, ['שעות','hours']), 0),
          isPlanned: bool(pick(raw, ['מתוכנן','planned']), true),
          isTeamWide: bool(pick(raw, ['חופשה מרוכזת','מרוכזת','team wide']), false),
          collectiveTitle: String(pick(raw, ['שם חופשה מרוכזת','כותרת','collective title']) || '').trim(),
          notes: String(pick(raw, ['הערות','notes']) || '').trim(),
        } as Partial<Absence>;
        if (!employee) errors.push(`עובד לא זוהה: ${employeeText || 'ריק'}`);
        if (!mapped.startDate || !mapped.endDate) errors.push('טווח תאריכים אינו תקין');
        if (mapped.startDate && mapped.endDate && mapped.endDate < mapped.startDate) errors.push('תאריך סיום היעדרות מוקדם מתאריך ההתחלה');
        if (mapped.hours <= 0) errors.push('שעות היעדרות חייבות להיות גדולות מאפס');
        if (mapped.isTeamWide && !mapped.collectiveTitle) warnings.push('חופשה מרוכזת ללא כותרת');
        const matches = existing.absences.map(a => {
          let score=0; const fields:string[]=[];
          if (employee && a.employeeId === employee.id) { score+=35; fields.push('עובד'); }
          if (a.startDate === mapped.startDate) { score+=25; fields.push('תאריך התחלה'); }
          if (a.endDate === mapped.endDate) { score+=20; fields.push('תאריך סיום'); }
          if (norm(a.type) === norm(mapped.type)) { score+=15; fields.push('סוג'); }
          if (num(a.hours) === num(mapped.hours)) { score+=5; fields.push('שעות'); }
          return { score, item:a, fields, reason:'השוואת עובד, טווח תאריכים, סוג ושעות' };
        });
        dupe = best(matches, a=>a.id, a=>`${employee?.name || a.employeeId}: ${a.type} ${a.startDate}-${a.endDate}`);
      }

      if (type === 'tasks') {
        const employeeText = String(pick(raw, ['מספר עובד','עובד אחראי','עובד','assignee']) || '').trim();
        const clientText = String(pick(raw, ['קוד לקוח','לקוח','client']) || '').trim();
        const employee = existing.employees.find(e => norm(e.employeeNumber) === norm(employeeText) || norm(e.name) === norm(employeeText));
        const client = existing.clients.find(c => norm(c.code) === norm(clientText) || norm(c.name) === norm(clientText));
        const rawStartDate = pick(raw, ['תאריך התחלה','planned start','start date']);
        const rawPlannedEndDate = pick(raw, ['תאריך סיום מתוכנן','planned end','end date']);
        const rawDeadline = pick(raw, ['דדליין','תאריך יעד','deadline']);
        const parsedStartDate = date(rawStartDate);
        const parsedPlannedEndDate = date(rawPlannedEndDate);
        const parsedDeadline = date(rawDeadline);
        const hasValue = (v: any) => v instanceof Date || String(v ?? '').trim() !== '';
        mapped = {
          taskNumber: String(pick(raw, ['מספר משימה','task number']) || '').trim() || undefined,
          name: String(pick(raw, ['שם משימה','משימה','task','name']) || '').trim(),
          clientId: client?.id || '',
          assigneeId: employee?.id || '',
          priority: String(pick(raw, ['עדיפות','priority']) || 'רגילה').trim(),
          plannedStartDate: parsedStartDate || (hasValue(rawStartDate) ? '' : new Date().toISOString().slice(0,10)),
          plannedEndDate: parsedPlannedEndDate,
          deadline: parsedDeadline,
          estimatedHours: num(pick(raw, ['שעות משוערות','שעות','estimated hours']), 0),
          actualHours: num(pick(raw, ['שעות בפועל','actual hours']), 0),
          remainingHours: num(pick(raw, ['שעות נותרות','remaining hours']), 0),
          completionPercentage: num(pick(raw, ['אחוז השלמה','completion']), 0),
          status: String(pick(raw, ['סטטוס','status']) || 'חדש').trim(),
          isBillable: bool(pick(raw, ['לחיוב','billable']), true),
          source: String(pick(raw, ['מקור משימה','מקור','source']) || 'לקוח').trim(),
          notes: String(pick(raw, ['הערות','notes']) || '').trim(),
        } as Partial<Task>;
        if (!mapped.name) errors.push('שם משימה חסר');
        if (!client) errors.push(`לקוח לא זוהה: ${clientText || 'ריק'}`);
        if (!employee) errors.push(`עובד לא זוהה: ${employeeText || 'ריק'}`);
        if (hasValue(rawStartDate) && !parsedStartDate) errors.push('תאריך התחלה אינו תאריך קלנדרי תקין');
        if (hasValue(rawPlannedEndDate) && !parsedPlannedEndDate) errors.push('תאריך סיום מתוכנן אינו תאריך קלנדרי תקין');
        if (hasValue(rawDeadline) && !parsedDeadline) errors.push('דדליין אינו תאריך קלנדרי תקין');
        if (!mapped.plannedEndDate) mapped.plannedEndDate = mapped.deadline || mapped.plannedStartDate;
        if (!mapped.deadline) mapped.deadline = mapped.plannedEndDate || mapped.plannedStartDate;
        if ((mapped.estimatedHours ?? 0) < 0) errors.push('שעות משוערות לא יכולות להיות שליליות');
        if ((mapped.actualHours ?? 0) < 0) errors.push('שעות בפועל לא יכולות להיות שליליות');
        if ((mapped.remainingHours ?? 0) < 0) errors.push('שעות נותרות לא יכולות להיות שליליות');
        if ((mapped.completionPercentage ?? 0) < 0 || (mapped.completionPercentage ?? 0) > 100) errors.push('אחוז השלמה חייב להיות בין 0 ל-100');
        if (mapped.plannedEndDate && mapped.plannedStartDate && mapped.plannedEndDate < mapped.plannedStartDate) errors.push('תאריך סיום מתוכנן מוקדם מתאריך ההתחלה');
        if (mapped.deadline && mapped.plannedEndDate && mapped.deadline < mapped.plannedEndDate) errors.push('דדליין לא יכול להיות מוקדם מתאריך הסיום המתוכנן');
        const matches = existing.tasks.map(t => {
          let score=0; const fields:string[]=[];
          if (mapped.taskNumber && norm(t.taskNumber) === norm(mapped.taskNumber)) { score+=100; fields.push('מספר משימה'); }
          if (mapped.name && norm(t.name) === norm(mapped.name)) { score+=30; fields.push('שם משימה'); }
          if (client && t.clientId === client.id) { score+=20; fields.push('לקוח'); }
          if (employee && t.assigneeId === employee.id) { score+=10; fields.push('עובד'); }
          if (t.plannedStartDate === mapped.plannedStartDate) { score+=15; fields.push('תאריך התחלה'); }
          if (num(t.estimatedHours) === num(mapped.estimatedHours)) { score+=10; fields.push('שעות משוערות'); }
          if (t.deadline === mapped.deadline) { score+=10; fields.push('דדליין'); }
          return { score:Math.min(100,score), item:t, fields, reason:'השוואה חכמה של מספר/שם משימה, לקוח, עובד, תאריכים ושעות' };
        });
        dupe = best(matches, t=>t.id, t=>`${t.taskNumber} – ${t.name}`);
      }

      return {
        rowNumber: idx + 2,
        raw,
        mapped,
        errors,
        warnings,
        duplicate: dupe,
        decision: dupe?.risk === 'exact' ? 'skip' : 'import',
      };
    });

    // Also compare rows to earlier rows in the SAME workbook. This prevents a clean
    // import file from creating duplicates even when the database did not contain them yet.
    // The comparison is record-level/weighted; repeated values in a single cell are never
    // treated as duplicates on their own (except explicit business identifiers).
    const scoreRows = (a: any, b: any): { score: number; fields: string[] } => {
      let score = 0; const fields: string[] = [];
      if (type === 'clients') {
        if (a.code && b.code && norm(a.code) === norm(b.code)) { score += 100; fields.push('קוד לקוח'); }
        if (a.name && b.name && norm(a.name) === norm(b.name)) { score += 25; fields.push('שם לקוח'); }
        if (a.email && b.email && norm(a.email) === norm(b.email)) { score += 20; fields.push('מייל'); }
        if (a.phone && b.phone && norm(a.phone) === norm(b.phone)) { score += 10; fields.push('טלפון'); }
      }
      if (type === 'employees') {
        if (a.employeeNumber && b.employeeNumber && norm(a.employeeNumber) === norm(b.employeeNumber)) { score += 100; fields.push('מספר עובד'); }
        if (a.email && b.email && norm(a.email) === norm(b.email)) { score += 50; fields.push('מייל'); }
        if (a.name && b.name && norm(a.name) === norm(b.name)) { score += 25; fields.push('שם'); }
        if (a.phone && b.phone && norm(a.phone) === norm(b.phone)) { score += 15; fields.push('טלפון'); }
      }
      if (type === 'absences') {
        if (a.employeeId && b.employeeId && a.employeeId === b.employeeId) { score += 35; fields.push('עובד'); }
        if (a.startDate && b.startDate && a.startDate === b.startDate) { score += 25; fields.push('תאריך התחלה'); }
        if (a.endDate && b.endDate && a.endDate === b.endDate) { score += 20; fields.push('תאריך סיום'); }
        if (a.type && b.type && norm(a.type) === norm(b.type)) { score += 15; fields.push('סוג'); }
        if (num(a.hours) === num(b.hours)) { score += 5; fields.push('שעות'); }
      }
      if (type === 'tasks') {
        if (a.taskNumber && b.taskNumber && norm(a.taskNumber) === norm(b.taskNumber)) { score += 100; fields.push('מספר משימה'); }
        if (a.name && b.name && norm(a.name) === norm(b.name)) { score += 30; fields.push('שם משימה'); }
        if (a.clientId && b.clientId && a.clientId === b.clientId) { score += 20; fields.push('לקוח'); }
        if (a.assigneeId && b.assigneeId && a.assigneeId === b.assigneeId) { score += 10; fields.push('עובד'); }
        if (a.plannedStartDate && b.plannedStartDate && a.plannedStartDate === b.plannedStartDate) { score += 15; fields.push('תאריך התחלה'); }
        if (num(a.estimatedHours) === num(b.estimatedHours)) { score += 10; fields.push('שעות משוערות'); }
        if (a.deadline && b.deadline && a.deadline === b.deadline) { score += 10; fields.push('דדליין'); }
      }
      return { score: Math.min(100, score), fields };
    };

    for (let i = 0; i < analyzed.length; i++) {
      for (let j = 0; j < i; j++) {
        const match = scoreRows(analyzed[i].mapped, analyzed[j].mapped);
        const candidate = duplicate(
          match.score,
          `import-row-${analyzed[j].rowNumber}`,
          `שורה ${analyzed[j].rowNumber} בקובץ`,
          match.fields,
          `חשד לכפילות מול שורה ${analyzed[j].rowNumber} באותו קובץ לפי שילוב מאפייני הרשומה`,
        );
        if (candidate && (!analyzed[i].duplicate || candidate.score > analyzed[i].duplicate!.score)) {
          analyzed[i].duplicate = candidate;
          analyzed[i].decision = candidate.risk === 'exact' ? 'skip' : 'import';
        }
      }
    }

    return analyzed;
  },

  templateRows(type: ImportEntityType): any[] {
    const samples: Record<ImportEntityType, any[]> = {
      clients: [{ 'קוד לקוח':'C001','שם לקוח':'לקוח לדוגמה','איש קשר':'ישראל ישראלי','מייל':'contact@example.com','טלפון':'0500000000','ריטיינר':'כן','שעות ריטיינר חודשיות':20,'פעיל':'כן','הערות':'' }],
      employees: [{ 'מספר עובד':'1001','שם עובד':'עובד לדוגמה','מייל':'employee@example.com','טלפון':'0500000000','תפקיד':'מיישם ERP','מחלקה':'יישום','אחוז משרה':100,'שעות עבודה ביום':9,'ימי עבודה בשבוע':5,'תאריך התחלה':'2026-09-01','פעיל':'כן','הערות':'' }],
      absences: [{ 'מספר עובד':'1001','סוג היעדרות':'חופשה','תאריך התחלה':'2026-09-20','תאריך סיום':'2026-09-21','שעות':18,'מתוכנן':'כן','חופשה מרוכזת':'לא','שם חופשה מרוכזת':'','הערות':'' }],
      tasks: [{ 'מספר משימה':'','שם משימה':'משימת דוגמה','קוד לקוח':'C001','מספר עובד':'1001','עדיפות':'רגילה','תאריך התחלה':'2026-09-10','תאריך סיום מתוכנן':'2026-09-30','דדליין':'2026-09-30','שעות משוערות':10,'שעות בפועל':0,'שעות נותרות':10,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן','מקור משימה':'לקוח','הערות':'' }],
    };
    return samples[type];
  },

  template(type: ImportEntityType) {
    this.downloadWorkbook(this.templateRows(type), `template_${type}_1.1.0.xlsx`, 'Template');
  },

  exportRows(type: ImportEntityType, data: { tasks: Task[]; employees: Employee[]; clients: Client[]; absences: Absence[] }): any[] {
    let rows:any[]=[];
    if (type === 'clients') rows = data.clients.map(c => ({'קוד לקוח':c.code,'שם לקוח':c.name,'איש קשר':c.contactPerson||'','מייל':c.email||'','טלפון':c.phone||'','ריטיינר':c.isRetainer?'כן':'לא','שעות ריטיינר חודשיות':c.monthlyRetainerHours||0,'פעיל':c.isActive===false?'לא':'כן','הערות':c.notes||''}));
    if (type === 'employees') rows = data.employees.map(e => ({'מספר עובד':e.employeeNumber||'','שם עובד':e.name,'מייל':e.email||'','טלפון':e.phone||'','תפקיד':e.role,'מחלקה':e.department||'','אחוז משרה':e.jobPercentage,'שעות עבודה ביום':e.dailyWorkHours,'ימי עבודה בשבוע':e.weeklyWorkDays,'שעות חודשיות':e.defaultMonthlyHours||'','תאריך התחלה':e.startDate,'פעיל':e.isActive?'כן':'לא','הערות':e.notes||''}));
    if (type === 'absences') rows = data.absences.map(a => { const e=data.employees.find(x=>x.id===a.employeeId); return {'מספר עובד':e?.employeeNumber||e?.name||a.employeeId,'סוג היעדרות':a.type,'תאריך התחלה':a.startDate,'תאריך סיום':a.endDate,'שעות':a.hours,'מתוכנן':a.isPlanned?'כן':'לא','חופשה מרוכזת':a.isTeamWide?'כן':'לא','שם חופשה מרוכזת':a.collectiveTitle||'','הערות':a.notes||''}; });
    if (type === 'tasks') rows = data.tasks.map(t => { const e=data.employees.find(x=>x.id===t.assigneeId); const c=data.clients.find(x=>x.id===t.clientId); return {'מספר משימה':t.taskNumber,'שם משימה':t.name,'קוד לקוח':c?.code||c?.name||t.clientId,'מספר עובד':e?.employeeNumber||e?.name||t.assigneeId,'עדיפות':t.priority,'תאריך התחלה':t.plannedStartDate,'תאריך סיום מתוכנן':t.plannedEndDate,'דדליין':t.deadline,'שעות משוערות':t.estimatedHours,'שעות בפועל':t.actualHours,'שעות נותרות':t.remainingHours,'אחוז השלמה':t.completionPercentage,'סטטוס':t.status,'לחיוב':t.isBillable?'כן':'לא','מקור משימה':t.source||'','הערות':t.notes||''}; });
    return rows;
  },

  createWorkbook(rows:any[], sheetName:string): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return wb;
  },

  export(type: ImportEntityType, data: { tasks: Task[]; employees: Employee[]; clients: Client[]; absences: Absence[] }) {
    this.downloadWorkbook(this.exportRows(type, data), `export_${type}_${new Date().toISOString().slice(0,10)}.xlsx`, 'Data');
  },

  downloadWorkbook(rows:any[], filename:string, sheetName:string) {
    XLSX.writeFile(this.createWorkbook(rows, sheetName), filename);
  },
};

import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { EntityExcelService } from '../src/services/entityExcelService';
import { ImportCommitService } from '../src/services/importCommitService';
import type { Absence, Client, Employee, ImportEntityType, Task, TaskAllocation } from '../src/types';

const employees: Employee[] = [{ id:'emp-1', employeeNumber:'1001', name:'אנטון בדיקה', role:'מיישם ERP', jobPercentage:100, dailyWorkHours:9, weeklyWorkDays:5, isActive:true, startDate:'2026-01-01' }];
const clients: Client[] = [{ id:'cli-1', code:'C001', name:'לקוח בדיקה', isActive:true }];
const tasks: Task[] = [{ id:'tsk-1', taskNumber:'TSK-001', name:'משימה קיימת', clientId:'cli-1', assigneeId:'emp-1', priority:'רגילה', createdAt:'2026-09-01', plannedStartDate:'2026-09-10', plannedEndDate:'2026-09-20', deadline:'2026-09-20', estimatedHours:10, actualHours:0, remainingHours:10, completionPercentage:0, status:'חדש', isBillable:true }];
const absences: Absence[] = [{ id:'abs-1', employeeId:'emp-1', type:'חופשה', startDate:'2026-09-25', endDate:'2026-09-25', hours:9, isPlanned:true }];
const taskAllocations: TaskAllocation[] = [{ id:'ta-1', taskId:'tsk-1', employeeId:'emp-1', month:'2026-09', allocatedHours:10, source:'import' }];
const existing = { tasks, employees, clients, absences };
const source = { ...existing, taskAllocations };

let passed = 0;
const test = (name:string, fn:()=>void) => { fn(); passed++; console.log(`PASS ${passed}: ${name}`); };

for (const type of ['clients','employees','absences','tasks'] as ImportEntityType[]) {
  test(`${type}: template rows serialize and parse through real XLSX`, () => {
    const rows = EntityExcelService.templateRows(type);
    const wb = EntityExcelService.createWorkbook(rows, 'Template');
    const bytes = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
    const reloaded = XLSX.read(bytes, { type:'buffer', cellDates:true });
    const parsed = EntityExcelService.rows(reloaded, 'Template');
    assert.equal(parsed.length, 1);
    assert.ok(Object.keys(parsed[0]).length >= 5);
  });
  test(`${type}: export rows round-trip through real XLSX`, () => {
    const rows = EntityExcelService.exportRows(type, existing);
    const wb = EntityExcelService.createWorkbook(rows, 'Data');
    const bytes = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
    const reloaded = XLSX.read(bytes, { type:'buffer', cellDates:true });
    const parsed = EntityExcelService.rows(reloaded, 'Data');
    assert.equal(parsed.length, rows.length);
    assert.deepEqual(Object.keys(parsed[0]), Object.keys(rows[0]));
  });
}

test('tasks: exact business id is detected after real XLSX parse', () => {
  const rows = [{ 'מספר משימה':'TSK-001','שם משימה':'שם אחר','קוד לקוח':'C001','מספר עובד':'1001','תאריך התחלה':'2026-09-10','תאריך סיום מתוכנן':'2026-09-20','דדליין':'2026-09-20','שעות משוערות':11,'שעות נותרות':11,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן' }];
  const wb = EntityExcelService.createWorkbook(rows, 'Data');
  const bytes = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  const loaded = XLSX.read(bytes, { type:'buffer', cellDates:true });
  const analyzed = EntityExcelService.mapAndAnalyze('tasks', EntityExcelService.rows(loaded,'Data'), existing);
  assert.equal(analyzed[0].duplicate?.risk, 'exact');
  assert.equal(analyzed[0].decision, 'skip');
});

test('tasks: duplicate inside same workbook cannot be used as update target', () => {
  const row = { 'מספר משימה':'TSK-NEW','שם משימה':'כפול בקובץ','קוד לקוח':'C001','מספר עובד':'1001','תאריך התחלה':'2026-10-01','תאריך סיום מתוכנן':'2026-10-10','דדליין':'2026-10-10','שעות משוערות':8,'שעות נותרות':8,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן' };
  const analyzed = EntityExcelService.mapAndAnalyze('tasks', [row, {...row}], existing);
  assert.ok(analyzed[1].duplicate?.existingId.startsWith('import-row-'));
  analyzed[1].decision = 'update';
  assert.throws(() => ImportCommitService.buildPlan('tasks', analyzed, source, 1_800_000_000_000), /לא ניתן/);
});

test('task update realigns import allocation after workbook-driven update', () => {
  const extraEmployee: Employee = { ...employees[0], id:'emp-2', employeeNumber:'1002', name:'עובד שני' };
  const ex = { ...existing, employees:[...employees, extraEmployee] };
  const src = { ...source, employees:ex.employees };
  const rows = [{ 'מספר משימה':'TSK-001','שם משימה':'משימה קיימת','קוד לקוח':'C001','מספר עובד':'1002','תאריך התחלה':'2026-10-05','תאריך סיום מתוכנן':'2026-10-20','דדליין':'2026-10-20','שעות משוערות':14,'שעות נותרות':14,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן' }];
  const analyzed = EntityExcelService.mapAndAnalyze('tasks', rows, ex);
  analyzed[0].decision = 'update';
  const plan = ImportCommitService.buildPlan('tasks', analyzed, src, 1_800_000_000_000);
  const alloc = plan.taskAllocations.find(a => a.taskId === 'tsk-1' && a.source === 'import');
  assert.equal(alloc?.employeeId, 'emp-2');
  assert.equal(alloc?.month, '2026-10');
  assert.equal(alloc?.allocatedHours, 14);
});


test('tasks: invalid ISO calendar date is rejected instead of normalized', () => {
  const rows = [{ 'מספר משימה':'TSK-BAD-DATE','שם משימה':'תאריך לא חוקי','קוד לקוח':'C001','מספר עובד':'1001','תאריך התחלה':'2026-02-31','תאריך סיום מתוכנן':'2026-03-10','דדליין':'2026-03-10','שעות משוערות':1,'שעות נותרות':1,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן' }];
  const analyzed = EntityExcelService.mapAndAnalyze('tasks', rows, existing);
  assert.ok(analyzed[0].errors.some(e => e.includes('תאריך')));
});

test('tasks: leap day validation accepts 2028-02-29 and rejects 2027-02-29', () => {
  const good = [{ 'מספר משימה':'TSK-LEAP-OK','שם משימה':'שנה מעוברת','קוד לקוח':'C001','מספר עובד':'1001','תאריך התחלה':'2028-02-29','תאריך סיום מתוכנן':'2028-03-01','דדליין':'2028-03-01','שעות משוערות':1,'שעות נותרות':1,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן' }];
  const bad = [{ 'מספר משימה':'TSK-LEAP-BAD','שם משימה':'שנה לא מעוברת','קוד לקוח':'C001','מספר עובד':'1001','תאריך התחלה':'2027-02-29','תאריך סיום מתוכנן':'2027-03-01','דדליין':'2027-03-01','שעות משוערות':1,'שעות נותרות':1,'אחוז השלמה':0,'סטטוס':'חדש','לחיוב':'כן' }];
  const goodResult = EntityExcelService.mapAndAnalyze('tasks', good, existing);
  const badResult = EntityExcelService.mapAndAnalyze('tasks', bad, existing);
  assert.equal(goodResult[0].errors.length, 0);
  assert.ok(badResult[0].errors.some(e => e.includes('תאריך')));
});

console.log(`XLSX integration: ${passed}/${passed} PASS`);

import * as assert from 'node:assert/strict';
import { DependencyService } from '../src/services/dependencyService';
import { CriticalPathService } from '../src/services/criticalPathService';
import { generateOccurrenceDates, recurrenceToMonthlyAllocations } from '../src/services/recurrenceService';
import { BaselineService } from '../src/services/baselineService';
import { ScenarioService } from '../src/services/scenarioService';
import { checkDataIntegrity } from '../src/services/dataIntegrityService';
import { computeEmployeeCapacity, computeTeamCapacity } from '../src/services/capacityEngine';
import type { AppSettings, Employee, Task } from '../src/types';

const results: { name: string; ok: boolean; error?: string }[] = [];
const test = (name: string, fn: () => void) => {
  try { fn(); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch (error) { const message = error instanceof Error ? error.message : String(error); results.push({ name, ok: false, error: message }); console.error(`FAIL ${name}: ${message}`); }
};

const task = (id: string, start: string, end: string, extra: Partial<Task> = {}): Task => ({
  id, taskNumber: id, name: id, clientId: 'c1', assigneeId: 'e1', priority: 'רגילה',
  createdAt: '2026-01-01', plannedStartDate: start, plannedEndDate: end, deadline: end,
  estimatedHours: 9, actualHours: 0, remainingHours: 9, completionPercentage: 0,
  status: 'חדש', isBillable: true, planningStatus: 'approved', ...extra,
});

const employee = (id: string, extra: Partial<Employee> = {}): Employee => ({
  id, employeeNumber: id, name: id, role: 'מיישם', jobPercentage: 100,
  dailyWorkHours: 9, weeklyWorkDays: 5, isActive: true, startDate: '2026-01-01', ...extra,
});

const settings: AppSettings = {
  defaultDailyHours: 9,
  workDaysOfWeek: [0, 1, 2, 3, 4],
  monthlyStandardHoursMode: 'fixed_standard',
  fixedMonthlyStandardHours: 180,
  deductShortenedDaysFromStandard: false,
  shortenedDays: [],
  underAllocationThreshold: 75,
  overAllocationThreshold: 100,
  highUtilizationThreshold: 90,
  upcomingDeadlineDays: 7,
  workingYear: 2026,
  activeUserRole: 'Admin',
  activeUserName: 'QA',
};

test('Recurrence monthly_day skips invalid 31st', () => {
  assert.deepEqual(generateOccurrenceDates({ mode: 'monthly_day', hoursPerOccurrence: 1, startDate: '2026-01-01', endDate: '2026-04-30', dayOfMonth: 31 }), ['2026-01-31', '2026-03-31']);
});

test('Recurrence weekly respects exception dates', () => {
  const dates = generateOccurrenceDates({ mode: 'weekly', hoursPerOccurrence: 2, startDate: '2026-09-01', endDate: '2026-09-30', dayOfWeek: 2, exceptionDates: ['2026-09-15'] });
  assert.equal(dates.includes('2026-09-15'), false);
  assert.equal(dates.length, 4);
});

test('Specific dates are deduplicated and aggregated by month', () => {
  assert.deepEqual(recurrenceToMonthlyAllocations({ mode: 'specific_dates', hoursPerOccurrence: 1.5, startDate: '2026-01-01', endDate: '2026-12-31', specificDates: ['2026-09-01', '2026-09-01', '2026-10-01'] }), [{ month: '2026-09', hours: 1.5 }, { month: '2026-10', hours: 1.5 }]);
});

test('FS dependency with one-day lag accepts next-day start', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const b = task('B', '2026-09-04', '2026-09-05', { dependencies: [{ id: 'd1', predecessorTaskId: 'A', successorTaskId: 'B', type: 'FS', lagDays: 1, createdAt: 'x' }] });
  assert.equal(DependencyService.analyze([a, b])[0].blocked, false);
});

test('FS dependency detects blocked successor', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const b = task('B', '2026-09-03', '2026-09-05', { dependencies: [{ id: 'd1', predecessorTaskId: 'A', successorTaskId: 'B', type: 'FS', lagDays: 1, createdAt: 'x' }] });
  assert.equal(DependencyService.analyze([a, b])[0].blocked, true);
});

test('Circular dependency is rejected', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const b = task('B', '2026-09-04', '2026-09-05', { dependencies: [{ id: 'd1', predecessorTaskId: 'A', successorTaskId: 'B', type: 'FS', lagDays: 0, createdAt: 'x' }] });
  assert.equal(DependencyService.wouldCreateCycle([a, b], { predecessorTaskId: 'B', successorTaskId: 'A', type: 'FS', lagDays: 0 }), true);
});

test('Dependency cascade propagates lag through successor', () => {
  const a = task('A', '2026-09-01', '2026-09-06');
  const b = task('B', '2026-09-04', '2026-09-05', { dependencies: [{ id: 'd1', predecessorTaskId: 'A', successorTaskId: 'B', type: 'FS', lagDays: 1, createdAt: 'x' }] });
  const cascade = DependencyService.proposeCascade([a, b], 'A');
  assert.equal(cascade[0].plannedStartDate, '2026-09-07');
  assert.equal(cascade[0].plannedEndDate, '2026-09-08');
});

test('Critical path identifies a simple chain', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const b = task('B', '2026-09-04', '2026-09-05', { dependencies: [{ id: 'd1', predecessorTaskId: 'A', successorTaskId: 'B', type: 'FS', lagDays: 0, createdAt: 'x' }] });
  const c = task('C', '2026-09-06', '2026-09-07', { dependencies: [{ id: 'd2', predecessorTaskId: 'B', successorTaskId: 'C', type: 'FS', lagDays: 0, createdAt: 'x' }] });
  const cp = CriticalPathService.calculate([a, b, c]);
  assert.equal(cp.hasCycle, false);
  assert.deepEqual(new Set(cp.criticalTaskIds), new Set(['A', 'B', 'C']));
});

test('Baseline snapshot stays immutable and reports variance', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const baseline = BaselineService.createBaseline({ name: 'BL1', createdBy: 'u', tasks: [a], allocations: [{ id: 'al1', taskId: 'A', employeeId: 'e1', month: '2026-09', allocatedHours: 9 }] });
  const comparison = BaselineService.compareTask(baseline, { ...a, plannedEndDate: '2026-09-05', estimatedHours: 12, actualHours: 10 });
  assert.equal(baseline.tasks[0].plannedEndDate, '2026-09-03');
  assert.equal(comparison?.dateVarianceDays, 2);
  assert.equal(comparison?.hoursVariance, 3);
});

test('Scenario changes do not mutate production tasks', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const scenario = ScenarioService.createDelayScenario({ name: 'delay', taskIds: ['A'], delayDays: 10, tasks: [a], createdBy: 'u' });
  const changed = ScenarioService.applyToTasks([a], scenario);
  assert.equal(a.plannedStartDate, '2026-09-01');
  assert.equal(changed[0].plannedStartDate, '2026-09-11');
});

test('Scenario shifts a day allocation inside the same month', () => {
  const a = task('A', '2026-09-01', '2026-09-03');
  const scenario = ScenarioService.createDelayScenario({ name: 'delay', taskIds: ['A'], delayDays: 5, tasks: [a], createdBy: 'u' });
  const original = [{ id: 'x', taskId: 'A', employeeId: 'e1', month: '2026-09', allocationDate: '2026-09-02', allocatedHours: 9 }];
  const moved = ScenarioService.applyToAllocations([a], original, scenario);
  assert.equal(moved[0].allocationDate, '2026-09-07');
  assert.equal(moved[0].month, '2026-09');
  assert.equal(original[0].allocationDate, '2026-09-02');
});

test('Scenario derives allocation month from shifted allocation date', () => {
  const a = task('A', '2026-09-01', '2026-09-30');
  const scenario = ScenarioService.createDelayScenario({ name: 'delay', taskIds: ['A'], delayDays: 10, tasks: [a], createdBy: 'u' });
  const moved = ScenarioService.applyToAllocations([a], [{ id: 'x', taskId: 'A', employeeId: 'e1', month: '2026-09', allocationDate: '2026-09-25', allocatedHours: 4 }], scenario);
  assert.equal(moved[0].allocationDate, '2026-10-05');
  assert.equal(moved[0].month, '2026-10');
});

test('Capacity client filter excludes allocations from other clients', () => {
  const e = employee('e1');
  const t1 = task('T1', '2026-09-01', '2026-09-30', { clientId: 'c1' });
  const t2 = task('T2', '2026-09-01', '2026-09-30', { clientId: 'c2' });
  const metrics = computeTeamCapacity('2026-09', [e], [t1, t2], [
    { id: 'a1', taskId: 'T1', employeeId: 'e1', month: '2026-09', allocatedHours: 20 },
    { id: 'a2', taskId: 'T2', employeeId: 'e1', month: '2026-09', allocatedHours: 70 },
  ], [], [], [], settings, 'c1');
  assert.equal(metrics.taskHours, 20);
});

test('Cross-month absence hours are apportioned instead of double-counted', () => {
  const e = employee('e1');
  const absence = { id: 'ab', employeeId: 'e1', type: 'חופשה' as const, startDate: '2026-09-30', endDate: '2026-10-04', hours: 27, isPlanned: true };
  const sep = computeEmployeeCapacity(e, '2026-09', [], [], [], [absence], [], settings);
  const oct = computeEmployeeCapacity(e, '2026-10', [], [], [], [absence], [], settings);
  assert.ok(sep.absenceHours > 0);
  assert.ok(oct.absenceHours > 0);
  assert.ok(Math.abs((sep.absenceHours + oct.absenceHours) - 27) < 0.001);
});

test('Data integrity catches duplicates, broken references, bad dates and negative hours', () => {
  const a = task('A', '2026-09-05', '2026-09-01', { assigneeId: 'missing', deadline: '2026-08-30', estimatedHours: -1 });
  const issues = checkDataIntegrity({
    employees: [employee('e1', { employeeNumber: '1' }), employee('e2', { employeeNumber: '1' })],
    clients: [{ id: 'c1', name: 'C', code: 'C1' }], projects: [], tasks: [a],
    taskAllocations: [{ id: 'z', taskId: 'missing', employeeId: 'missing', month: '2026-09', allocatedHours: 2 }],
    absences: [{ id: 'ab', employeeId: 'missing', type: 'חופשה', startDate: '2026-09-05', endDate: '2026-09-01', hours: 9, isPlanned: true }],
  });
  assert.ok(issues.filter((i) => i.severity === 'error').length >= 6);
});


// WIP 10: Planning intelligence / Auto Planning / Forecast regression
import { AutoPlanningService } from '../src/services/autoPlanningService';
import { ForecastService } from '../src/services/forecastService';
import { PlanningIntelligenceService } from '../src/services/planningIntelligenceService';
import { EntityExcelService } from '../src/services/entityExcelService';
import { ImportCommitService } from '../src/services/importCommitService';

const teamMetrics = (employeeMetrics: any[]): any => ({
  month: '2026-09', grossCapacity: 360, absenceHours: 0, netCapacity: 360,
  fixedHours: 0, taskHours: employeeMetrics.reduce((s,m)=>s+m.taskAllocatedHours,0),
  totalAllocatedHours: employeeMetrics.reduce((s,m)=>s+m.totalAllocatedHours,0),
  billableHours: 0, nonBillableHours: 0, freeHours: employeeMetrics.reduce((s,m)=>s+m.freeCapacity,0),
  expectedIdleHours: employeeMetrics.reduce((s,m)=>s+m.idleHours,0),
  overAllocationHours: employeeMetrics.reduce((s,m)=>s+m.overAllocationHours,0),
  utilizationPercentage: 100, billableUtilizationPercentage: 0, openTasksCount: 0,
  overdueTasksCount: 0, atRiskTasksCount: 0, totalRemainingHours: 0, backlogCoverageMonths: 0,
  employeeMetrics,
});

const empMetric = (id:string, overrides:any = {}) => ({
  employeeId:id, employeeName:id, month:'2026-09', grossCapacity:180, absenceHours:0,
  fixedAllocationHours:0, netCapacity:180, taskAllocatedHours:0, totalAllocatedHours:0,
  billableHours:0, nonBillableHours:0, freeCapacity:180, idleHours:180, overAllocationHours:0,
  utilizationPercentage:0, billableUtilizationPercentage:0, status:'under', contributingTasks:[], ...overrides,
});

test('Planning intelligence aggregates one overload issue per employee', () => {
  const t1 = task('T1','2026-09-01','2026-09-10');
  const metrics = teamMetrics([empMetric('e1', { totalAllocatedHours:220, taskAllocatedHours:220, netCapacity:180, freeCapacity:0, idleHours:0, overAllocationHours:40, utilizationPercentage:122.2, status:'over', contributingTasks:[t1] })]);
  const issues = PlanningIntelligenceService.analyze({ tasks:[t1], employees:[employee('e1')], allocations:[], absences:[], teamMetrics:metrics });
  const overload = issues.filter(i => i.type === 'overload' && i.targetId === 'e1');
  assert.equal(overload.length, 1);
  assert.equal(overload[0].severity, 'critical');
  assert.ok(overload[0].relatedTaskIds?.includes('T1'));
});

test('Planning intelligence detects absence conflict only for overlapping assignee tasks', () => {
  const inRange = task('T1','2026-09-10','2026-09-20');
  const other = task('T2','2026-09-10','2026-09-20',{assigneeId:'e2'});
  const metrics = teamMetrics([empMetric('e1'), empMetric('e2')]);
  const issues = PlanningIntelligenceService.analyze({
    tasks:[inRange, other], employees:[employee('e1'),employee('e2')], allocations:[],
    absences:[{id:'a',employeeId:'e1',type:'חופשה',startDate:'2026-09-12',endDate:'2026-09-13',hours:18,isPlanned:true}], teamMetrics:metrics,
  });
  const conflict = issues.find(i => i.type === 'absence_conflict');
  assert.ok(conflict);
  assert.deepEqual(conflict?.relatedTaskIds, ['T1']);
});

test('Auto Planning prefers full reassignment when recipient has enough capacity', () => {
  const t1 = task('T1','2026-09-01','2026-09-10',{remainingHours:30});
  const metrics = teamMetrics([
    empMetric('e1',{totalAllocatedHours:210,taskAllocatedHours:210,netCapacity:180,freeCapacity:0,idleHours:0,overAllocationHours:30,utilizationPercentage:116.7,status:'over',contributingTasks:[t1]}),
    empMetric('e2',{totalAllocatedHours:100,taskAllocatedHours:100,freeCapacity:80,idleHours:80,utilizationPercentage:55.5,status:'under'}),
  ]);
  const issue:any = {id:'i',type:'overload',severity:'warning',title:'x',problem:'x',cause:'x',impact:'x',targetType:'employee',targetId:'e1',relatedTaskIds:['T1'],createdAt:'x'};
  const recs = AutoPlanningService.suggest({issues:[issue],tasks:[t1],employees:[employee('e1'),employee('e2')],allocations:[],teamMetrics:metrics});
  assert.equal(recs[0]?.action, 'reassign_task');
  assert.equal(recs[0]?.changes[0].newAssigneeId, 'e2');
  assert.equal(recs[0]?.requiresApproval, true);
});

test('Auto Planning proposes split when recipient capacity is partial', () => {
  const t1 = task('T1','2026-09-01','2026-09-10',{remainingHours:50});
  const metrics = teamMetrics([
    empMetric('e1',{totalAllocatedHours:220,taskAllocatedHours:220,netCapacity:180,freeCapacity:0,idleHours:0,overAllocationHours:40,utilizationPercentage:122.2,status:'over',contributingTasks:[t1]}),
    empMetric('e2',{totalAllocatedHours:160,taskAllocatedHours:160,freeCapacity:20,idleHours:20,utilizationPercentage:88.9,status:'normal'}),
  ]);
  const issue:any = {id:'i',type:'overload',severity:'critical',title:'x',problem:'x',cause:'x',impact:'x',targetType:'employee',targetId:'e1',relatedTaskIds:['T1'],createdAt:'x'};
  const recs = AutoPlanningService.suggest({issues:[issue],tasks:[t1],employees:[employee('e1'),employee('e2')],allocations:[],teamMetrics:metrics});
  assert.equal(recs[0]?.action, 'split_task');
  assert.equal(recs[0]?.changes[0].splitHours, 20);
});

test('Auto Planning apply does not mutate source tasks', () => {
  const t1 = task('T1','2026-09-01','2026-09-10');
  const rec:any = {id:'r',action:'reassign_task',title:'r',rationale:'r',impact:'r',score:80,requiresApproval:true,changes:[{taskId:'T1',newAssigneeId:'e2'}]};
  const changed = AutoPlanningService.apply([t1], rec);
  assert.equal(t1.assigneeId, 'e1');
  assert.equal(changed[0].assigneeId, 'e2');
});

test('Forecast produces isolated scenario deltas without mutating production allocations', () => {
  const e = employee('e1');
  const t = task('T1','2026-09-01','2026-09-30');
  const allocations:any[] = [{id:'a',taskId:'T1',employeeId:'e1',month:'2026-09',allocationDate:'2026-09-25',allocatedHours:40}];
  const baseline = ForecastService.build({startMonth:'2026-09',months:2,employees:[e],tasks:[t],allocations,absences:[],fixedAllocations:[],monthlyCapacities:[],settings});
  const scenario = ScenarioService.createDelayScenario({name:'delay',taskIds:['T1'],delayDays:10,tasks:[t],createdBy:'QA'});
  const simulated = ForecastService.build({startMonth:'2026-09',months:2,employees:[e],tasks:[t],allocations,absences:[],fixedAllocations:[],monthlyCapacities:[],settings,scenario});
  assert.equal(allocations[0].month, '2026-09');
  assert.equal(baseline[0].planned, 40);
  assert.equal(simulated[0].planned, 0);
  assert.equal(simulated[1].planned, 40);
});


test('Smart import treats business IDs as exact duplicates', () => {
  const rows = EntityExcelService.mapAndAnalyze('clients', [{ 'קוד לקוח':'C001', 'שם לקוח':'שם אחר' }], {
    tasks:[], employees:[], absences:[], clients:[{id:'c1',code:'C001',name:'לקוח קיים'}],
  });
  assert.equal(rows[0].duplicate?.risk, 'exact');
  assert.equal(rows[0].decision, 'skip');
});

test('Smart task duplicate does not flag same task name alone', () => {
  const existingTask = task('OLD','2026-08-01','2026-08-05',{taskNumber:'OLD',name:'אפיון',clientId:'c1',assigneeId:'e1',estimatedHours:20,deadline:'2026-08-05'});
  const rows = EntityExcelService.mapAndAnalyze('tasks', [{
    'שם משימה':'אפיון','קוד לקוח':'C2','מספר עובד':'2002','תאריך התחלה':'2026-10-01','תאריך סיום מתוכנן':'2026-10-15','דדליין':'2026-10-15','שעות משוערות':50,
  }], {
    tasks:[existingTask], employees:[employee('e2',{employeeNumber:'2002'})], clients:[{id:'c2',code:'C2',name:'לקוח 2'}], absences:[],
  });
  assert.equal(rows[0].duplicate, undefined);
});

test('Smart import detects duplicate rows inside the same file', () => {
  const existing = { tasks:[] as Task[], employees:[employee('e1',{employeeNumber:'1001'})], clients:[{id:'c1',code:'C1',name:'לקוח 1'}], absences:[] as any[] };
  const raw = { 'שם משימה':'בדיקות','קוד לקוח':'C1','מספר עובד':'1001','תאריך התחלה':'2026-09-20','תאריך סיום מתוכנן':'2026-09-30','דדליין':'2026-09-30','שעות משוערות':12 };
  const rows = EntityExcelService.mapAndAnalyze('tasks', [raw, {...raw}], existing);
  assert.equal(rows[0].duplicate, undefined);
  assert.equal(rows[1].duplicate?.risk, 'exact');
  assert.ok(rows[1].duplicate?.existingId.startsWith('import-row-'));
});


test('Smart import rejects task deadline earlier than planned end', () => {
  const rows = EntityExcelService.mapAndAnalyze('tasks', [{ 'שם משימה':'X','קוד לקוח':'C1','מספר עובד':'1001','תאריך התחלה':'2026-09-01','תאריך סיום מתוכנן':'2026-09-20','דדליין':'2026-09-10','שעות משוערות':10 }], {
    tasks:[], employees:[employee('e1',{employeeNumber:'1001'})], clients:[{id:'c1',code:'C1',name:'לקוח 1'}], absences:[],
  });
  assert.ok(rows[0].errors.some(e => e.includes('דדליין')));
});

test('Smart import rejects invalid absence range and non-positive hours', () => {
  const rows = EntityExcelService.mapAndAnalyze('absences', [{ 'מספר עובד':'1001','סוג היעדרות':'חופשה','תאריך התחלה':'2026-09-20','תאריך סיום':'2026-09-10','שעות':0 }], {
    tasks:[], employees:[employee('e1',{employeeNumber:'1001'})], clients:[], absences:[],
  });
  assert.ok(rows[0].errors.some(e => e.includes('מוקדם')));
  assert.ok(rows[0].errors.some(e => e.includes('גדולות מאפס')));
});

test('Import commit plan inserts a task and creates aligned import allocation', () => {
  const rows:any[] = [{ rowNumber:2, raw:{}, mapped:{name:'חדש',clientId:'c1',assigneeId:'e1',plannedStartDate:'2026-10-05',plannedEndDate:'2026-10-20',deadline:'2026-10-20',estimatedHours:18,remainingHours:18,status:'חדש',priority:'רגילה',isBillable:true}, errors:[], warnings:[], decision:'import' }];
  const plan = ImportCommitService.buildPlan('tasks', rows, {tasks:[],employees:[employee('e1')],clients:[{id:'c1',code:'C1',name:'C'}],absences:[],taskAllocations:[]}, 1000);
  assert.equal(plan.insertedCount, 1);
  assert.equal(plan.tasks.length, 1);
  assert.equal(plan.taskAllocations.length, 1);
  assert.equal(plan.taskAllocations[0].month, '2026-10');
  assert.equal(plan.taskAllocations[0].allocatedHours, 18);
});

test('Import update task replaces stale import allocation but preserves manual allocation', () => {
  const existing = task('T1','2026-09-01','2026-09-20',{remainingHours:20,assigneeId:'e1'});
  const rows:any[] = [{ rowNumber:2, raw:{}, mapped:{assigneeId:'e2',plannedStartDate:'2026-10-01',remainingHours:12}, errors:[], warnings:[], duplicate:{existingId:'T1',existingLabel:'T1',risk:'exact',score:100,matchedFields:['מספר משימה'],reason:'id'}, decision:'update' }];
  const plan = ImportCommitService.buildPlan('tasks', rows, {tasks:[existing],employees:[employee('e1'),employee('e2')],clients:[],absences:[],taskAllocations:[
    {id:'old-import',taskId:'T1',employeeId:'e1',month:'2026-09',allocatedHours:20,source:'import'},
    {id:'manual',taskId:'T1',employeeId:'e1',month:'2026-09',allocatedHours:3,source:'manual'},
  ]}, 2000);
  assert.equal(plan.updatedCount, 1);
  assert.equal(plan.tasks[0].assigneeId, 'e2');
  assert.equal(plan.taskAllocations.filter(a=>a.id==='old-import').length, 0);
  assert.equal(plan.taskAllocations.filter(a=>a.id==='manual').length, 1);
  const imported = plan.taskAllocations.find(a=>a.source==='import');
  assert.equal(imported?.employeeId, 'e2');
  assert.equal(imported?.month, '2026-10');
  assert.equal(imported?.allocatedHours, 12);
});

test('Import plan refuses update against a same-workbook duplicate row', () => {
  const rows:any[] = [{ rowNumber:3, raw:{}, mapped:{name:'X'}, errors:[], warnings:[], duplicate:{existingId:'import-row-2',existingLabel:'שורה 2',risk:'exact',score:100,matchedFields:['שם'],reason:'same file'}, decision:'update' }];
  assert.throws(() => ImportCommitService.buildPlan('clients', rows, {tasks:[],employees:[],clients:[],absences:[],taskAllocations:[]}, 3000), /אותו קובץ/);
});

test('Import plan skips invalid and skipped rows without mutating source arrays', () => {
  const clients:any[] = [{id:'c1',code:'C1',name:'קיים'}];
  const source = {tasks:[] as any[],employees:[] as any[],clients,absences:[] as any[],taskAllocations:[] as any[]};
  const rows:any[] = [
    {rowNumber:2,raw:{},mapped:{code:'C2',name:'חדש'},errors:[],warnings:[],decision:'import'},
    {rowNumber:3,raw:{},mapped:{code:'C3',name:'שגוי'},errors:['bad'],warnings:[],decision:'import'},
    {rowNumber:4,raw:{},mapped:{code:'C4',name:'דילוג'},errors:[],warnings:[],decision:'skip'},
  ];
  const plan = ImportCommitService.buildPlan('clients', rows, source, 4000);
  assert.equal(plan.clients.length, 2);
  assert.equal(clients.length, 1);
  assert.equal(plan.insertedCount, 1);
  assert.equal(plan.rejectedCount, 1);
  assert.equal(plan.skippedCount, 1);
});

const failed = results.filter((r) => !r.ok);
console.log(`\nCore regression: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);

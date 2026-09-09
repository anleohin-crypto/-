import { Absence, Client, Employee, ImportEntityType, Task, TaskAllocation } from '../types';
import { SmartImportRow } from './entityExcelService';

export interface ImportSourceData {
  tasks: Task[];
  employees: Employee[];
  clients: Client[];
  absences: Absence[];
  taskAllocations: TaskAllocation[];
}

export interface ImportCommitPlan extends ImportSourceData {
  selectedCount: number;
  insertedCount: number;
  updatedCount: number;
  forcedDuplicateCount: number;
  skippedCount: number;
  rejectedCount: number;
  messages: string[];
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const isWorkbookRowId = (id?: string) => !!id && id.startsWith('import-row-');

function ensureSelectedRows(rows: SmartImportRow[]): SmartImportRow[] {
  return rows.filter(r => r.errors.length === 0 && r.decision !== 'skip');
}

export const ImportCommitService = {
  buildPlan(type: ImportEntityType, rows: SmartImportRow[], source: ImportSourceData, now = Date.now()): ImportCommitPlan {
    const selected = ensureSelectedRows(rows);
    const out: ImportCommitPlan = {
      ...clone(source),
      selectedCount: selected.length,
      insertedCount: 0,
      updatedCount: 0,
      forcedDuplicateCount: 0,
      skippedCount: rows.filter(r => r.decision === 'skip').length,
      rejectedCount: rows.filter(r => r.errors.length > 0).length,
      messages: [],
    };

    const dateToday = new Date(now).toISOString().slice(0, 10);

    selected.forEach((r, i) => {
      // A duplicate that only refers to another row in the same workbook cannot update
      // the database because there is no persistent entity yet. It can only be skipped
      // or explicitly imported as a separate record.
      if (r.decision === 'update' && isWorkbookRowId(r.duplicate?.existingId)) {
        throw new Error(`שורה ${r.rowNumber}: לא ניתן "לעדכן קיים" מול שורה אחרת באותו קובץ. יש לבחור דלג או ייבא כרשומה חדשה.`);
      }

      if (r.duplicate && r.decision === 'import') out.forcedDuplicateCount++;

      if (type === 'clients') {
        const mapped = r.mapped as Partial<Client>;
        if (r.decision === 'update' && r.duplicate) {
          const index = out.clients.findIndex(x => x.id === r.duplicate!.existingId);
          if (index < 0) throw new Error(`שורה ${r.rowNumber}: הלקוח לעדכון כבר לא קיים במערכת`);
          out.clients[index] = { ...out.clients[index], ...mapped, id: out.clients[index].id } as Client;
          out.updatedCount++;
        } else {
          out.clients.push({ id:`cli-imp-${now}-${i}`, code:mapped.code || `IMP-${now}-${i}`, name:mapped.name || 'לקוח מיובא', isActive:mapped.isActive ?? true, ...mapped } as Client);
          out.insertedCount++;
        }
      }

      if (type === 'employees') {
        const mapped = r.mapped as Partial<Employee>;
        if (r.decision === 'update' && r.duplicate) {
          const index = out.employees.findIndex(x => x.id === r.duplicate!.existingId);
          if (index < 0) throw new Error(`שורה ${r.rowNumber}: העובד לעדכון כבר לא קיים במערכת`);
          out.employees[index] = { ...out.employees[index], ...mapped, id: out.employees[index].id } as Employee;
          out.updatedCount++;
        } else {
          out.employees.push({ id:`emp-imp-${now}-${i}`, name:mapped.name || 'עובד מיובא', role:mapped.role || 'עובד', jobPercentage:mapped.jobPercentage ?? 100, dailyWorkHours:mapped.dailyWorkHours ?? 9, weeklyWorkDays:mapped.weeklyWorkDays ?? 5, isActive:mapped.isActive ?? true, startDate:mapped.startDate || dateToday, ...mapped } as Employee);
          out.insertedCount++;
        }
      }

      if (type === 'absences') {
        const mapped = r.mapped as Partial<Absence>;
        if (r.decision === 'update' && r.duplicate) {
          const index = out.absences.findIndex(x => x.id === r.duplicate!.existingId);
          if (index < 0) throw new Error(`שורה ${r.rowNumber}: ההיעדרות לעדכון כבר לא קיימת במערכת`);
          out.absences[index] = { ...out.absences[index], ...mapped, id: out.absences[index].id } as Absence;
          out.updatedCount++;
        } else {
          out.absences.push({ id:`abs-imp-${now}-${i}`, employeeId:mapped.employeeId || '', type:(mapped.type as any) || 'חופשה', startDate:mapped.startDate || '', endDate:mapped.endDate || '', hours:mapped.hours ?? 0, isPlanned:mapped.isPlanned ?? true, ...mapped } as Absence);
          out.insertedCount++;
        }
      }

      if (type === 'tasks') {
        const mapped = r.mapped as Partial<Task>;
        let taskId = '';
        if (r.decision === 'update' && r.duplicate) {
          const index = out.tasks.findIndex(x => x.id === r.duplicate!.existingId);
          if (index < 0) throw new Error(`שורה ${r.rowNumber}: המשימה לעדכון כבר לא קיימת במערכת`);
          const old = out.tasks[index];
          taskId = old.id;
          out.tasks[index] = { ...old, ...mapped, id:old.id, taskNumber:old.taskNumber } as Task;
          out.updatedCount++;
        } else {
          taskId = `tsk-imp-${now}-${i}`;
          const task: Task = {
            id:taskId,
            taskNumber:mapped.taskNumber || `TSK-IMP-${now.toString().slice(-5)}-${i+1}`,
            name:mapped.name || 'משימה מיובאת', clientId:mapped.clientId || '', assigneeId:mapped.assigneeId || '',
            priority:(mapped.priority as any) || 'רגילה', createdAt:dateToday,
            plannedStartDate:mapped.plannedStartDate || dateToday,
            plannedEndDate:mapped.plannedEndDate || mapped.deadline || dateToday,
            deadline:mapped.deadline || mapped.plannedEndDate || dateToday,
            estimatedHours:mapped.estimatedHours ?? 0, actualHours:mapped.actualHours ?? 0,
            remainingHours:mapped.remainingHours ?? mapped.estimatedHours ?? 0,
            completionPercentage:mapped.completionPercentage ?? 0, status:mapped.status || 'חדש',
            isBillable:mapped.isBillable ?? true, ...mapped,
          };
          out.tasks.push(task);
          out.insertedCount++;
        }

        // Keep imported task capacity aligned with the imported assignee/start/remaining values.
        // Existing recurring/manual day-level allocations are preserved; only allocations whose
        // source is "import" are replaced.
        const finalTask = out.tasks.find(t => t.id === taskId)!;
        out.taskAllocations = out.taskAllocations.filter(a => !(a.taskId === taskId && a.source === 'import'));
        const remaining = Math.max(0, Number(finalTask.remainingHours || 0));
        if (remaining > 0 && finalTask.assigneeId && finalTask.plannedStartDate) {
          out.taskAllocations.push({
            id:`ta-imp-${now}-${i}`,
            taskId,
            employeeId:finalTask.assigneeId,
            month:finalTask.plannedStartDate.slice(0,7),
            allocatedHours:remaining,
            source:'import',
          });
        }
      }
    });

    out.messages.push(`נבחרו ${out.selectedCount} רשומות`, `${out.insertedCount} נוספו`, `${out.updatedCount} עודכנו`);
    if (out.forcedDuplicateCount) out.messages.push(`${out.forcedDuplicateCount} יובאו למרות חשד לכפילות`);
    if (out.rejectedCount) out.messages.push(`${out.rejectedCount} שורות שגויות לא נבחרו`);
    return out;
  },
};

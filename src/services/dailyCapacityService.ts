import { Absence, Employee, Task } from '../types';
import { generateOccurrenceDates } from './recurrenceService';

export interface DailyCapacityRisk {
  date: string;
  employeeId: string;
  employeeName: string;
  availableHours: number;
  scheduledHours: number;
  overHours: number;
  tasks: { taskId:string; taskNumber:string; name:string; hours:number }[];
  reason: string;
}

export function computeDailyCapacityRisks(month: string, employees: Employee[], tasks: Task[], absences: Absence[]): DailyCapacityRisk[] {
  const map = new Map<string, DailyCapacityRisk>();
  for (const task of tasks) {
    if (!task.recurrence || task.recurrence.mode === 'none') continue;
    const emp = employees.find(e=>e.id===task.assigneeId);
    if (!emp || !emp.isActive) continue;
    const dates = generateOccurrenceDates(task.recurrence).filter(d=>d.startsWith(month));
    for (const d of dates) {
      const key=`${emp.id}|${d}`;
      const absent = absences.some(a=>a.employeeId===emp.id && d>=a.startDate && d<=a.endDate);
      const available = absent ? 0 : (emp.dailyWorkHours || 9) * ((emp.jobPercentage || 100)/100);
      const current = map.get(key) || { date:d, employeeId:emp.id, employeeName:emp.name, availableHours:available, scheduledHours:0, overHours:0, tasks:[], reason: absent ? 'העובד בהיעדרות בתאריך זה' : '' };
      const hours=Math.max(0,task.recurrence.hoursPerOccurrence||0);
      current.scheduledHours += hours;
      current.tasks.push({taskId:task.id,taskNumber:task.taskNumber,name:task.name,hours});
      current.overHours=Math.max(0,current.scheduledHours-current.availableHours);
      if (current.overHours>0 && !current.reason) current.reason='השיבוץ היומי חורג משעות העבודה הזמינות';
      map.set(key,current);
    }
  }
  return [...map.values()].filter(x=>x.overHours>0 || x.reason).sort((a,b)=>a.date.localeCompare(b.date)||a.employeeName.localeCompare(b.employeeName));
}

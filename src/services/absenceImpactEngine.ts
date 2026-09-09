import {
  Employee,
  Task,
  TaskAllocation,
  Absence,
  AppSettings,
  AbsenceRequest,
  AbsenceImpactAnalysis,
  AbsenceRiskLevel,
} from '../types';
import { isTaskClosed } from './taskStatusHelper';

/**
 * Checks if a given date string (YYYY-MM-DD) is a weekend or holiday
 */
export function isNonWorkingDay(dateStr: string, settings?: AppSettings): boolean {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayOfWeek = d.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  
  // By default in Israel: Friday (5) and Saturday (6) are non-working days
  const workDays = settings?.workDaysOfWeek ?? [0, 1, 2, 3, 4];
  if (!workDays.includes(dayOfWeek)) {
    return true;
  }

  // Check shortened days marked as 0 hours (full holiday)
  if (settings?.shortenedDays) {
    const holiday = settings.shortenedDays.find((sd) => sd.date === dateStr);
    if (holiday && holiday.workingHours === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates number of actual working days between two dates (inclusive)
 */
export function calculateWorkingDaysBetween(
  startDateStr: string,
  endDateStr: string,
  settings?: AppSettings
): number {
  if (!startDateStr || !endDateStr) return 0;
  if (startDateStr > endDateStr) return 0;

  let count = 0;
  const curr = new Date(startDateStr + 'T12:00:00Z');
  const end = new Date(endDateStr + 'T12:00:00Z');

  while (curr <= end) {
    const yyyy = curr.getUTCFullYear();
    const mm = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(curr.getUTCDate()).padStart(2, '0');
    const dStr = `${yyyy}-${mm}-${dd}`;

    if (!isNonWorkingDay(dStr, settings)) {
      count++;
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return count;
}

/**
 * Evaluates whether two date ranges [s1, e1] and [s2, e2] overlap
 */
export function datesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 <= e2 && e1 >= s2;
}

/**
 * Real-time Absence Impact Analysis Engine
 * Calculates metrics, conflict checks, capacity changes, risk level, dynamic Hebrew executive summary,
 * viable alternative team members, and managerial recommendations.
 */
export function analyzeAbsenceImpact(params: {
  request: AbsenceRequest;
  employee: Employee;
  allEmployees: Employee[];
  tasks: Task[];
  taskAllocations: TaskAllocation[];
  existingAbsences: Absence[];
  settings?: AppSettings;
  targetMonth?: string;
}): AbsenceImpactAnalysis {
  const {
    request,
    employee,
    allEmployees,
    tasks,
    taskAllocations,
    existingAbsences,
    settings,
  } = params;

  const targetMonth = params.targetMonth || request.startDate.substring(0, 7);

  // 1. Calculate affected work days & hours deducted
  const affectedWorkDays = calculateWorkingDaysBetween(
    request.startDate,
    request.endDate,
    settings
  );

  let hoursDeducted = 0;
  if (request.partialDay && request.hours > 0) {
    hoursDeducted = request.hours;
  } else {
    const dailyHours = employee.dailyWorkHours || settings?.defaultDailyHours || 9;
    hoursDeducted = affectedWorkDays * dailyHours;
  }

  // 2. Compute Employee's capacity before & after
  // Base gross for standard month (approx 182h or calculated from days)
  const baseGross = (settings?.fixedMonthlyStandardHours || 182) * ((employee.jobPercentage || 100) / 100);
  
  // Existing absences for this employee in this month
  const currentMonthAbsences = existingAbsences.filter(
    (a) => a.employeeId === employee.id && a.startDate.startsWith(targetMonth)
  );
  const currentAbsenceHours = currentMonthAbsences.reduce((sum, a) => sum + (a.hours || 0), 0);

  const capacityBefore = Math.max(0, baseGross - currentAbsenceHours);
  const capacityAfter = Math.max(0, capacityBefore - hoursDeducted);

  // 3. Find Tasks assigned to employee and evaluate conflicts
  const employeeTasks = tasks.filter(
    (t) => t.assigneeId === employee.id && !isTaskClosed(t.status, settings)
  );

  // Task allocations for this employee in this month
  const empAllocations = taskAllocations.filter(
    (ta) => ta.employeeId === employee.id && ta.month === targetMonth
  );
  const totalAllocatedHours = empAllocations.reduce((acc, ta) => acc + (ta.allocatedHours || 0), 0);

  // Conflicting tasks: tasks overlapping the absence range
  const conflictingTasks = employeeTasks.filter((t) => {
    const taskStart = t.plannedStartDate || t.createdAt;
    const taskEnd = t.plannedEndDate || t.deadline;
    return datesOverlap(taskStart, taskEnd, request.startDate, request.endDate);
  });

  // Conflicting hours
  let conflictingTaskHours = 0;
  let billableImpactHours = 0;
  let nonBillableImpactHours = 0;

  for (const ct of conflictingTasks) {
    const alloc = empAllocations.find((a) => a.taskId === ct.id);
    const hrs = alloc ? alloc.allocatedHours : Math.min(ct.remainingHours || 0, 20);
    conflictingTaskHours += hrs;
    if (ct.isBillable) {
      billableImpactHours += hrs;
    } else {
      nonBillableImpactHours += hrs;
    }
  }

  // Deadlines inside absence period or within 3 days after
  const periodEndExtended = new Date(request.endDate + 'T12:00:00Z');
  periodEndExtended.setUTCDate(periodEndExtended.getUTCDate() + 3);
  const extEndStr = periodEndExtended.toISOString().split('T')[0];

  const deadlinesInPeriod = employeeTasks.filter(
    (t) => t.deadline >= request.startDate && t.deadline <= extEndStr
  );
  const deadlinesCount = deadlinesInPeriod.length;

  // Critical / High priority tasks affected
  const criticalTasks = conflictingTasks.filter(
    (t) => t.priority === 'קריטית' || t.priority === 'גבוהה'
  );

  // 4. Capacity utilization metrics
  const utilizationBefore = capacityBefore > 0 ? (totalAllocatedHours / capacityBefore) * 100 : 0;
  const utilizationAfter = capacityAfter > 0 ? (totalAllocatedHours / capacityAfter) * 100 : 999;
  const hasSufficientCapacity = capacityAfter >= totalAllocatedHours;
  const uncoveredHours = Math.max(0, totalAllocatedHours - capacityAfter);
  const idleImpactHours = Math.max(0, capacityAfter - totalAllocatedHours);

  // 5. Risk Assessment (LOW, MEDIUM, HIGH, CRITICAL)
  let riskLevel: AbsenceRiskLevel = 'LOW';
  if (
    (criticalTasks.length > 0 && deadlinesCount > 0) ||
    uncoveredHours > 25 ||
    utilizationAfter > 130
  ) {
    riskLevel = 'CRITICAL';
  } else if (
    conflictingTasks.length > 0 ||
    deadlinesCount > 0 ||
    uncoveredHours > 0 ||
    utilizationAfter > 105
  ) {
    riskLevel = 'HIGH';
  } else if (utilizationAfter > 90 || affectedWorkDays >= 3) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  // 6. Dynamic Hebrew Managerial Executive Summary
  const employeeName = employee.name || 'העובד';
  let managerSummary = `אישור ההיעדרות יפחית ${hoursDeducted} שעות מה-Capacity של ${employeeName} לחודש ${targetMonth} (${affectedWorkDays} ימי עבודה מושפעים). `;
  
  if (conflictingTasks.length > 0) {
    managerSummary += `קיימות ${conflictingTasks.length} משימות פעילות החופפות לתקופה (${Math.round(conflictingTaskHours)} שעות מתוכננות)`;
    if (criticalTasks.length > 0) {
      managerSummary += `, מתוכן ${criticalTasks.length} משימות קריטיות`;
    }
    if (deadlinesCount > 0) {
      managerSummary += ` ו-${deadlinesCount} דדליינים בסמיכות מיידית`;
    }
    managerSummary += `. `;
  } else {
    managerSummary += `לא זוהו משימות החופפות ישירות לתקופת ההיעדרות. `;
  }

  managerSummary += `שיעור הניצולת הצפוי לאחר האישור: ${Math.min(999, Math.round(utilizationAfter))}% `;
  if (uncoveredHours > 0) {
    managerSummary += `(יוצר חוסר כיסוי קיבולת של כ-${Math.round(uncoveredHours)} שעות - נדרש תיאום מחדש).`;
  } else {
    managerSummary += `(נותרת יתרת קיבולת פנויה של ${Math.round(idleImpactHours)} שעות).`;
  }

  // 7. Action Recommendations
  const recommendations: string[] = [];
  if (criticalTasks.length > 0) {
    recommendations.push(
      `מומלץ להעביר את המשימה הקריטית "${criticalTasks[0].name}" לחבר צוות מקביל כדי למנוע חריגה מדדליין.`
    );
  }
  if (deadlinesCount > 0) {
    recommendations.push(
      `קיימים ${deadlinesCount} דדליינים בימי ההיעדרות. מומלץ להקדים מסירה או לעדכן את הלקוח מראש.`
    );
  }
  if (uncoveredHours > 0) {
    recommendations.push(
      `שעות משימות חורגות מהקיבולת ב-${Math.round(uncoveredHours)} שעות. מומלץ לפצל משימות או לדחות משימות Non-Billable.`
    );
  }
  if (request.partialDay) {
    recommendations.push('ההיעדרות חלקית – העובד זמין בחלק מיום העבודה למענה או פגישות דחופות.');
  }
  if (recommendations.length === 0) {
    recommendations.push('ההיעדרות אינה מסכנת אבני דרך. ניתן לאשר ללא צורך בהתאמות מיוחדות.');
  }

  // 8. Team Availability & Replacement Candidates Analysis
  const availableColleagues = allEmployees
    .filter((e) => e.id !== employee.id && e.isActive)
    .map((colleague) => {
      // Find colleague's allocated hours in target month
      const colAllocations = taskAllocations.filter(
        (ta) => ta.employeeId === colleague.id && ta.month === targetMonth
      );
      const colAllocatedHours = colAllocations.reduce((acc, ta) => acc + (ta.allocatedHours || 0), 0);
      const colGross = (settings?.fixedMonthlyStandardHours || 182) * ((colleague.jobPercentage || 100) / 100);
      const colAbsences = existingAbsences.filter(
        (a) => a.employeeId === colleague.id && a.startDate.startsWith(targetMonth)
      );
      const colAbsenceHours = colAbsences.reduce((sum, a) => sum + (a.hours || 0), 0);
      const colNet = Math.max(0, colGross - colAbsenceHours);
      const colFree = Math.max(0, colNet - colAllocatedHours);
      const colUtil = colNet > 0 ? (colAllocatedHours / colNet) * 100 : 0;

      // Check if candidate is viable
      const isViableCandidate = colFree >= 15 && colUtil < 90;
      let reason = '';
      if (colFree >= 30) {
        reason = `זמינות גבוהה (${Math.round(colFree)} שעות פנויות, ${Math.round(colUtil)}% ניצולת)`;
      } else if (isViableCandidate) {
        reason = `זמינות מתונה (${Math.round(colFree)} שעות פנויות)`;
      } else {
        reason = `עומס מלא / ללא קיבולת (${Math.round(colUtil)}% ניצולת)`;
      }

      return {
        employeeId: colleague.id,
        employeeName: colleague.name,
        role: colleague.role,
        freeCapacity: Math.round(colFree),
        utilization: Math.round(colUtil),
        isViableCandidate,
        reason,
      };
    })
    .sort((a, b) => b.freeCapacity - a.freeCapacity);

  return {
    affectedWorkDays,
    hoursDeducted,
    capacityBefore: Math.round(capacityBefore),
    capacityAfter: Math.round(capacityAfter),
    utilizationBefore: Math.round(utilizationBefore),
    utilizationAfter: Math.round(utilizationAfter),
    conflictingTaskHours: Math.round(conflictingTaskHours),
    conflictingTasksCount: conflictingTasks.length,
    deadlinesCount,
    criticalTasks,
    hasSufficientCapacity,
    uncoveredHours: Math.round(uncoveredHours),
    billableImpactHours: Math.round(billableImpactHours),
    nonBillableImpactHours: Math.round(nonBillableImpactHours),
    idleImpactHours: Math.round(idleImpactHours),
    riskLevel,
    managerSummary,
    recommendations,
    availableColleagues,
  };
}

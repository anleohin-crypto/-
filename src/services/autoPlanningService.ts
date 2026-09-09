import { Employee, PlanningIssue, PlanningRecommendation, Task, TaskAllocation, TeamCapacityMetrics } from '../types';
import { CriticalPathService } from './criticalPathService';
import { DependencyService } from './dependencyService';

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const durationDays = (task: Task) => Math.max(0, Math.round((new Date(task.plannedEndDate).getTime() - new Date(task.plannedStartDate).getTime()) / 86400000));

export const AutoPlanningService = {
  suggest(params: {
    issues: PlanningIssue[];
    tasks: Task[];
    employees: Employee[];
    allocations: TaskAllocation[];
    teamMetrics: TeamCapacityMetrics;
  }): PlanningRecommendation[] {
    const { issues, tasks, employees, teamMetrics } = params;
    const metricsByEmployee = new Map(teamMetrics.employeeMetrics.map((m) => [m.employeeId, m]));
    const recommendations: PlanningRecommendation[] = [];
    const criticalPath = CriticalPathService.calculate(tasks);
    const criticalIds = new Set(criticalPath.criticalTaskIds);
    const allDependencies = DependencyService.getAll(tasks);
    const dependencyDegree = new Map<string, number>();
    for (const d of allDependencies) {
      dependencyDegree.set(d.predecessorTaskId, (dependencyDegree.get(d.predecessorTaskId) || 0) + 1);
      dependencyDegree.set(d.successorTaskId, (dependencyDegree.get(d.successorTaskId) || 0) + 1);
    }

    for (const issue of issues) {
      if (issue.type === 'overload' && issue.targetId) {
        const overloaded = metricsByEmployee.get(issue.targetId);
        if (!overloaded) continue;
        const candidateTasks = tasks
          .filter((t) => t.assigneeId === issue.targetId && t.planningStatus !== 'draft' && !['הושלם', 'בוטל'].includes(t.status))
          .sort((a, b) => {
            // Prefer the least disruptive move: non-critical, fewer dependencies, lower priority.
            const aCritical = criticalIds.has(a.id) ? 1 : 0;
            const bCritical = criticalIds.has(b.id) ? 1 : 0;
            if (aCritical !== bCritical) return aCritical - bCritical;
            const aDeps = dependencyDegree.get(a.id) || 0;
            const bDeps = dependencyDegree.get(b.id) || 0;
            if (aDeps !== bDeps) return aDeps - bDeps;
            const aPriority = a.priority === 'קריטית' ? 2 : a.priority === 'גבוהה' ? 1 : 0;
            const bPriority = b.priority === 'קריטית' ? 2 : b.priority === 'גבוהה' ? 1 : 0;
            return aPriority - bPriority || b.remainingHours - a.remainingHours;
          });
        const recipients = employees
          .filter((e) => e.id !== issue.targetId && e.isActive)
          .map((e) => ({ employee: e, metric: metricsByEmployee.get(e.id) }))
          .filter((x) => x.metric && x.metric.freeCapacity > 0)
          .sort((a, b) => {
            // Prefer a worker whose primary client matches the task before raw free capacity.
            const taskForFit = candidateTasks[0];
            const aFit = taskForFit && a.employee.primaryClientId === taskForFit.clientId ? 1 : 0;
            const bFit = taskForFit && b.employee.primaryClientId === taskForFit.clientId ? 1 : 0;
            return bFit - aFit || (b.metric?.freeCapacity || 0) - (a.metric?.freeCapacity || 0);
          });
        const task = candidateTasks[0];
        const recipient = recipients[0];
        if (task && recipient?.metric) {
          const isCriticalPath = criticalIds.has(task.id);
          const dependencyCount = dependencyDegree.get(task.id) || 0;
          const disruptionNote = isCriticalPath
            ? ' המשימה נמצאת ב-Critical Path ולכן נדרש אישור זהיר במיוחד.'
            : dependencyCount > 0 ? ` למשימה ${dependencyCount} קשרי Dependency שיש לבדוק ב-Impact.` : '';
          const movable = Math.min(task.remainingHours, overloaded.overAllocationHours, recipient.metric.freeCapacity);
          const canMoveWholeTask = recipient.metric.freeCapacity >= task.remainingHours;
          if (canMoveWholeTask) {
            recommendations.push({
              id: `reassign-${issue.id}-${task.id}-${recipient.employee.id}`,
              issueId: issue.id,
              action: 'reassign_task',
              title: `העבר את ${task.taskNumber} ל-${recipient.employee.name}`,
              rationale: `${overloaded.employeeName} נמצא בחריגה של ${overloaded.overAllocationHours.toFixed(1)} שעות, ול-${recipient.employee.name} קיימות ${recipient.metric.freeCapacity.toFixed(1)} שעות פנויות.`,
              impact: `העברה מלאה של המשימה (${task.remainingHours.toFixed(1)} שעות שנותרו) תפחית עומס אצל ${overloaded.employeeName}. התאמה מקצועית עדיין דורשת אישור מנהל.${disruptionNote}`,

              score: Math.max(1, Math.min(100, Math.round(65 + Math.min(25, task.remainingHours) - (isCriticalPath ? 25 : 0) - Math.min(15, dependencyCount * 3)))),
              changes: [{ taskId: task.id, taskNumber: task.taskNumber, taskName: task.name, oldAssigneeId: task.assigneeId, newAssigneeId: recipient.employee.id, hoursMoved: task.remainingHours }],
              requiresApproval: true,
            });
          } else if (movable > 0) {
            recommendations.push({
              id: `split-${issue.id}-${task.id}-${recipient.employee.id}`,
              issueId: issue.id,
              action: 'split_task',
              title: `פצל ${movable.toFixed(1)} שעות מ-${task.taskNumber} ל-${recipient.employee.name}`,
              rationale: `${recipient.employee.name} אינו יכול לקלוט את כל המשימה, אך קיימות לו ${recipient.metric.freeCapacity.toFixed(1)} שעות פנויות. פיצול מצמצם את החריגה במינימום שינוי לתוכנית.`,
              impact: `תיווצר משימת-בת חדשה באותו לקוח/פרויקט עם ${movable.toFixed(1)} שעות, והיתרה תישאר אצל ${overloaded.employeeName}. לא יימחקו שעות שכבר בוצעו.${disruptionNote}`,

              score: Math.max(1, Math.min(100, Math.round(55 + Math.min(30, movable) - (isCriticalPath ? 20 : 0) - Math.min(12, dependencyCount * 2)))),
              changes: [{ taskId: task.id, taskNumber: task.taskNumber, taskName: task.name, oldAssigneeId: task.assigneeId, splitToEmployeeId: recipient.employee.id, splitHours: movable, hoursMoved: movable }],
              requiresApproval: true,
            });
          }
        } else if (task) {
          const shift = Math.max(1, Math.ceil(overloaded.overAllocationHours / Math.max(1, task.remainingHours) * 5));
          const shiftedTask: Task = { ...task, plannedStartDate: addDays(task.plannedStartDate, shift), plannedEndDate: addDays(task.plannedEndDate, shift) };
          const simulatedTasks = tasks.map((t) => t.id === task.id ? shiftedTask : t);
          const cascade = DependencyService.proposeCascade(simulatedTasks, task.id);
          const cascadeChanges = cascade.map((c) => {
            const original = tasks.find((t) => t.id === c.taskId);
            return {
              taskId: c.taskId,
              taskNumber: original?.taskNumber,
              taskName: original?.name,
              oldStartDate: original?.plannedStartDate,
              newStartDate: c.plannedStartDate,
              oldEndDate: original?.plannedEndDate,
              newEndDate: c.plannedEndDate,
            };
          });
          recommendations.push({
            id: `shift-${issue.id}-${task.id}`,
            issueId: issue.id,
            action: 'shift_dates',
            title: `דחה את ${task.taskNumber} ב-${shift} ימים`,
            rationale: 'לא נמצא עובד חלופי עם קיבולת פנויה מספקת, ולכן מוצעת הזזה מינימלית של משימה שאינה קריטית.',
            impact: `תאריך הסיום יעבור מ-${task.plannedEndDate} ל-${addDays(task.plannedEndDate, shift)}.${cascadeChanges.length ? ` השינוי מחייב הזזה של ${cascadeChanges.length} משימות תלויות.` : ''} ${criticalIds.has(task.id) ? 'המשימה נמצאת ב-Critical Path; ' : ''}כל שרשרת ההשפעה מוצגת לפני אישור.`,
            score: Math.max(10, 50 - (criticalIds.has(task.id) ? 25 : 0) - Math.min(15, (dependencyDegree.get(task.id) || 0) * 3) - Math.min(20, cascadeChanges.length * 4)),
            changes: [{ taskId: task.id, taskNumber: task.taskNumber, taskName: task.name, oldStartDate: task.plannedStartDate, newStartDate: shiftedTask.plannedStartDate, oldEndDate: task.plannedEndDate, newEndDate: shiftedTask.plannedEndDate }, ...cascadeChanges],
            requiresApproval: true,
          });
        }
      }

      if ((issue.type === 'deadline_risk' || issue.type === 'dependency_block') && issue.relatedTaskIds?.length) {
        const task = tasks.find((t) => t.id === issue.relatedTaskIds![0]);
        if (!task) continue;
        const days = Math.max(1, Math.min(7, durationDays(task) || 1));
        recommendations.push({
          id: `priority-${issue.id}-${task.id}`,
          issueId: issue.id,
          action: 'change_priority',
          title: `העלה עדיפות ל-${task.taskNumber}`,
          rationale: issue.type === 'deadline_risk' ? 'המשימה בסיכון לעמוד בדדליין.' : 'תלות חוסמת את שרשרת התכנון.',
          impact: `המלצה ניהולית בלבד. אין שינוי אוטומטי בתוכנית; ניתן לשלב עם הזזה או הקצאה מחדש לאחר בדיקת Impact. חלון טיפול מומלץ: ${days} ימים.`,
          score: issue.severity === 'critical' ? 90 : 70,
          changes: [{ taskId: task.id, taskNumber: task.taskNumber, taskName: task.name }],
          requiresApproval: true,
        });
      }
    }

    const unique = new Map<string, PlanningRecommendation>();
    recommendations.forEach((r) => unique.set(r.id, r));
    return [...unique.values()].sort((a, b) => b.score - a.score);
  },

  apply(tasks: Task[], recommendation: PlanningRecommendation): Task[] {
    const byId = new Map(recommendation.changes.map((c) => [c.taskId, c]));
    return tasks.map((task) => {
      const c = byId.get(task.id);
      if (!c || recommendation.action === 'split_task') return task;
      return {
        ...task,
        assigneeId: c.newAssigneeId || task.assigneeId,
        plannedStartDate: c.newStartDate || task.plannedStartDate,
        plannedEndDate: c.newEndDate || task.plannedEndDate,
        priority: recommendation.action === 'change_priority' && task.priority !== 'קריטית' ? 'גבוהה' : task.priority,
        dateChangeReason: c.newStartDate || c.newEndDate ? `Auto Planning Recommendation: ${recommendation.title}` : task.dateChangeReason,
      };
    });
  },
};

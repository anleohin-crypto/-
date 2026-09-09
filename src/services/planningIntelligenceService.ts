import { Absence, Employee, PlanningIssue, Task, TaskAllocation, TeamCapacityMetrics } from '../types';
import { DependencyService } from './dependencyService';

const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
const isClosedStatus = (status: string) => ['הושלם', 'בוטל', 'completed', 'cancelled', 'status-completed', 'status-cancelled'].includes(status);

export interface PlanningIntelligenceInput {
  tasks: Task[];
  employees: Employee[];
  allocations: TaskAllocation[];
  absences: Absence[];
  teamMetrics: TeamCapacityMetrics;
  upcomingDeadlineDays?: number;
}

export const PlanningIntelligenceService = {
  analyze(input: PlanningIntelligenceInput): PlanningIssue[] {
    const now = today();
    const issues: PlanningIssue[] = [];
    const add = (issue: Omit<PlanningIssue, 'id' | 'createdAt'>) => {
      const stable = `${issue.type}-${issue.targetType}-${issue.targetId || 'team'}-${(issue.relatedTaskIds || []).join(',')}`;
      issues.push({ ...issue, id: stable, createdAt: new Date().toISOString() });
    };

    for (const em of input.teamMetrics.employeeMetrics) {
      if (em.overAllocationHours > 0) {
        add({
          type: 'overload', severity: em.utilizationPercentage >= 110 ? 'critical' : 'warning',
          title: `${em.employeeName} בעומס יתר`,
          problem: `קיימת חריגה של ${em.overAllocationHours.toFixed(1)} שעות.`,
          cause: `${em.totalAllocatedHours.toFixed(1)} שעות משובצות מול ${em.netCapacity.toFixed(1)} שעות קיבולת נטו.`,
          impact: `ניצולת של ${em.utilizationPercentage.toFixed(1)}% עלולה לגרום לדחיית משימות או שעות נוספות.`,
          recommendation: 'בחן הזזת משימות, העברת עבודה לעובד פנוי או שינוי עדיפויות.',
          targetType: 'employee', targetId: em.employeeId,
          relatedTaskIds: em.contributingTasks.map((t) => t.id), metricValue: em.overAllocationHours,
        });
      } else if (em.netCapacity > 0 && em.utilizationPercentage < 60) {
        add({
          type: 'underutilization', severity: 'info', title: `${em.employeeName} עם קיבולת פנויה`,
          problem: `ניצולת של ${em.utilizationPercentage.toFixed(1)}% בלבד.`,
          cause: `${em.freeCapacity.toFixed(1)} שעות פנויות בתקופה הנבחרת.`,
          impact: 'ייתכן שניתן להעביר אליו עבודה מעובדים עמוסים.',
          recommendation: 'בחן העברת משימות מתאימות או הקדמת עבודה מתוכננת.',
          targetType: 'employee', targetId: em.employeeId, metricValue: em.freeCapacity,
        });
      }
    }

    for (const task of input.tasks.filter((t) => !isClosedStatus(t.status))) {
      if (task.deadline && task.deadline < now) {
        add({
          type: 'overdue', severity: 'critical', title: `משימה באיחור: ${task.name}`,
          problem: `ה-Deadline ${task.deadline} כבר עבר.`,
          cause: `נותרו ${task.remainingHours.toFixed(1)} שעות לביצוע.`,
          impact: 'המשימה כבר חורגת מהתכנון.',
          recommendation: 'עדכן תכנון, הקצה קיבולת או תעד סיבת דחייה.',
          targetType: 'task', targetId: task.id, relatedTaskIds: [task.id], metricValue: task.remainingHours,
        });
      } else if (task.deadline) {
        const days = daysBetween(now, task.deadline);
        const emp = input.teamMetrics.employeeMetrics.find((e) => e.employeeId === task.assigneeId);
        if (days <= (input.upcomingDeadlineDays || 7) && task.remainingHours > Math.max(0, emp?.freeCapacity || 0)) {
          add({
            type: 'deadline_risk', severity: days <= 2 ? 'critical' : 'warning', title: `Deadline בסיכון: ${task.name}`,
            problem: `נותרו ${task.remainingHours.toFixed(1)} שעות עד ${task.deadline}.`,
            cause: `הקיבולת הפנויה של העובד בתקופה היא כ-${Math.max(0, emp?.freeCapacity || 0).toFixed(1)} שעות.`,
            impact: `קיים סיכון שהמשימה לא תושלם בתוך ${days} ימים.`,
            recommendation: 'בחן תגבור, שינוי הקצאה או הקדמת משימות אחרות.',
            targetType: 'task', targetId: task.id, relatedTaskIds: [task.id], metricValue: task.remainingHours,
          });
        }
      }

      if (task.estimatedHours > 0 && task.actualHours > task.estimatedHours * 1.25 && task.completionPercentage < 80) {
        add({
          type: 'planned_actual_variance', severity: 'warning', title: `חריגת שעות: ${task.name}`,
          problem: `נצרכו ${task.actualHours.toFixed(1)} שעות מול תכנון של ${task.estimatedHours.toFixed(1)} שעות.`,
          cause: `אחוז הביצוע עדיין ${task.completionPercentage}%.`,
          impact: 'קצב צריכת השעות גבוה מהמתוכנן ועלול להשפיע על הקיבולת וה-Deadline.',
          recommendation: 'בדוק את יתרת העבודה והערך מחדש את האומדן.',
          targetType: 'task', targetId: task.id, relatedTaskIds: [task.id], metricValue: task.actualHours - task.estimatedHours,
        });
      }
    }

    for (const a of input.absences) {
      if (a.endDate < now) continue;
      const conflicting = input.tasks.filter((t) => !isClosedStatus(t.status) && t.assigneeId === a.employeeId && t.plannedStartDate <= a.endDate && t.plannedEndDate >= a.startDate);
      if (conflicting.length) {
        const emp = input.employees.find((e) => e.id === a.employeeId);
        add({
          type: 'absence_conflict', severity: 'warning', title: `התנגשות היעדרות: ${emp?.name || a.employeeId}`,
          problem: `${conflicting.length} משימות חופפות להיעדרות ${a.startDate}–${a.endDate}.`,
          cause: 'העובד אינו זמין בחלק מתקופת התכנון של המשימות.',
          impact: `כ-${a.hours} שעות קיבולת יורדות מהתכנון.`,
          recommendation: 'בדוק הזזת משימות או העברתן לעובד אחר לפני אישור התכנון.',
          targetType: 'employee', targetId: a.employeeId, relatedTaskIds: conflicting.map((t) => t.id), metricValue: a.hours,
        });
      }
    }

    for (const item of DependencyService.analyze(input.tasks)) {
      if (!item.valid || item.blocked) {
        add({
          type: 'dependency_block', severity: 'critical', title: 'תלות בין משימות אינה מתקיימת',
          problem: item.reason || 'קיימת תלות חסומה.',
          cause: item.valid ? `${item.predecessor?.name} → ${item.successor?.name}` : 'Dependency מפנה למשימה שאינה קיימת.',
          impact: 'שרשרת התכנון אינה עקבית ועלולה להציג תאריכים לא אפשריים.',
          recommendation: 'תקן את תאריך המשימה התלויה או את הגדרת ה-Dependency.',
          targetType: 'task', targetId: item.valid ? item.successor?.id : undefined,
          relatedTaskIds: item.valid ? [item.predecessor!.id, item.successor!.id] : undefined,
        });
      }
    }

    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return issues.sort((a, b) => rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title, 'he'));
  },
};

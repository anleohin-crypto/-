import { PlanningBaseline, Task, TaskAllocation } from '../types';

export const BaselineService = {
  createBaseline(params: {
    name: string;
    description?: string;
    createdBy: string;
    scope?: PlanningBaseline['scope'];
    scopeId?: string;
    tasks: Task[];
    allocations: TaskAllocation[];
  }): PlanningBaseline {
    const scope = params.scope || 'all';
    const scopedTasks = params.tasks.filter((task) => {
      if (scope === 'all') return true;
      if (scope === 'client') return task.clientId === params.scopeId;
      if (scope === 'project') return task.projectId === params.scopeId;
      if (scope === 'employee') return task.assigneeId === params.scopeId;
      return true;
    });

    return {
      id: `baseline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: params.name.trim() || `Baseline ${new Date().toLocaleDateString('he-IL')}`,
      description: params.description?.trim() || undefined,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
      scope,
      scopeId: params.scopeId,
      tasks: scopedTasks.map((task) => ({
        taskId: task.id,
        taskNumber: task.taskNumber,
        name: task.name,
        clientId: task.clientId,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        status: task.status,
        plannedStartDate: task.plannedStartDate,
        plannedEndDate: task.plannedEndDate,
        deadline: task.deadline,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        remainingHours: task.remainingHours,
        allocations: params.allocations
          .filter((a) => a.taskId === task.id)
          .map((a) => ({ month: a.month, hours: a.allocatedHours, allocationDate: a.allocationDate })),
      })),
    };
  },

  compareTask(baseline: PlanningBaseline, task: Task) {
    const original = baseline.tasks.find((x) => x.taskId === task.id);
    if (!original) return null;
    const dayMs = 86400000;
    const dateVariance = Math.round((new Date(task.plannedEndDate).getTime() - new Date(original.plannedEndDate).getTime()) / dayMs);
    const hoursVariance = task.estimatedHours - original.estimatedHours;
    const hoursVariancePct = original.estimatedHours ? (hoursVariance / original.estimatedHours) * 100 : 0;
    return {
      original,
      current: task,
      startDateChanged: original.plannedStartDate !== task.plannedStartDate,
      endDateChanged: original.plannedEndDate !== task.plannedEndDate,
      assigneeChanged: original.assigneeId !== task.assigneeId,
      statusChanged: original.status !== task.status,
      dateVarianceDays: dateVariance,
      hoursVariance,
      hoursVariancePct,
      plannedVsActualHours: task.actualHours - task.estimatedHours,
    };
  },
};

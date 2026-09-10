import { PlanningScenario, Task, TaskAllocation } from '../types';

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const monthDiff = (fromDate: string, toDate: string) => {
  const f = new Date(`${fromDate}T12:00:00`);
  const t = new Date(`${toDate}T12:00:00`);
  return (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth());
};

const shiftMonth = (month: string, offset: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const shiftDate = (date: string | undefined, days: number) => date ? addDays(date, days) : date;

export const ScenarioService = {
  createDelayScenario(params: {
    name: string;
    taskIds: string[];
    delayDays: number;
    tasks: Task[];
    createdBy: string;
  }): PlanningScenario {
    const taskSet = new Set(params.taskIds);
    return {
      id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: params.name,
      description: `דחייה של ${params.delayDays} ימים עבור ${params.taskIds.length} משימות`,
      createdAt: new Date().toISOString(),
      createdBy: params.createdBy,
      changes: params.tasks
        .filter((t) => taskSet.has(t.id))
        .map((task) => ({
          taskId: task.id,
          plannedStartDate: addDays(task.plannedStartDate, params.delayDays),
          plannedEndDate: addDays(task.plannedEndDate, params.delayDays),
        })),
    };
  },

  applyToTasks(tasks: Task[], scenario?: PlanningScenario): Task[] {
    if (!scenario) return tasks;
    const changes = new Map(scenario.changes.map((c) => [c.taskId, c]));
    return tasks.map((task) => {
      const change = changes.get(task.id);
      return change ? { ...task, ...change } : task;
    });
  },

  applyToAllocations(tasks: Task[], allocations: TaskAllocation[], scenario?: PlanningScenario): TaskAllocation[] {
    if (!scenario) return allocations;
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const changes = new Map(scenario.changes.map((c) => [c.taskId, c]));

    return allocations.map((allocation) => {
      const change = changes.get(allocation.taskId);
      const task = taskById.get(allocation.taskId);
      if (!change || !task) return allocation;

      const nextStart = change.plannedStartDate || task.plannedStartDate;
      const offsetMonths = monthDiff(task.plannedStartDate, nextStart);
      const dayOffset = Math.round((new Date(`${nextStart}T12:00:00`).getTime() - new Date(`${task.plannedStartDate}T12:00:00`).getTime()) / 86400000);
      const nextEstimated = change.estimatedHours ?? task.estimatedHours;
      const factor = task.estimatedHours > 0 ? nextEstimated / task.estimatedHours : 1;
      const shiftedAllocationDate = allocation.allocationDate ? shiftDate(allocation.allocationDate, dayOffset) : undefined;

      return {
        ...allocation,
        employeeId: change.assigneeId || allocation.employeeId,
        // Day-level allocations must move by the exact scenario delta. Derive the month
        // from the shifted date so a within-month task shift that pushes an occurrence
        // across a month boundary is represented correctly in Forecast/Capacity.
        month: shiftedAllocationDate ? shiftedAllocationDate.slice(0, 7) : (offsetMonths ? shiftMonth(allocation.month, offsetMonths) : allocation.month),
        allocationDate: shiftedAllocationDate,
        allocatedHours: Math.max(0, allocation.allocatedHours * factor),
      };
    });
  },
};

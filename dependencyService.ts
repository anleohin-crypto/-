import { Task, TaskDependency } from '../types';

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const maxDate = (a: string, b: string) => (a >= b ? a : b);

export const DependencyService = {
  getAll(tasks: Task[]): TaskDependency[] {
    const richer = tasks.flatMap((t) => t.dependencies || []);
    const legacy = tasks.flatMap((t) => (t.dependencyIds || []).map((predecessorTaskId, index) => ({
      id: `legacy-${t.id}-${predecessorTaskId}-${index}`,
      predecessorTaskId,
      successorTaskId: t.id,
      type: 'FS' as const,
      lagDays: 0,
      createdAt: t.createdAt || new Date().toISOString(),
    })));
    const byKey = new Map<string, TaskDependency>();
    [...legacy, ...richer].forEach((d) => byKey.set(`${d.predecessorTaskId}|${d.successorTaskId}|${d.type}`, d));
    return [...byKey.values()];
  },

  wouldCreateCycle(tasks: Task[], candidate: Omit<TaskDependency, 'id' | 'createdAt'>): boolean {
    if (candidate.predecessorTaskId === candidate.successorTaskId) return true;
    const edges = this.getAll(tasks)
      .filter((d) => !(d.predecessorTaskId === candidate.predecessorTaskId && d.successorTaskId === candidate.successorTaskId))
      .map((d) => [d.predecessorTaskId, d.successorTaskId] as const);
    edges.push([candidate.predecessorTaskId, candidate.successorTaskId]);
    const graph = new Map<string, string[]>();
    edges.forEach(([a, b]) => graph.set(a, [...(graph.get(a) || []), b]));
    const seen = new Set<string>();
    const stack = new Set<string>();
    const visit = (id: string): boolean => {
      if (stack.has(id)) return true;
      if (seen.has(id)) return false;
      seen.add(id); stack.add(id);
      for (const n of graph.get(id) || []) if (visit(n)) return true;
      stack.delete(id);
      return false;
    };
    return [...graph.keys()].some(visit);
  },

  constraintDate(dep: TaskDependency, predecessor: Task): { field: 'start' | 'end'; minDate: string } {
    const lag = dep.lagDays || 0;
    if (dep.type === 'FS') return { field: 'start', minDate: addDays(predecessor.plannedEndDate, lag) };
    if (dep.type === 'SS') return { field: 'start', minDate: addDays(predecessor.plannedStartDate, lag) };
    if (dep.type === 'FF') return { field: 'end', minDate: addDays(predecessor.plannedEndDate, lag) };
    return { field: 'end', minDate: addDays(predecessor.plannedStartDate, lag) };
  },

  analyze(tasks: Task[]) {
    const byId = new Map(tasks.map((t) => [t.id, t]));
    return this.getAll(tasks).map((dep) => {
      const predecessor = byId.get(dep.predecessorTaskId);
      const successor = byId.get(dep.successorTaskId);
      if (!predecessor || !successor) return { dep, valid: false, blocked: true, reason: 'משימה מקדימה או תלויה אינה קיימת' };
      const c = this.constraintDate(dep, predecessor);
      const actual = c.field === 'start' ? successor.plannedStartDate : successor.plannedEndDate;
      const blocked = actual < c.minDate;
      return { dep, predecessor, successor, valid: true, blocked, constraint: c, actualDate: actual, reason: blocked ? `נדרש ${c.field === 'start' ? 'תאריך התחלה' : 'תאריך סיום'} ${c.minDate} או מאוחר יותר` : undefined };
    });
  },

  proposeCascade(tasks: Task[], changedTaskId: string): { taskId: string; plannedStartDate: string; plannedEndDate: string; reason: string }[] {
    const byId = new Map(tasks.map((t) => [t.id, { ...t }]));
    const deps = this.getAll(tasks);
    const result: { taskId: string; plannedStartDate: string; plannedEndDate: string; reason: string }[] = [];
    const queue = [changedTaskId];
    const visited = new Set<string>();
    while (queue.length) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      for (const dep of deps.filter((d) => d.predecessorTaskId === currentId)) {
        const pre = byId.get(dep.predecessorTaskId); const suc = byId.get(dep.successorTaskId);
        if (!pre || !suc) continue;
        const c = this.constraintDate(dep, pre);
        const duration = Math.max(0, Math.round((new Date(suc.plannedEndDate).getTime() - new Date(suc.plannedStartDate).getTime()) / 86400000));
        let start = suc.plannedStartDate; let end = suc.plannedEndDate;
        if (c.field === 'start' && start < c.minDate) { start = maxDate(start, c.minDate); end = addDays(start, duration); }
        if (c.field === 'end' && end < c.minDate) { const delta = Math.round((new Date(c.minDate).getTime() - new Date(end).getTime()) / 86400000); end = c.minDate; start = addDays(start, delta); }
        if (start !== suc.plannedStartDate || end !== suc.plannedEndDate) {
          byId.set(suc.id, { ...suc, plannedStartDate: start, plannedEndDate: end });
          result.push({ taskId: suc.id, plannedStartDate: start, plannedEndDate: end, reason: `${dep.type} + ${dep.lagDays || 0} ימים` });
          queue.push(suc.id);
        }
      }
    }
    return result;
  },
};

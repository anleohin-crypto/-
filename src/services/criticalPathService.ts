import { CriticalPathTask, Task } from '../types';
import { DependencyService } from './dependencyService';

const day = (d: string) => Math.floor(new Date(`${d}T12:00:00`).getTime() / 86400000);

export const CriticalPathService = {
  calculate(tasks: Task[]): { tasks: CriticalPathTask[]; criticalTaskIds: string[]; hasCycle: boolean } {
    const active = tasks.filter((t) => !['בוטל', 'הושלם'].includes(t.status));
    const ids = new Set(active.map((t) => t.id));
    const deps = DependencyService.getAll(active).filter((d) => ids.has(d.predecessorTaskId) && ids.has(d.successorTaskId));
    const incoming = new Map<string, typeof deps>();
    const outgoing = new Map<string, typeof deps>();
    const indegree = new Map(active.map((t) => [t.id, 0]));
    deps.forEach((d) => {
      incoming.set(d.successorTaskId, [...(incoming.get(d.successorTaskId) || []), d]);
      outgoing.set(d.predecessorTaskId, [...(outgoing.get(d.predecessorTaskId) || []), d]);
      indegree.set(d.successorTaskId, (indegree.get(d.successorTaskId) || 0) + 1);
    });
    const q = active.filter((t) => (indegree.get(t.id) || 0) === 0).map((t) => t.id);
    const order: string[] = [];
    while (q.length) {
      const id = q.shift()!; order.push(id);
      for (const d of outgoing.get(id) || []) {
        indegree.set(d.successorTaskId, (indegree.get(d.successorTaskId) || 0) - 1);
        if ((indegree.get(d.successorTaskId) || 0) === 0) q.push(d.successorTaskId);
      }
    }
    if (order.length !== active.length) return { tasks: [], criticalTaskIds: [], hasCycle: true };

    const byId = new Map(active.map((t) => [t.id, t]));
    const duration = new Map(active.map((t) => [t.id, Math.max(1, day(t.plannedEndDate) - day(t.plannedStartDate) + 1)]));
    const es = new Map<string, number>(); const ef = new Map<string, number>();
    for (const id of order) {
      let start = 0;
      for (const d of incoming.get(id) || []) {
        const pre = d.predecessorTaskId;
        const lag = d.lagDays || 0;
        let candidate = 0;
        if (d.type === 'FS') candidate = (ef.get(pre) || 0) + lag;
        else if (d.type === 'SS') candidate = (es.get(pre) || 0) + lag;
        else if (d.type === 'FF') candidate = (ef.get(pre) || 0) + lag - (duration.get(id) || 1);
        else candidate = (es.get(pre) || 0) + lag - (duration.get(id) || 1);
        start = Math.max(start, candidate);
      }
      es.set(id, start); ef.set(id, start + (duration.get(id) || 1));
    }
    const projectFinish = Math.max(0, ...[...ef.values()]);
    const lf = new Map<string, number>(); const ls = new Map<string, number>();
    for (const id of [...order].reverse()) {
      let finish = projectFinish;
      const outs = outgoing.get(id) || [];
      if (outs.length) {
        finish = Math.min(...outs.map((d) => {
          const suc = d.successorTaskId; const lag = d.lagDays || 0;
          if (d.type === 'FS') return (ls.get(suc) ?? projectFinish) - lag;
          if (d.type === 'SS') return (ls.get(suc) ?? projectFinish) - lag + (duration.get(id) || 1);
          if (d.type === 'FF') return (lf.get(suc) ?? projectFinish) - lag;
          return (lf.get(suc) ?? projectFinish) - lag + (duration.get(id) || 1);
        }));
      }
      lf.set(id, finish); ls.set(id, finish - (duration.get(id) || 1));
    }
    const result = order.map((id) => {
      const totalFloatDays = Math.max(0, (ls.get(id) || 0) - (es.get(id) || 0));
      return { taskId: id, earliestStartDay: es.get(id) || 0, earliestFinishDay: ef.get(id) || 0, latestStartDay: ls.get(id) || 0, latestFinishDay: lf.get(id) || 0, totalFloatDays, isCritical: totalFloatDays === 0 };
    });
    return { tasks: result, criticalTaskIds: result.filter((x) => x.isCritical).map((x) => x.taskId), hasCycle: false };
  },
};

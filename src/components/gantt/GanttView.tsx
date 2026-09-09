import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  MoveHorizontal,
  AlertTriangle,
  CheckCircle2,
  X,
  Diamond,
  GitBranch,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName } from '../../services/capacityEngine';
import { Task, TaskAllocation } from '../../types';
import { CriticalPathService } from '../../services/criticalPathService';
import { DependencyService } from '../../services/dependencyService';

interface GanttViewProps { onSelectTask?: (task: Task) => void; }
interface PendingMove {
  original: Task;
  updated: Task;
  cascade: { taskId: string; plannedStartDate: string; plannedEndDate: string; reason: string }[];
  dayDelta: number;
}
type ZoomLevel = 'day' | 'week' | 'month';
interface Bucket { key: string; label: string; start: string; end: string; weekend?: boolean; }
interface DependencyLine { id: string; d: string; blocked: boolean; type: string; }

const DAY_MS = 86400000;
const toDate = (date: string) => new Date(`${date}T12:00:00`);
const formatDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, days: number) => { const d = toDate(date); d.setDate(d.getDate() + days); return formatDate(d); };
const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY_MS);
const monthEnd = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return formatDate(new Date(y, m, 0, 12));
};
const shortDate = (date: string) => { const d = toDate(date); return `${d.getDate()}/${d.getMonth() + 1}`; };

export const GanttView: React.FC<GanttViewProps> = ({ onSelectTask }) => {
  const { tasks, taskAllocations, employees, clients, selectedMonth, setSelectedMonth, filterEmployeeId, setFilterEmployeeId, updateTask, addToast } = useApp();
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const chartBodyRef = useRef<HTMLDivElement | null>(null);
  const taskAnchorRefs = useRef(new Map<string, HTMLDivElement>());
  const [dependencyLines, setDependencyLines] = useState<DependencyLine[]>([]);

  const criticalPath = useMemo(() => CriticalPathService.calculate(tasks), [tasks]);
  const criticalIds = useMemo(() => new Set(criticalPath.criticalTaskIds), [criticalPath]);
  const dependencyAnalysis = useMemo(() => DependencyService.analyze(tasks), [tasks]);
  const blockedIds = useMemo(() => new Set(dependencyAnalysis.filter((x) => x.blocked).map((x) => x.dep.successorTaskId)), [dependencyAnalysis]);

  const range = useMemo(() => {
    const start = `${selectedMonth}-01`;
    if (zoom === 'day') return { start, end: monthEnd(selectedMonth) };
    if (zoom === 'week') return { start, end: addDays(start, 55) };
    const [y, m] = selectedMonth.split('-').map(Number);
    const after = new Date(y, m - 1 + 6, 1, 12);
    return { start, end: addDays(formatDate(after), -1) };
  }, [selectedMonth, zoom]);
  const rangeDays = Math.max(1, diffDays(range.start, range.end) + 1);

  const buckets = useMemo<Bucket[]>(() => {
    const result: Bucket[] = [];
    if (zoom === 'day') {
      for (let i = 0; i < rangeDays; i++) {
        const date = addDays(range.start, i); const d = toDate(date);
        result.push({ key: date, label: String(d.getDate()), start: date, end: date, weekend: d.getDay() === 5 || d.getDay() === 6 });
      }
      return result;
    }
    if (zoom === 'week') {
      for (let i = 0; i < rangeDays; i += 7) {
        const start = addDays(range.start, i); const end = addDays(start, Math.min(6, rangeDays - i - 1));
        result.push({ key: start, label: `${shortDate(start)}–${shortDate(end)}`, start, end });
      }
      return result;
    }
    let cursor = toDate(range.start);
    while (formatDate(cursor) <= range.end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const start = formatDate(new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12));
      const end = monthEnd(key);
      result.push({ key, label: getHebrewMonthName(key), start, end: end > range.end ? range.end : end });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
    }
    return result;
  }, [zoom, range.start, range.end, rangeDays]);

  const movePeriod = (direction: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const months = zoom === 'day' ? direction : zoom === 'week' ? direction * 2 : direction * 6;
    const d = new Date(y, m - 1 + months, 1, 12);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || id;
  const filteredTasks = useMemo(() => tasks.filter((t) => {
    if (filterEmployeeId !== 'all' && t.assigneeId !== filterEmployeeId) return false;
    return t.plannedStartDate <= range.end && t.plannedEndDate >= range.start;
  }), [tasks, filterEmployeeId, range]);
  const tasksByEmployee = useMemo(() => {
    const map: Record<string, Task[]> = {};
    employees.forEach((emp) => { if (filterEmployeeId === 'all' || emp.id === filterEmployeeId) map[emp.id] = filteredTasks.filter((t) => t.assigneeId === emp.id); });
    return map;
  }, [employees, filteredTasks, filterEmployeeId]);

  const getTaskBarPosition = (task: Task) => {
    const effectiveStart = task.plannedStartDate < range.start ? range.start : task.plannedStartDate;
    const effectiveEnd = task.plannedEndDate > range.end ? range.end : task.plannedEndDate;
    const startOffset = Math.max(0, diffDays(range.start, effectiveStart));
    const duration = Math.max(1, diffDays(effectiveStart, effectiveEnd) + 1);
    return { left: `${(startOffset / rangeDays) * 100}%`, width: `${Math.max(1.2, (duration / rangeDays) * 100)}%` };
  };
  const getMilestonePosition = (task: Task) => {
    const date = task.plannedStartDate < range.start ? range.start : task.plannedStartDate > range.end ? range.end : task.plannedStartDate;
    return `${(Math.max(0, diffDays(range.start, date)) / rangeDays) * 100}%`;
  };
  useLayoutEffect(() => {
    const body = chartBodyRef.current;
    if (!body) return;
    const bodyRect = body.getBoundingClientRect();
    const lines: DependencyLine[] = [];
    for (const task of filteredTasks) {
      for (const dep of task.dependencies || []) {
        const from = taskAnchorRefs.current.get(dep.predecessorTaskId);
        const to = taskAnchorRefs.current.get(dep.successorTaskId);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const startUsesEnd = dep.type === 'FS' || dep.type === 'FF';
        const endUsesEnd = dep.type === 'FF' || dep.type === 'SF';
        const startX = (startUsesEnd ? a.right : a.left) - bodyRect.left;
        const startY = a.top - bodyRect.top + a.height / 2;
        const endX = (endUsesEnd ? b.right : b.left) - bodyRect.left;
        const endY = b.top - bodyRect.top + b.height / 2;
        const direction = endX >= startX ? 1 : -1;
        const elbow = Math.max(18, Math.min(70, Math.abs(endX - startX) / 2));
        const midX = startX + direction * elbow;
        const d = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
        const blocked = dependencyAnalysis.some((x) => x.dep.id === dep.id && x.blocked);
        lines.push({ id: dep.id, d, blocked, type: dep.type });
      }
    }
    setDependencyLines(lines);
  }, [filteredTasks, dependencyAnalysis, zoom, range.start, range.end, filterEmployeeId]);

  const getTaskColor = (task: Task) => {
    if (blockedIds.has(task.id)) return 'bg-rose-700 text-white ring-2 ring-rose-300';
    if (criticalIds.has(task.id)) return 'bg-purple-700 text-white ring-2 ring-purple-300';
    if (task.status === 'הושלם') return 'bg-emerald-500 text-white';
    if (task.status === 'מעוכב') return 'bg-rose-500 text-white';
    if (task.status === 'בביצוע') return 'bg-blue-600 text-white';
    if (task.priority === 'קריטית') return 'bg-amber-600 text-white';
    return 'bg-indigo-500 text-white';
  };

  const proposeMove = (task: Task, newStartDate: string, newAssigneeId: string) => {
    const duration = task.isMilestone ? 0 : Math.max(0, diffDays(task.plannedStartDate, task.plannedEndDate));
    const dayDelta = diffDays(task.plannedStartDate, newStartDate);
    const updated: Task = { ...task, assigneeId: newAssigneeId, plannedStartDate: newStartDate, plannedEndDate: addDays(newStartDate, duration), dateChangeReason: 'שינוי תכנון באמצעות Gantt' };
    const hypothetical = tasks.map((t) => t.id === task.id ? updated : t);
    setPendingMove({ original: task, updated, cascade: DependencyService.proposeCascade(hypothetical, task.id), dayDelta });
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>, employeeId: string) => {
    event.preventDefault(); const task = tasks.find((t) => t.id === dragTaskId); setDragTaskId(null); if (!task) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(0.9999, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const newStartDate = addDays(range.start, Math.min(rangeDays - 1, Math.floor(ratio * rangeDays)));
    if (newStartDate === task.plannedStartDate && employeeId === task.assigneeId) return;
    proposeMove(task, newStartDate, employeeId);
  };
  const allocationsForMove = (task: Task, dayDelta: number): { month: string; hours: number; allocationDate?: string; source?: TaskAllocation['source']; notes?: string }[] => taskAllocations.filter((a) => a.taskId === task.id).map((a) => {
    const allocationDate = a.allocationDate ? addDays(a.allocationDate, dayDelta) : undefined;
    return { month: allocationDate ? allocationDate.slice(0, 7) : a.month, hours: a.allocatedHours, allocationDate, source: a.source, notes: a.notes };
  });
  const confirmMove = () => {
    if (!pendingMove) return;
    updateTask(pendingMove.updated, allocationsForMove(pendingMove.original, pendingMove.dayDelta));
    for (const c of pendingMove.cascade) {
      const target = tasks.find((t) => t.id === c.taskId); if (!target) continue;
      const delta = diffDays(target.plannedStartDate, c.plannedStartDate);
      updateTask({ ...target, plannedStartDate: c.plannedStartDate, plannedEndDate: c.plannedEndDate, dateChangeReason: `Gantt Dependency Cascade: ${c.reason}` }, allocationsForMove(target, delta));
    }
    addToast(pendingMove.cascade.length ? `התכנון עודכן יחד עם ${pendingMove.cascade.length} משימות תלויות` : 'התכנון עודכן מה-Gantt'); setPendingMove(null);
  };
  const resizeTask = (task: Task, delta: number) => {
    if (task.isMilestone) { addToast('Milestone הוא נקודת ציון ללא משך. יש להזיז אותו במקום לשנות משך.', 'error'); return; }
    const nextEnd = addDays(task.plannedEndDate, delta);
    if (nextEnd < task.plannedStartDate) { addToast('תאריך הסיום אינו יכול להיות לפני תאריך ההתחלה', 'error'); return; }
    const updated = { ...task, plannedEndDate: nextEnd, dateChangeReason: 'שינוי משך באמצעות Gantt' };
    const hypothetical = tasks.map((t) => t.id === task.id ? updated : t);
    setPendingMove({ original: task, updated, cascade: DependencyService.proposeCascade(hypothetical, task.id), dayDelta: 0 });
  };

  return <div id="gantt-view" className="space-y-4 animate-in fade-in duration-200" dir="rtl">
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">גאנט אינטראקטיבי</h2>
        <p className="text-xs text-slate-500">Drag & Drop, שינוי משך, Milestones, Dependencies ו-Zoom לפי יום / שבוע / חודש.</p>
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500"><span>🟣 Critical Path</span><span>🔴 Dependency חסום</span><span>◆ Milestone</span><span>⇆ Drag & Drop</span></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={filterEmployeeId} onChange={(e) => setFilterEmployeeId(e.target.value)} className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"><option value="all">כל העובדים ({employees.length})</option>{employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}</select>
        <div className="flex bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs font-semibold">{(['day','week','month'] as ZoomLevel[]).map((z) => <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1.5 rounded-lg ${zoom === z ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}>{z === 'day' ? 'יום' : z === 'week' ? 'שבוע' : 'חודש'}</button>)}</div>
        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs font-semibold"><button onClick={() => movePeriod(-1)} className="p-1.5 rounded-lg hover:bg-white"><ChevronRight className="w-4 h-4"/></button><span className="px-3 min-w-36 text-center">{shortDate(range.start)} – {shortDate(range.end)}</span><button onClick={() => movePeriod(1)} className="p-1.5 rounded-lg hover:bg-white"><ChevronLeft className="w-4 h-4"/></button></div>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
      <div ref={chartBodyRef} className="relative min-w-[980px]">
        <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none overflow-visible" aria-hidden="true">
          <defs>
            <marker id="dep-arrow-normal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#7c3aed" /></marker>
            <marker id="dep-arrow-blocked" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#e11d48" /></marker>
          </defs>
          {dependencyLines.map((line) => <path key={line.id} d={line.d} fill="none" stroke={line.blocked ? '#e11d48' : '#7c3aed'} strokeWidth={line.blocked ? 2.2 : 1.7} strokeDasharray={line.blocked ? '5 4' : undefined} markerEnd={`url(#${line.blocked ? 'dep-arrow-blocked' : 'dep-arrow-normal'})`}><title>{`Dependency ${line.type}${line.blocked ? ' – חסומה' : ''}`}</title></path>)}
        </svg>
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs text-slate-600 font-semibold select-none relative z-10">
          <div className="w-64 p-3 shrink-0 border-l border-slate-200">עובד / משימה</div>
          <div className="flex-1 grid" dir="ltr" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>{buckets.map((b) => <div key={b.key} className={`text-center py-2 text-[10px] border-l border-slate-200 ${b.weekend ? 'bg-slate-200/60 text-slate-400' : 'text-slate-700'}`}>{b.label}</div>)}</div>
        </div>
        <div className="divide-y divide-slate-100 relative z-10">{Object.entries(tasksByEmployee).map(([empId, list]) => {
          const empTasks = list as Task[]; const employee = employees.find((e) => e.id === empId); if (!employee) return null;
          return <div key={empId} className="group">
            <div className="flex bg-slate-50/70 border-b border-slate-100"><div className="w-64 p-2.5 shrink-0 border-l border-slate-200 flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">{employee.name.charAt(0)}</div><span className="font-bold text-xs text-slate-900">{employee.name}</span></div><span className="text-[10px] text-slate-400 font-mono">{empTasks.length} משימות</span></div><div className="flex-1 grid" dir="ltr" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>{buckets.map((b) => <div key={b.key} className={`border-l border-slate-100 ${b.weekend ? 'bg-slate-100/50' : ''}`} />)}</div></div>
            {empTasks.length === 0 ? <div className="flex py-2 text-xs text-slate-400 italic pr-6 bg-white">אין משימות מתוכננות בטווח זה</div> : empTasks.map((task) => {
              const barPos = getTaskBarPosition(task); const deps = task.dependencies || [];
              return <div key={task.id} className="flex items-center hover:bg-slate-50/80 transition-colors border-b border-slate-100 relative py-1.5">
                <div className="w-64 px-3 shrink-0 border-l border-slate-200 truncate cursor-pointer" onClick={() => onSelectTask?.(task)}><div className="flex items-center gap-1.5">{task.isMilestone && <Diamond className="w-3 h-3 text-violet-600 fill-violet-100"/>}<span className="font-mono text-[10px] font-bold text-blue-600">{task.taskNumber}</span><span className="text-xs font-medium text-slate-800 truncate" title={task.name}>{task.name}</span></div><div className="text-[10px] text-slate-400 truncate flex items-center gap-2"><span>{getClientName(task.clientId)} | {task.remainingHours} ש׳</span>{deps.length > 0 && <span className="inline-flex items-center gap-0.5 text-violet-600"><GitBranch className="w-3 h-3"/>{deps.length}</span>}</div></div>
                <div className="flex-1 relative h-8 flex items-center px-1" dir="ltr" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, empId)}>
                  <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>{buckets.map((b) => <div key={b.key} className={`border-l border-slate-100/60 h-full ${b.weekend ? 'bg-slate-100/40' : ''}`} />)}</div>
                  {task.isMilestone ? <div ref={(el) => { if (el) taskAnchorRefs.current.set(task.id, el); else taskAnchorRefs.current.delete(task.id); }} draggable onDragStart={() => setDragTaskId(task.id)} onDragEnd={() => setDragTaskId(null)} onDoubleClick={() => onSelectTask?.(task)} style={{ left: getMilestonePosition(task) }} className={`absolute w-5 h-5 -ml-2.5 rotate-45 rounded-sm shadow cursor-grab active:cursor-grabbing ${getTaskColor(task)}`} title={`Milestone: ${task.name}\n${task.plannedStartDate}`}><span className="sr-only">{task.name}</span></div> : <div ref={(el) => { if (el) taskAnchorRefs.current.set(task.id, el); else taskAnchorRefs.current.delete(task.id); }} draggable onDragStart={() => setDragTaskId(task.id)} onDragEnd={() => setDragTaskId(null)} style={{ left: barPos.left, width: barPos.width }} className={`absolute h-6 rounded-md shadow-xs flex items-center justify-between px-2 text-[10px] font-semibold truncate cursor-grab active:cursor-grabbing transition-all hover:shadow-md ${getTaskColor(task)}`} title={`${task.name}\nהתחלה: ${task.plannedStartDate} | סיום: ${task.plannedEndDate}\nדדליין: ${task.deadline}`}><span className="truncate" onDoubleClick={() => onSelectTask?.(task)}>{task.name}</span><span className="flex items-center gap-1 shrink-0 ml-1"><MoveHorizontal className="w-3 h-3 opacity-80"/><button type="button" draggable={false} onClick={(e) => { e.stopPropagation(); resizeTask(task, -1); }} className="w-4 h-4 rounded bg-black/15 hover:bg-black/25">−</button><button type="button" draggable={false} onClick={(e) => { e.stopPropagation(); resizeTask(task, 1); }} className="w-4 h-4 rounded bg-black/15 hover:bg-black/25">+</button></span></div>}
                </div>
              </div>;
            })}
          </div>;
        })}</div>
      </div>
    </div>

    {pendingMove && <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full" dir="rtl"><div className="p-4 border-b flex items-center justify-between"><div><h3 className="font-bold text-lg">אישור שינוי תכנון</h3><p className="text-xs text-slate-500">המערכת לא תשנה את התכנון עד לאישור.</p></div><button onClick={() => setPendingMove(null)} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-5 h-5"/></button></div><div className="p-4 space-y-3 text-sm"><div className="grid md:grid-cols-2 gap-3"><div className="border rounded-xl p-3"><div className="text-xs text-slate-500 mb-1">Current Plan</div><b>{pendingMove.original.taskNumber} – {pendingMove.original.name}</b><div className="mt-2 text-xs">{pendingMove.original.plannedStartDate} → {pendingMove.original.plannedEndDate}<br/>עובד: {employees.find(e => e.id === pendingMove.original.assigneeId)?.name}</div></div><div className="border rounded-xl p-3 bg-blue-50 border-blue-100"><div className="text-xs text-blue-600 mb-1">Suggested Plan</div><b>{pendingMove.updated.taskNumber} – {pendingMove.updated.name}</b><div className="mt-2 text-xs">{pendingMove.updated.plannedStartDate} → {pendingMove.updated.plannedEndDate}<br/>עובד: {employees.find(e => e.id === pendingMove.updated.assigneeId)?.name}</div></div></div>{pendingMove.cascade.length > 0 ? <div className="border border-amber-200 bg-amber-50 rounded-xl p-3"><div className="flex items-center gap-2 font-bold text-amber-900"><AlertTriangle className="w-4 h-4"/>השפעה על {pendingMove.cascade.length} משימות תלויות</div><div className="mt-2 max-h-48 overflow-auto space-y-1">{pendingMove.cascade.map((c) => { const t = tasks.find(x => x.id === c.taskId); return <div key={c.taskId} className="text-xs bg-white border rounded-lg p-2"><b>{t?.taskNumber} {t?.name}</b>: {t?.plannedStartDate}–{t?.plannedEndDate} → {c.plannedStartDate}–{c.plannedEndDate} · {c.reason}</div>; })}</div></div> : <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs"><CheckCircle2 className="w-4 h-4"/>לא נמצאה השפעה נדרשת על משימות תלויות.</div>}</div><div className="p-4 border-t flex justify-end gap-2"><button onClick={() => setPendingMove(null)} className="px-4 py-2 border rounded-xl text-sm">ביטול</button><button onClick={confirmMove} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">אשר ועדכן תכנון</button></div></div></div>}
  </div>;
};

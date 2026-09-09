import React, { useMemo, useState } from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, GitBranch, Save, TrendingUp, Sparkles, GitCompareArrows, Route, ChevronDown, ChevronUp, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AutoPlanningService } from '../../services/autoPlanningService';
import { BaselineService } from '../../services/baselineService';
import { CriticalPathService } from '../../services/criticalPathService';
import { DependencyService } from '../../services/dependencyService';
import { ForecastService } from '../../services/forecastService';
import { PlanningIntelligenceService } from '../../services/planningIntelligenceService';
import { ScenarioService } from '../../services/scenarioService';
import { StorageService } from '../../services/storage';
import { PlanningBaseline, PlanningRecommendation, PlanningScenario } from '../../types';

export const PlanningIntelligenceView: React.FC = () => {
  const {
    tasks, employees, clients, projects, taskAllocations, absences, fixedAllocations, monthlyCapacities,
    settings, teamMetrics, selectedMonth, currentUser, addToast, setCurrentTab, updateTask, addTask,
  } = useApp();
  const [baselines, setBaselines] = useState<PlanningBaseline[]>(StorageService.getPlanningBaselines());
  const [baselineName, setBaselineName] = useState('');
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(baselines[0]?.id || '');
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null);
  const [scenarioScope, setScenarioScope] = useState<'task' | 'client' | 'project'>('task');
  const [scenarioTargetId, setScenarioTargetId] = useState('');
  const [scenarioDelayDays, setScenarioDelayDays] = useState(14);
  const [activeScenario, setActiveScenario] = useState<PlanningScenario | undefined>(undefined);

  const issues = useMemo(() => PlanningIntelligenceService.analyze({
    tasks, employees, allocations: taskAllocations, absences, teamMetrics,
    upcomingDeadlineDays: settings.upcomingDeadlineDays,
  }), [tasks, employees, taskAllocations, absences, teamMetrics, settings.upcomingDeadlineDays]);

  const dependencies = useMemo(() => DependencyService.analyze(tasks), [tasks]);
  const blockedDependencies = dependencies.filter((d) => !d.valid || d.blocked);
  const criticalPath = useMemo(() => CriticalPathService.calculate(tasks), [tasks]);
  const recommendations = useMemo(() => AutoPlanningService.suggest({ issues, tasks, employees, allocations: taskAllocations, teamMetrics }), [issues, tasks, employees, taskAllocations, teamMetrics]);
  const forecast = useMemo(() => ForecastService.build({
    startMonth: selectedMonth, months: 6, employees, tasks, allocations: taskAllocations,
    absences, fixedAllocations, monthlyCapacities, settings,
  }), [selectedMonth, employees, tasks, taskAllocations, absences, fixedAllocations, monthlyCapacities, settings]);
  const scenarioForecast = useMemo(() => activeScenario ? ForecastService.build({
    startMonth: selectedMonth, months: 6, employees, tasks, allocations: taskAllocations,
    absences, fixedAllocations, monthlyCapacities, settings, scenario: activeScenario,
  }) : [], [activeScenario, selectedMonth, employees, tasks, taskAllocations, absences, fixedAllocations, monthlyCapacities, settings]);

  const scenarioTargets = useMemo(() => {
    if (scenarioScope === 'client') return clients.filter((c) => c.isActive !== false).map((c) => ({ id: c.id, label: `${c.code || ''} ${c.name}`.trim() }));
    if (scenarioScope === 'project') return projects.filter((p) => p.isActive).map((p) => ({ id: p.id, label: p.name }));
    return tasks.filter((t) => !['הושלם', 'בוטל'].includes(t.status)).map((t) => ({ id: t.id, label: `${t.taskNumber} – ${t.name}` }));
  }, [scenarioScope, clients, projects, tasks]);

  const buildDelayScenario = () => {
    if (!scenarioTargetId || scenarioDelayDays === 0) {
      addToast('בחר יעד לתרחיש ומספר ימי דחייה', 'info');
      return;
    }
    const affectedTaskIds = tasks.filter((t) => scenarioScope === 'task'
      ? t.id === scenarioTargetId
      : scenarioScope === 'client'
        ? t.clientId === scenarioTargetId
        : t.projectId === scenarioTargetId).map((t) => t.id);
    if (!affectedTaskIds.length) {
      addToast('לא נמצאו משימות פעילות עבור היעד שנבחר', 'info');
      return;
    }
    const scenario = ScenarioService.createDelayScenario({
      name: `דחיית ${scenarioScope === 'task' ? 'משימה' : scenarioScope === 'client' ? 'לקוח' : 'פרויקט'} ב-${scenarioDelayDays} ימים`,
      taskIds: affectedTaskIds,
      delayDays: scenarioDelayDays,
      tasks,
      createdBy: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',
    });
    setActiveScenario(scenario);
    addToast(`Scenario נוצר עבור ${affectedTaskIds.length} משימות`);
  };

  const selectedBaseline = baselines.find((b) => b.id === selectedBaselineId);
  const baselineComparison = useMemo(() => {
    if (!selectedBaseline) return [];
    return tasks.map((task) => BaselineService.compareTask(selectedBaseline, task)).filter(Boolean) as NonNullable<ReturnType<typeof BaselineService.compareTask>>[];
  }, [selectedBaseline, tasks]);
  const changedBaselineTasks = baselineComparison.filter((x) => x.startDateChanged || x.endDateChanged || x.assigneeChanged || x.statusChanged || x.hoursVariance !== 0);

  const createBaseline = () => {
    const baseline = BaselineService.createBaseline({
      name: baselineName || `Baseline ${new Date().toLocaleDateString('he-IL')}`,
      createdBy: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',
      tasks, allocations: taskAllocations,
    });
    const next = [baseline, ...baselines];
    StorageService.savePlanningBaselines(next);
    StorageService.logAudit({
      user: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',
      action: 'יצירת Baseline', entityType: 'PlanningBaseline', entityId: baseline.id,
      entityLabel: baseline.name, fieldName: 'tasks', oldValue: null, newValue: baseline.tasks.length,
      details: `נשמר Snapshot של ${baseline.tasks.length} משימות`, source: 'ui',
    });
    setBaselines(next); setSelectedBaselineId(baseline.id); setBaselineName(''); addToast('Baseline נשמר בהצלחה');
  };

  const applyRecommendation = (rec: PlanningRecommendation) => {
    if (rec.action === 'split_task') {
      const change = rec.changes[0];
      const source = tasks.find((t) => t.id === change?.taskId);
      const splitHours = Math.max(0, Math.min(change?.splitHours || 0, source?.remainingHours || 0));
      const targetEmployeeId = change?.splitToEmployeeId;
      if (!source || !targetEmployeeId || splitHours <= 0) {
        addToast('לא ניתן לבצע את הפיצול: נתוני ההמלצה אינם תקינים', 'error');
        return;
      }

      const sourceAllocations = taskAllocations.filter((a) => a.taskId === source.id)
        .sort((a, b) => (a.allocationDate || `${a.month}-01`).localeCompare(b.allocationDate || `${b.month}-01`));
      let remainingToMove = splitHours;
      const kept: { month: string; hours: number; allocationDate?: string; source?: typeof sourceAllocations[number]['source']; notes?: string }[] = [];
      const moved: { month: string; hours: number; allocationDate?: string; source?: typeof sourceAllocations[number]['source']; notes?: string }[] = [];
      for (const a of sourceAllocations) {
        const take = Math.min(remainingToMove, a.allocatedHours);
        if (take > 0) {
          moved.push({ month: a.month, hours: take, allocationDate: a.allocationDate, source: a.source, notes: `פוצל מ-${source.taskNumber}` });
          remainingToMove -= take;
        }
        const left = a.allocatedHours - take;
        if (left > 0) kept.push({ month: a.month, hours: left, allocationDate: a.allocationDate, source: a.source, notes: a.notes });
      }
      if (remainingToMove > 0) {
        moved.push({ month: source.plannedStartDate.slice(0, 7), hours: remainingToMove, allocationDate: source.plannedStartDate, source: 'manual', notes: `פוצל מ-${source.taskNumber}` });
      }

      const updatedSource = {
        ...source,
        estimatedHours: Math.max(source.actualHours, source.estimatedHours - splitHours),
        remainingHours: Math.max(0, source.remainingHours - splitHours),
        dateChangeReason: `Auto Planning Split: ${rec.title}`,
      };
      updateTask(updatedSource, kept);
      addTask({
        name: `${source.name} – פיצול`,
        description: `משימת-בת שנוצרה אוטומטית מפיצול ${splitHours.toFixed(1)} שעות ממשימה ${source.taskNumber}. ${source.description || ''}`.trim(),
        clientId: source.clientId,
        projectId: source.projectId,
        assigneeId: targetEmployeeId,
        priority: source.priority,
        plannedStartDate: moved[0]?.allocationDate || source.plannedStartDate,
        plannedEndDate: source.plannedEndDate,
        deadline: source.deadline,
        estimatedHours: splitHours,
        actualHours: 0,
        remainingHours: splitHours,
        completionPercentage: 0,
        status: source.status,
        isBillable: source.isBillable,
        delayReason: source.delayReason,
        source: source.source,
        planningStatus: source.planningStatus || 'approved',
        // A split child must not inherit dependency records whose successorTaskId still points to the source task.
        // Dependencies can be added explicitly after the split if the manager decides they are required.
        dependencies: undefined,
        dependencyIds: undefined,
        recurrence: undefined,
        baselinePlannedStartDate: undefined,
        baselinePlannedEndDate: undefined,
        baselineEstimatedHours: undefined,
        dateChangeReason: `Auto Planning Split from ${source.taskNumber}`,
        comments: [],
        notes: undefined,
      }, moved);
      StorageService.logAudit({
        user: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',
        action: 'אישור פיצול Auto Planning', entityType: 'PlanningRecommendation', entityId: rec.id,
        entityLabel: rec.title, fieldName: 'splitHours', oldValue: source.remainingHours, newValue: updatedSource.remainingHours,
        details: `${splitHours.toFixed(1)} שעות פוצלו ממשימה ${source.taskNumber} לעובד ${employees.find(e => e.id === targetEmployeeId)?.name || targetEmployeeId}.`, source: 'system',
      });
      addToast(`פוצלו ${splitHours.toFixed(1)} שעות ונוצרה משימת-בת חדשה`);
      return;
    }

    const nextTasks = AutoPlanningService.apply(tasks, rec);
    const changed = nextTasks.filter((t, i) => t !== tasks[i]);
    if (!changed.length) {
      addToast('ההמלצה אינה כוללת שינוי אוטומטי לביצוע', 'info');
      return;
    }
    for (const updated of changed) {
      const existingAllocations = taskAllocations.filter((a) => a.taskId === updated.id).map((a) => ({ month: a.month, hours: a.allocatedHours, allocationDate: a.allocationDate, source: a.source, notes: a.notes }));
      updateTask(updated, existingAllocations);
    }
    StorageService.logAudit({
      user: currentUser?.fullName || settings.activeUserName || 'מנהל מערכת',
      action: 'אישור המלצת Auto Planning', entityType: 'PlanningRecommendation', entityId: rec.id,
      entityLabel: rec.title, fieldName: 'changes', oldValue: null, newValue: changed.length,
      details: rec.rationale, source: 'system',
    });
    addToast(`המלצה אושרה ועודכנו ${changed.length} משימות`);
  };

  const critical = issues.filter((i) => i.severity === 'critical').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><BrainCircuit className="w-6 h-6 text-blue-600"/><h2 className="text-2xl font-bold text-slate-900">מרכז תכנון חכם</h2></div>
          <p className="text-sm text-slate-500 mt-1">Overview → Problem → Cause → Recommended Action → Approval</p>
        </div>
        <button onClick={() => setCurrentTab('whatif')} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">פתח סימולציית תכנון</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {[
          ['דורש טיפול', issues.length, AlertTriangle, 'text-rose-600'],
          ['קריטי', critical, AlertTriangle, 'text-rose-700'],
          ['אזהרות', warnings, AlertTriangle, 'text-amber-600'],
          ['Dependencies חסומים', blockedDependencies.length, GitBranch, 'text-indigo-600'],
          ['Critical Path', criticalPath.criticalTaskIds.length, Route, 'text-purple-600'],
        ].map(([label, value, Icon, color]: any) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-500">{label}</span><Icon className={`w-5 h-5 ${color}`} /></div>
            <div className="text-3xl font-bold mt-2">{value}</div>
          </div>
        ))}
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between"><h3 className="font-bold">דורש טיפול</h3><span className="text-xs text-slate-500">{issues.length} חריגים</span></div>
        <div className="divide-y divide-slate-100 max-h-[520px] overflow-auto">
          {issues.slice(0, 30).map((issue) => (
            <div key={issue.id} className="p-4 hover:bg-slate-50">
              <div className="flex gap-3 items-start">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${issue.severity === 'critical' ? 'bg-rose-500' : issue.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900">{issue.title}</div>
                  <div className="grid md:grid-cols-3 gap-3 mt-2 text-xs">
                    <div><span className="font-semibold text-slate-700">הבעיה:</span> <span className="text-slate-600">{issue.problem}</span></div>
                    <div><span className="font-semibold text-slate-700">הגורם:</span> <span className="text-slate-600">{issue.cause}</span></div>
                    <div><span className="font-semibold text-slate-700">ההשפעה:</span> <span className="text-slate-600">{issue.impact}</span></div>
                  </div>
                  {issue.recommendation && <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-900"><b>המלצה:</b> {issue.recommendation}</div>}
                </div>
              </div>
            </div>
          ))}
          {issues.length === 0 && <div className="p-8 text-center text-slate-500"><CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500"/>לא נמצאו חריגים בתכנון הנוכחי</div>}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-violet-600"/><h3 className="font-bold">Auto Planning – הצעות בלבד</h3></div>
          <span className="text-xs text-slate-500">אין שינוי ללא אישור</span>
        </div>
        <div className="divide-y divide-slate-100">
          {recommendations.slice(0, 12).map((rec) => {
            const open = expandedRecommendation === rec.id;
            return <div key={rec.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><div className="font-bold">{rec.title}</div><div className="text-xs text-slate-600 mt-1">{rec.rationale}</div><div className="text-xs text-slate-500 mt-1">ציון התאמה: {rec.score}/100</div></div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setExpandedRecommendation(open ? null : rec.id)} className="px-3 py-2 text-xs border rounded-lg flex items-center gap-1">Impact {open ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}</button>
                  <button onClick={() => applyRecommendation(rec)} className="px-3 py-2 text-xs bg-violet-600 text-white rounded-lg font-semibold">אשר הצעה</button>
                </div>
              </div>
              {open && <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs"><b>Current Plan → Suggested Plan → Impact</b><div className="mt-1">{rec.impact}</div>{rec.changes.map((c) => <div key={c.taskId} className="mt-2 bg-white border rounded-lg p-2">{c.taskNumber} {c.taskName} {c.oldAssigneeId && c.newAssigneeId && <>· עובד: {employees.find(e=>e.id===c.oldAssigneeId)?.name || c.oldAssigneeId} → {employees.find(e=>e.id===c.newAssigneeId)?.name || c.newAssigneeId}</>} {c.oldStartDate && c.newStartDate && <>· התחלה: {c.oldStartDate} → {c.newStartDate}</>} {c.splitToEmployeeId && c.splitHours && <>· פיצול: {c.splitHours.toFixed(1)}ש׳ → {employees.find(e=>e.id===c.splitToEmployeeId)?.name || c.splitToEmployeeId}</>}</div>)}</div>}
            </div>;
          })}
          {!recommendations.length && <div className="p-6 text-sm text-slate-500 text-center">אין כרגע הצעות תכנון אוטומטי.</div>}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-cyan-600"/><h3 className="font-bold">Scenario Forecast – סימולציה ללא שינוי נתוני אמת</h3></div>
          {activeScenario && <button onClick={() => setActiveScenario(undefined)} className="px-3 py-2 text-xs border rounded-lg flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5"/>אפס Scenario</button>}
        </div>
        <div className="p-4 space-y-4">
          <div className="grid md:grid-cols-4 gap-3">
            <select value={scenarioScope} onChange={(e) => { setScenarioScope(e.target.value as any); setScenarioTargetId(''); setActiveScenario(undefined); }} className="border border-slate-300 rounded-xl px-3 py-2 text-sm">
              <option value="task">משימה</option><option value="client">לקוח</option><option value="project">פרויקט</option>
            </select>
            <select value={scenarioTargetId} onChange={(e) => setScenarioTargetId(e.target.value)} className="border border-slate-300 rounded-xl px-3 py-2 text-sm">
              <option value="">בחר יעד</option>{scenarioTargets.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3"><span className="text-xs text-slate-500 shrink-0">דחייה</span><input type="number" min={-90} max={365} value={scenarioDelayDays} onChange={(e)=>setScenarioDelayDays(Number(e.target.value))} className="w-full py-2 text-sm outline-none"/><span className="text-xs text-slate-500">ימים</span></div>
            <button onClick={buildDelayScenario} className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold">חשב Scenario</button>
          </div>
          <p className="text-xs text-slate-500">התרחיש מחושב על עותק וירטואלי של המשימות וההקצאות. הנתונים האמיתיים אינם משתנים.</p>
          {activeScenario && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-slate-500 border-b"><th className="text-right py-2">חודש</th><th>Current Planned</th><th>Scenario Planned</th><th>Δ Planned</th><th>Current Overload</th><th>Scenario Overload</th><th>Δ Idle</th></tr></thead><tbody>{forecast.map((current, i) => { const sim = scenarioForecast[i]; if (!sim) return null; const plannedDelta = sim.planned-current.planned; const idleDelta = sim.idle-current.idle; return <tr key={current.month} className="border-b border-slate-100"><td className="py-2 font-semibold">{current.month}</td><td className="text-center">{current.planned.toFixed(0)}ש׳</td><td className="text-center">{sim.planned.toFixed(0)}ש׳</td><td className={`text-center font-semibold ${plannedDelta>0?'text-rose-600':plannedDelta<0?'text-emerald-600':'text-slate-500'}`}>{plannedDelta>=0?'+':''}{plannedDelta.toFixed(0)}ש׳</td><td className="text-center">{current.overload.toFixed(0)}ש׳</td><td className={`text-center font-semibold ${sim.overload>current.overload?'text-rose-600':'text-slate-700'}`}>{sim.overload.toFixed(0)}ש׳</td><td className={`text-center font-semibold ${idleDelta>0?'text-amber-600':idleDelta<0?'text-emerald-600':'text-slate-500'}`}>{idleDelta>=0?'+':''}{idleDelta.toFixed(0)}ש׳</td></tr>})}</tbody></table></div>}
        </div>
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><Save className="w-5 h-5 text-indigo-600"/><h3 className="font-bold">Baselines</h3></div>
          <div className="flex gap-2 mb-4"><input value={baselineName} onChange={(e) => setBaselineName(e.target.value)} placeholder="שם Baseline" className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm"/><button onClick={createBaseline} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">שמור Snapshot</button></div>
          <select value={selectedBaselineId} onChange={(e)=>setSelectedBaselineId(e.target.value)} className="w-full mb-3 border border-slate-300 rounded-xl px-3 py-2 text-sm"><option value="">בחר Baseline להשוואה</option>{baselines.map((b)=><option key={b.id} value={b.id}>{b.name} – {new Date(b.createdAt).toLocaleDateString('he-IL')}</option>)}</select>
          {selectedBaseline && <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-xs mb-3"><div className="flex items-center gap-2 font-bold"><GitCompareArrows className="w-4 h-4"/>Baseline → Current → Actual</div><div className="grid grid-cols-3 mt-2 gap-2"><div>משימות ב-Baseline: <b>{selectedBaseline.tasks.length}</b></div><div>משימות שהשתנו: <b>{changedBaselineTasks.length}</b></div><div>סטיית שעות מצטברת: <b>{changedBaselineTasks.reduce((s,x)=>s+x.hoursVariance,0).toFixed(1)}ש׳</b></div></div></div>}
          <div className="space-y-2 max-h-72 overflow-auto">
            {changedBaselineTasks.slice(0,20).map((x) => <div key={x.current.id} className="border border-slate-200 rounded-xl p-3 text-xs"><div className="font-semibold">{x.current.taskNumber} – {x.current.name}</div><div className="grid grid-cols-3 gap-2 mt-2 text-slate-600"><span>סיום: {x.original.plannedEndDate} → {x.current.plannedEndDate} ({x.dateVarianceDays >= 0 ? '+' : ''}{x.dateVarianceDays} ימים)</span><span>שעות: {x.original.estimatedHours} → {x.current.estimatedHours} ({x.hoursVariance >= 0 ? '+' : ''}{x.hoursVariance})</span><span>Actual: {x.current.actualHours}ש׳</span></div></div>)}
            {!selectedBaseline && baselines.map((b) => <div key={b.id} className="border border-slate-200 rounded-xl p-3"><div className="font-semibold">{b.name}</div><div className="text-xs text-slate-500 mt-1">{new Date(b.createdAt).toLocaleString('he-IL')} · {b.tasks.length} משימות · {b.createdBy}</div></div>)}
            {!baselines.length && <div className="text-sm text-slate-500">טרם נוצר Baseline.</div>}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-emerald-600"/><h3 className="font-bold">Forecast ל-6 חודשים</h3></div>
          <div className="space-y-2">
            {forecast.map((f) => <div key={f.month} className="grid grid-cols-5 gap-2 items-center text-xs border-b border-slate-100 pb-2"><b>{f.month}</b><span>קיבולת {f.capacity.toFixed(0)}ש׳</span><span>מתוכנן {f.planned.toFixed(0)}ש׳</span><span className={f.overload > 0 ? 'text-rose-600 font-bold' : 'text-slate-600'}>{f.overload > 0 ? `חריגה ${f.overload.toFixed(0)}ש׳` : `Idle ${f.idle.toFixed(0)}ש׳`}</span><span>{f.utilization.toFixed(0)}%</span></div>)}
          </div>
        </section>
      </div>
    </div>
  );
};

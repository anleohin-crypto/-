import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, AlertTriangle, Plus, Trash2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, Priority, TaskStatus, DelayReason, TaskRecurrence, RecurrenceMode, TaskDependency, DependencyType } from '../../types';
import { getHebrewMonthName } from '../../services/capacityEngine';
import { generateOccurrenceDates, recurrenceToMonthlyAllocations } from '../../services/recurrenceService';
import { DependencyService } from '../../services/dependencyService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const {
    employees,
    clients,
    projects,
    addTask,
    updateTask,
    taskAllocations,
    selectedMonth,
    taskStatuses,
    tasks,
    auditLogs,
    settings,
  } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<Priority>('רגילה');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedEndDate, setPlannedEndDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>(40);
  const [actualHours, setActualHours] = useState<number>(0);
  const [remainingHours, setRemainingHours] = useState<number>(40);
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [status, setStatus] = useState<TaskStatus>('חדש');
  const [isBillable, setIsBillable] = useState(true);
  const [delayReason, setDelayReason] = useState<DelayReason | ''>('');
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<Task['source']>('לקוח');
  const [dateChangeReason, setDateChangeReason] = useState('');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('none');
  const [recurrenceHours, setRecurrenceHours] = useState<number>(1);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number>(1);
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState<number>(2);
  const [recurrenceWeekOfMonth, setRecurrenceWeekOfMonth] = useState<number>(1);
  const [specificDatesText, setSpecificDatesText] = useState('');
  const [newComment, setNewComment] = useState('');
  const [planningStatus, setPlanningStatus] = useState<'draft' | 'approved'>('approved');
  const [isMilestone, setIsMilestone] = useState(false);
  const [dependenciesDraft, setDependenciesDraft] = useState<TaskDependency[]>([]);
  const [dependencyPredecessorId, setDependencyPredecessorId] = useState('');
  const [dependencyType, setDependencyType] = useState<DependencyType>('FS');
  const [dependencyLagDays, setDependencyLagDays] = useState<number>(0);
  const [exceptionDatesText, setExceptionDatesText] = useState('');

  // Multi-month allocations for this task (Section 8: TaskAllocation)
  const [monthlyAllocations, setMonthlyAllocations] = useState<{ month: string; hours: number }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setName(taskToEdit.name);
      setDescription(taskToEdit.description || '');
      setClientId(taskToEdit.clientId);
      setProjectId(taskToEdit.projectId || '');
      setAssigneeId(taskToEdit.assigneeId);
      setPriority(taskToEdit.priority);
      setPlannedStartDate(taskToEdit.plannedStartDate);
      setPlannedEndDate(taskToEdit.plannedEndDate);
      setDeadline(taskToEdit.deadline);
      setEstimatedHours(taskToEdit.estimatedHours);
      setActualHours(taskToEdit.actualHours);
      setRemainingHours(taskToEdit.remainingHours);
      setCompletionPercentage(taskToEdit.completionPercentage);
      setStatus(taskToEdit.status);
      setIsBillable(taskToEdit.isBillable);
      setDelayReason(taskToEdit.delayReason || '');
      setNotes(taskToEdit.notes || '');
      setSource(taskToEdit.source || 'לקוח');
      setDateChangeReason(taskToEdit.dateChangeReason || '');
      setRecurrenceMode(taskToEdit.recurrence?.mode || 'none');
      setRecurrenceHours(taskToEdit.recurrence?.hoursPerOccurrence || 1);
      setRecurrenceDayOfMonth(taskToEdit.recurrence?.dayOfMonth || 1);
      setRecurrenceDayOfWeek(taskToEdit.recurrence?.dayOfWeek ?? 2);
      setRecurrenceWeekOfMonth(taskToEdit.recurrence?.weekOfMonth || 1);
      setSpecificDatesText((taskToEdit.recurrence?.specificDates || []).join('\n'));
      setNewComment('');
      setPlanningStatus(taskToEdit.planningStatus || 'approved');
      setIsMilestone(!!taskToEdit.isMilestone);
      setDependenciesDraft(taskToEdit.dependencies?.length ? taskToEdit.dependencies : (taskToEdit.dependencyIds || []).map((id, index) => ({ id: `legacy-edit-${index}-${id}`, predecessorTaskId: id, successorTaskId: taskToEdit.id, type: 'FS', lagDays: 0, createdAt: taskToEdit.createdAt })));
      setDependencyPredecessorId(''); setDependencyType('FS'); setDependencyLagDays(0);
      setExceptionDatesText((taskToEdit.recurrence?.exceptionDates || []).join('\n'));

      // Load existing allocations for this task
      const existingAlloc = taskAllocations.filter((a) => a.taskId === taskToEdit.id);
      if (existingAlloc.length > 0) {
        setMonthlyAllocations(
          existingAlloc.map((a) => ({ month: a.month, hours: a.allocatedHours }))
        );
      } else {
        const m = taskToEdit.plannedStartDate.substring(0, 7) || selectedMonth;
        setMonthlyAllocations([{ month: m, hours: taskToEdit.remainingHours }]);
      }
    } else {
      // New Task defaults
      const todayStr = new Date().toISOString().substring(0, 10);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 21);
      const endStr = targetDate.toISOString().substring(0, 10);

      setName('');
      setDescription('');
      setClientId(clients[0]?.id || '');
      setProjectId('');
      setAssigneeId(employees[0]?.id || '');
      setPriority('רגילה');
      setPlannedStartDate(todayStr);
      setPlannedEndDate(endStr);
      setDeadline(endStr);
      setEstimatedHours(36);
      setActualHours(0);
      setRemainingHours(36);
      setCompletionPercentage(0);
      const defaultStat = taskStatuses.find((s) => s.isDefault)?.name || taskStatuses.find((s) => s.active)?.name || 'מתוכנן';
      setStatus(defaultStat);
      setIsBillable(true);
      setDelayReason('');
      setNotes('');
      setSource('לקוח');
      setDateChangeReason('');
      setRecurrenceMode('none');
      setRecurrenceHours(1);
      setRecurrenceDayOfMonth(1);
      setRecurrenceDayOfWeek(2);
      setRecurrenceWeekOfMonth(1);
      setSpecificDatesText('');
      setNewComment('');
      setPlanningStatus('approved');
      setDependenciesDraft([]); setDependencyPredecessorId(''); setDependencyType('FS'); setDependencyLagDays(0);
      setExceptionDatesText('');
      setMonthlyAllocations([{ month: todayStr.substring(0, 7), hours: 36 }]);
    }
    setFormError(null);
  }, [taskToEdit, isOpen, clients, employees, selectedMonth, taskStatuses]);

  if (!isOpen) return null;

  // Recalculate remaining hours and percentage
  const handleEstimatedChange = (val: number) => {
    const est = Math.max(0, val);
    setEstimatedHours(est);
    const rem = Math.max(0, est - actualHours);
    setRemainingHours(rem);
    if (est > 0) {
      setCompletionPercentage(Math.min(100, Math.round((actualHours / est) * 100)));
    }
  };

  const handleActualChange = (val: number) => {
    const act = Math.max(0, val);
    setActualHours(act);
    const rem = Math.max(0, estimatedHours - act);
    setRemainingHours(rem);
    if (estimatedHours > 0) {
      setCompletionPercentage(Math.min(100, Math.round((act / estimatedHours) * 100)));
    }
  };

  const handleAddMonthAllocation = () => {
    const nextMonth = '2026-10';
    setMonthlyAllocations((prev) => [...prev, { month: nextMonth, hours: 10 }]);
  };

  const handleRemoveAllocation = (index: number) => {
    setMonthlyAllocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAllocationHourChange = (index: number, hours: number) => {
    setMonthlyAllocations((prev) =>
      prev.map((item, i) => (i === index ? { ...item, hours: Math.max(0, hours) } : item))
    );
  };

  const handleAllocationMonthChange = (index: number, month: string) => {
    setMonthlyAllocations((prev) =>
      prev.map((item, i) => (i === index ? { ...item, month } : item))
    );
  };

  const recurrence: TaskRecurrence | undefined = recurrenceMode === 'none' ? undefined : {
    mode: recurrenceMode,
    hoursPerOccurrence: Math.max(0, recurrenceHours),
    startDate: plannedStartDate,
    endDate: plannedEndDate,
    dayOfMonth: recurrenceDayOfMonth,
    dayOfWeek: recurrenceDayOfWeek,
    weekOfMonth: recurrenceWeekOfMonth,
    specificDates: recurrenceMode === 'specific_dates'
      ? specificDatesText.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean)
      : undefined,
    exceptionDates: exceptionDatesText.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean),
  };
  const recurrenceDates = generateOccurrenceDates(recurrence);
  const effectiveAllocations = recurrence ? recurrenceToMonthlyAllocations(recurrence) : monthlyAllocations;
  const totalAllocated = effectiveAllocations.reduce((a, b) => a + b.hours, 0);

  // Form Validation (Section 36)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('נא להזין שם משימה');
      return;
    }
    if (!clientId) {
      setFormError('נא לבחור לקוח');
      return;
    }
    if (!assigneeId) {
      setFormError('נא לבחור עובד אחראי');
      return;
    }
    if (plannedEndDate < plannedStartDate) {
      setFormError('תאריך סיום אינו יכול להיות מוקדם מתאריך ההתחלה');
      return;
    }
    if (deadline < plannedEndDate) {
      setFormError('הדדליין אינו יכול להיות מוקדם מתאריך הסיום המתוכנן');
      return;
    }
    const selectedClient = clients.find((c) => c.id === clientId);
    if (selectedClient?.isActive === false) {
      setFormError('לא ניתן לשייך משימה חדשה ללקוח שאינו פעיל');
      return;
    }
    if (selectedAssignee?.isActive === false) {
      setFormError('לא ניתן לשייך משימה לעובד שאינו פעיל');
      return;
    }
    if ((settings.closedMonths || []).includes(plannedStartDate.substring(0, 7))) {
      setFormError('החודש של תאריך תחילת המשימה סגור לשינויים. יש לפתוח אותו מחדש בהגדרות לפני שמירה.');
      return;
    }
    if (dependenciesDraft.some((d) => d.predecessorTaskId === taskToEdit?.id)) {
      setIsMilestone(false);
      setFormError('משימה אינה יכולה להיות תלויה בעצמה');
      return;
    }
    if (taskToEdit && dependenciesDraft.some((d) => DependencyService.wouldCreateCycle(tasks, { predecessorTaskId: d.predecessorTaskId, successorTaskId: taskToEdit.id, type: d.type, lagDays: d.lagDays }))) {
      setFormError('אחת התלויות יוצרת Dependency מעגלי. יש להסיר אותה לפני שמירה.');
      return;
    }
    if (recurrence && recurrenceDates.length === 0) {
      setFormError('הוגדרה משימה שוטפת אך לא נוצר אף מועד ביצוע בטווח שנבחר');
      return;
    }
    if (estimatedHours < 0 || actualHours < 0 || remainingHours < 0) {
      setFormError('שעות עבודה אינן יכולות להיות שליליות');
      return;
    }

    const payload = {
      name,
      description,
      clientId,
      projectId: projectId || undefined,
      assigneeId,
      priority,
      plannedStartDate,
      plannedEndDate: isMilestone ? plannedStartDate : plannedEndDate,
      deadline,
      estimatedHours,
      actualHours,
      remainingHours,
      completionPercentage,
      status,
      isBillable,
      delayReason: delayReason ? (delayReason as DelayReason) : undefined,
      source,
      planningStatus,
      isMilestone,
      dependencyIds: dependenciesDraft.map((d) => d.predecessorTaskId),
      dependencies: dependenciesDraft.map((d) => ({ ...d, successorTaskId: taskToEdit?.id || 'pending' })),
      recurrence,
      baselinePlannedStartDate: taskToEdit?.baselinePlannedStartDate || plannedStartDate,
      baselinePlannedEndDate: taskToEdit?.baselinePlannedEndDate || plannedEndDate,
      baselineEstimatedHours: taskToEdit?.baselineEstimatedHours ?? estimatedHours,
      dateChangeReason: taskToEdit && (taskToEdit.plannedStartDate !== plannedStartDate || taskToEdit.plannedEndDate !== plannedEndDate || taskToEdit.deadline !== deadline) ? dateChangeReason : taskToEdit?.dateChangeReason,
      comments: newComment.trim()
        ? [...(taskToEdit?.comments || []), { id: `c-${Date.now()}`, taskId: taskToEdit?.id || 'pending', text: newComment.trim(), createdAt: new Date().toISOString(), createdBy: 'משתמש מקומי' }]
        : (taskToEdit?.comments || []),
      notes,
    };

    if (taskToEdit) {
      updateTask({ ...taskToEdit, ...payload }, effectiveAllocations);
    } else {
      addTask(payload, effectiveAllocations);
    }

    onClose();
  };

  const filteredProjects = projects.filter((p) => p.clientId === clientId);
  const selectedAssignee = employees.find((e) => e.id === assigneeId);

  return (
    <div
      id="task-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="task-modal-container"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden text-right border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {taskToEdit ? `עריכת משימה (${taskToEdit.taskNumber})` : 'יצירת משימה חדשה'}
            </h3>
            <p className="text-xs text-slate-500">הגדרת פרטי המשימה ושיבוץ שעות חודשי</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Inactive employee warning */}
          {selectedAssignee && !selectedAssignee.isActive && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>שים לב: העובד שנבחר מוגדר כלא פעיל!</span>
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              שם המשימה <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: פיתוח ממשק שידור דוחות למשרד התחבורה"
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Client & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                לקוח <span className="text-rose-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId('');
                }}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">פרויקט / תחום</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white"
              >
                <option value="">כללי / ללא שיוך לפרויקט</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                עובד אחראי <span className="text-rose-500">*</span>
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role.split(' ')[0]}) {!emp.isActive && '(לא פעיל)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">עדיפות</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white"
              >
                <option value="נמוכה">נמוכה</option>
                <option value="רגילה">רגילה</option>
                <option value="גבוהה">גבוהה</option>
                <option value="קריטית">קריטית</option>
              </select>
            </div>
          </div>

          {/* Dates: Start, End, Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">תאריך התחלה</label>
              <input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">תאריך סיום מתוכנן</label>
              <input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">דדליין (Deadline)</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 font-bold"
              />
            </div>
          </div>

          {/* Hours: Estimated, Actual, Remaining, Completion % */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">שעות משוערות</label>
              <input
                type="number"
                min="0"
                value={estimatedHours}
                onChange={(e) => handleEstimatedChange(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-1.5 text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">שעות בפועל</label>
              <input
                type="number"
                min="0"
                value={actualHours}
                onChange={(e) => handleActualChange(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-1.5 text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">שעות נותרות</label>
              <input
                type="number"
                min="0"
                value={remainingHours}
                onChange={(e) => setRemainingHours(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-1.5 text-center text-blue-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">% השלמה</label>
              <input
                type="number"
                min="0"
                max="100"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg p-1.5 text-center"
              />
            </div>
          </div>

          {/* Status, Billable & Delay Reason */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">סטטוס</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                {taskStatuses
                  .filter((s) => s.active || s.name === status)
                  .sort((a, b) => a.order - b.order)
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} {s.isClosed ? '(סגור)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">סיווג שעות</label>
              <select
                value={isBillable ? 'yes' : 'no'}
                onChange={(e) => setIsBillable(e.target.value === 'yes')}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                <option value="yes">Billable (לחיוב לקוח)</option>
                <option value="no">Non-Billable (פנימי/תחזוקה)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">סיבת עיכוב (במידה ויש)</label>
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value as DelayReason)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
              >
                <option value="">ללא עיכוב</option>
                <option value="ממתין ללקוח">ממתין ללקוח</option>
                <option value="ממתין לאפיון">ממתין לאפיון</option>
                <option value="ממתין לפיתוח">ממתין לפיתוח</option>
                <option value="ממתין לבדיקה">ממתין לבדיקה</option>
                <option value="תקלה">תקלה</option>
                <option value="חוסר קיבולת">חוסר קיבולת</option>
                <option value="חופשה / מחלה">חופשה / מחלה</option>
                <option value="שינוי עדיפות">שינוי עדיפות</option>
                <option value="תלות במשימה אחרת">תלות במשימה אחרת</option>
                <option value="אחר">אחר</option>
              </select>
            </div>
          </div>


          {/* Recurring / continuous task scheduling */}
          <div className="border border-indigo-200 bg-indigo-50/40 p-3.5 rounded-xl space-y-3">
            <div>
              <span className="font-bold text-xs text-indigo-900">משימה שוטפת / מתמשכת</span>
              <p className="text-[11px] text-indigo-700">שיבוץ שעות לימים אמיתיים במקום חלוקה חודשית כללית בלבד.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><label className="block text-[11px] font-semibold mb-1">סוג תדירות</label><select value={recurrenceMode} onChange={(e)=>setRecurrenceMode(e.target.value as RecurrenceMode)} className="w-full text-xs border rounded-lg p-2 bg-white"><option value="none">ללא – משימה רגילה</option><option value="specific_dates">תאריכים ספציפיים בלבד</option><option value="monthly_day">יום קבוע בחודש</option><option value="monthly_weekday">יום בשבוע בתוך החודש</option><option value="weekly">כל שבוע ביום קבוע</option></select></div>
              {recurrenceMode !== 'none' && <div><label className="block text-[11px] font-semibold mb-1">שעות בכל מופע</label><input type="number" min="0" step="0.25" value={recurrenceHours} onChange={(e)=>setRecurrenceHours(Number(e.target.value)||0)} className="w-full text-xs border rounded-lg p-2 bg-white"/></div>}
              {recurrenceMode === 'monthly_day' && <div><label className="block text-[11px] font-semibold mb-1">יום בחודש</label><input type="number" min="1" max="31" value={recurrenceDayOfMonth} onChange={(e)=>setRecurrenceDayOfMonth(Math.min(31,Math.max(1,Number(e.target.value)||1)))} className="w-full text-xs border rounded-lg p-2 bg-white"/></div>}
              {(recurrenceMode === 'weekly' || recurrenceMode === 'monthly_weekday') && <div><label className="block text-[11px] font-semibold mb-1">יום בשבוע</label><select value={recurrenceDayOfWeek} onChange={(e)=>setRecurrenceDayOfWeek(Number(e.target.value))} className="w-full text-xs border rounded-lg p-2 bg-white"><option value={0}>ראשון</option><option value={1}>שני</option><option value={2}>שלישי</option><option value={3}>רביעי</option><option value={4}>חמישי</option><option value={5}>שישי</option><option value={6}>שבת</option></select></div>}
              {recurrenceMode === 'monthly_weekday' && <div><label className="block text-[11px] font-semibold mb-1">איזה שבוע בחודש</label><select value={recurrenceWeekOfMonth} onChange={(e)=>setRecurrenceWeekOfMonth(Number(e.target.value))} className="w-full text-xs border rounded-lg p-2 bg-white"><option value={1}>ראשון</option><option value={2}>שני</option><option value={3}>שלישי</option><option value={4}>רביעי</option><option value={5}>חמישי</option></select></div>}
            </div>
            {recurrenceMode === 'specific_dates' && <div><label className="block text-[11px] font-semibold mb-1">תאריכים ספציפיים – תאריך בכל שורה</label><textarea rows={4} value={specificDatesText} onChange={(e)=>setSpecificDatesText(e.target.value)} placeholder={'2026-09-15\n2026-10-13\n2026-11-17'} className="w-full text-xs border rounded-lg p-2 bg-white font-mono"/></div>}
            {recurrence && <div className="text-[11px] bg-white border rounded-lg p-2">נוצרו <strong>{recurrenceDates.length}</strong> מופעים, סה״כ <strong>{totalAllocated}</strong> שעות. {recurrenceDates.length > 0 && <>מועד ראשון: {recurrenceDates[0]} | אחרון: {recurrenceDates[recurrenceDates.length-1]}</>}</div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">מקור משימה</label><select value={source || 'לקוח'} onChange={(e)=>setSource(e.target.value as Task['source'])} className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"><option>לקוח</option><option>פנימי</option><option>רגולציה</option><option>תקלה</option><option>פיתוח</option><option>תמיכה</option><option>אחר</option></select></div>
            {taskToEdit && (taskToEdit.plannedStartDate !== plannedStartDate || taskToEdit.plannedEndDate !== plannedEndDate || taskToEdit.deadline !== deadline) && <div><label className="block text-xs font-semibold text-slate-700 mb-1">סיבת שינוי תאריך</label><input value={dateChangeReason} onChange={(e)=>setDateChangeReason(e.target.value)} required className="w-full text-xs bg-amber-50 border border-amber-300 rounded-lg p-2" placeholder="לדוגמה: המתנה לאפיון / שינוי עדיפות"/></div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold text-slate-700 mb-1">מצב תכנון</label><select value={planningStatus} onChange={(e)=>setPlanningStatus(e.target.value as 'draft'|'approved')} className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2"><option value="approved">מאושר – משפיע על הקיבולת</option><option value="draft">טיוטה – לא משפיע על הקיבולת</option></select></div>
            <label className="flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold text-slate-700"><input type="checkbox" checked={isMilestone} onChange={(e)=>setIsMilestone(e.target.checked)} /> Milestone – נקודת ציון בפרויקט</label>
            <div className="sm:col-span-2 border border-violet-200 bg-violet-50/40 rounded-xl p-3 space-y-2">
              <div><label className="block text-xs font-bold text-violet-900">Dependencies – תלויות בין משימות</label><p className="text-[11px] text-violet-700">ניתן להגדיר מספר משימות קודמות, סוג תלות ו-Lag. המערכת מונעת תלות מעגלית.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <select value={dependencyPredecessorId} onChange={(e)=>setDependencyPredecessorId(e.target.value)} className="sm:col-span-2 w-full text-xs bg-white border border-slate-300 rounded-lg p-2"><option value="">בחר משימה קודמת</option>{tasks.filter(t=>t.id!==taskToEdit?.id && !dependenciesDraft.some(d=>d.predecessorTaskId===t.id)).map(t=><option key={t.id} value={t.id}>{t.taskNumber} – {t.name}</option>)}</select>
                <select value={dependencyType} onChange={(e)=>setDependencyType(e.target.value as DependencyType)} className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"><option value="FS">Finish → Start</option><option value="SS">Start → Start</option><option value="FF">Finish → Finish</option><option value="SF">Start → Finish</option></select>
                <div className="flex gap-1"><input type="number" value={dependencyLagDays} onChange={(e)=>setDependencyLagDays(Number(e.target.value)||0)} className="min-w-0 w-full text-xs bg-white border border-slate-300 rounded-lg p-2" title="Lag בימים"/><button type="button" onClick={()=>{ if(!dependencyPredecessorId) return; const successorId=taskToEdit?.id || 'pending'; const candidate={ predecessorTaskId: dependencyPredecessorId, successorTaskId: successorId, type: dependencyType, lagDays: dependencyLagDays }; if(taskToEdit && DependencyService.wouldCreateCycle(tasks,candidate)){ setFormError('התלות שנבחרה יוצרת מעגל ואינה ניתנת להוספה'); return; } setDependenciesDraft(prev=>[...prev,{ id:`dep-${Date.now()}`, ...candidate, createdAt:new Date().toISOString(), createdBy:'משתמש מקומי' }]); setDependencyPredecessorId(''); setDependencyLagDays(0); setFormError(null); }} className="px-3 rounded-lg bg-violet-600 text-white text-xs font-bold">הוסף</button></div>
              </div>
              <div className="space-y-1">{dependenciesDraft.map((d)=><div key={d.id} className="flex items-center justify-between bg-white border rounded-lg px-2 py-1.5 text-[11px]"><span>{tasks.find(t=>t.id===d.predecessorTaskId)?.taskNumber || d.predecessorTaskId} · {d.type} · Lag {d.lagDays} ימים</span><button type="button" onClick={()=>setDependenciesDraft(prev=>prev.filter(x=>x.id!==d.id))} className="text-rose-600">הסר</button></div>)}{!dependenciesDraft.length && <div className="text-[11px] text-slate-500">ללא Dependencies</div>}</div>
            </div>
          </div>

          {recurrenceMode !== 'none' && <div><label className="block text-[11px] font-semibold mb-1">חריגים בסדרה – תאריכים שלא לבצע בהם</label><textarea rows={2} value={exceptionDatesText} onChange={(e)=>setExceptionDatesText(e.target.value)} placeholder={'2026-10-13\n2026-12-22'} className="w-full text-xs border rounded-lg p-2 bg-white font-mono"/></div>}

          {taskToEdit && <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 text-xs space-y-2">
            <div className="font-bold">Baseline מול מצב נוכחי</div>
            <div className="grid grid-cols-3 gap-2 text-center"><div className="bg-white border rounded p-2"><div className="text-[10px] text-slate-500">תחילת תכנון מקורית</div><strong>{taskToEdit.baselinePlannedStartDate || taskToEdit.plannedStartDate}</strong><div className="text-[10px] text-slate-400">כעת: {plannedStartDate}</div></div><div className="bg-white border rounded p-2"><div className="text-[10px] text-slate-500">סיום מקורי</div><strong>{taskToEdit.baselinePlannedEndDate || taskToEdit.plannedEndDate}</strong><div className="text-[10px] text-slate-400">כעת: {plannedEndDate}</div></div><div className="bg-white border rounded p-2"><div className="text-[10px] text-slate-500">שעות מקוריות</div><strong>{taskToEdit.baselineEstimatedHours ?? taskToEdit.estimatedHours}</strong><div className="text-[10px] text-slate-400">כעת: {estimatedHours}</div></div></div>
          </div>}

          {/* Section 8: Multi-Month Task Allocation (פריסת שעות לחודשים) */}
          {recurrenceMode === 'none' && <div className="border border-blue-200 bg-blue-50/40 p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600" />
                  חלוקת שעות המשימה בין חודשים (Task Allocation)
                </span>
                <p className="text-[11px] text-blue-700">
                  מאפשר לפרוס משימה (למשל של 63 שעות) על פני מספר חודשים לחישוב קיבולת אמיתי
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMonthAllocation}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>הוסף חודש</span>
              </button>
            </div>

            <div className="space-y-2">
              {monthlyAllocations.map((alloc, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                  <span className="text-slate-500 text-[11px] w-12 font-medium">חודש:</span>
                  <select
                    value={alloc.month}
                    onChange={(e) => handleAllocationMonthChange(idx, e.target.value)}
                    className="p-1 border border-slate-300 rounded text-xs"
                  >
                    {['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'].map((m) => (
                      <option key={m} value={m}>
                        {getHebrewMonthName(m)}
                      </option>
                    ))}
                  </select>

                  <span className="text-slate-500 text-[11px] mr-2">שעות מוקצות:</span>
                  <input
                    type="number"
                    min="0"
                    value={alloc.hours}
                    onChange={(e) => handleAllocationHourChange(idx, parseFloat(e.target.value) || 0)}
                    className="w-16 p-1 border border-slate-300 rounded font-mono font-bold text-center"
                  />

                  {monthlyAllocations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAllocation(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 mr-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-blue-200/60 font-medium">
              <span>סה״כ משובץ בפריסה חודשית: <strong>{totalAllocated} שעות</strong></span>
              <span>שעות נותרות במשימה: <strong>{remainingHours} שעות</strong></span>
            </div>
          </div>

          }

          {/* Comments history */}
          <div className="border border-slate-200 rounded-xl p-3 space-y-2">
            <div><span className="font-bold text-xs">הערות / תגובות למשימה</span><p className="text-[11px] text-slate-500">כל הערה נשמרת בנפרד עם תאריך ושעה ואינה דורסת הערות קודמות.</p></div>
            {taskToEdit?.notes && !(taskToEdit.comments?.length) && <div className="text-[11px] bg-amber-50 border border-amber-200 rounded p-2"><strong>הערה היסטורית:</strong> {taskToEdit.notes}</div>}
            {taskToEdit?.comments?.length ? <div className="max-h-32 overflow-y-auto space-y-1">{[...taskToEdit.comments].reverse().map(c=><div key={c.id} className="bg-slate-50 border rounded p-2 text-[11px]"><div>{c.text}</div><div className="text-[10px] text-slate-400 mt-1">{new Date(c.createdAt).toLocaleString('he-IL')} · {c.createdBy}</div></div>)}</div> : null}
            <textarea rows={2} value={newComment} onChange={(e)=>setNewComment(e.target.value)} placeholder="הוסף הערה חדשה..." className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2"/>
          </div>

          {taskToEdit && <div className="border border-slate-200 rounded-xl p-3 space-y-2"><div className="font-bold text-xs">היסטוריית שינויים במשימה</div><div className="max-h-32 overflow-y-auto space-y-1">{auditLogs.filter(l=>l.entityType==='Task' && l.entityId===taskToEdit.id).slice(0,20).map(l=><div key={l.id} className="text-[11px] bg-slate-50 border rounded p-2"><strong>{new Date(l.timestamp).toLocaleString('he-IL')}</strong> · {l.user} · {l.action}<div className="text-slate-500">{l.details || `${l.fieldName}: ${String(l.oldValue ?? '—')} → ${String(l.newValue ?? '—')}`}</div></div>)}{auditLogs.filter(l=>l.entityType==='Task' && l.entityId===taskToEdit.id).length===0 && <div className="text-[11px] text-slate-400">אין עדיין אירועי Audit למשימה זו.</div>}</div></div>}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              ביטול
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>{taskToEdit ? 'שמור שינויים' : 'צור משימה'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

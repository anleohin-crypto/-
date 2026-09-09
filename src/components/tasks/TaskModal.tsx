import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, AlertTriangle, Plus, Trash2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, Priority, TaskStatus, DelayReason } from '../../types';
import { getHebrewMonthName } from '../../services/capacityEngine';

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

  const totalAllocated = monthlyAllocations.reduce((a, b) => a + b.hours, 0);

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
      plannedEndDate,
      deadline,
      estimatedHours,
      actualHours,
      remainingHours,
      completionPercentage,
      status,
      isBillable,
      delayReason: delayReason ? (delayReason as DelayReason) : undefined,
      notes,
    };

    if (taskToEdit) {
      updateTask({ ...taskToEdit, ...payload }, monthlyAllocations);
    } else {
      addTask(payload, monthlyAllocations);
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

          {/* Section 8: Multi-Month Task Allocation (פריסת שעות לחודשים) */}
          <div className="border border-blue-200 bg-blue-50/40 p-3.5 rounded-xl space-y-2.5">
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

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">תיאור והערות</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="פרטים נוספים, דרישות אפיון או הנחיות עבודה..."
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 focus:bg-white"
            />
          </div>

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

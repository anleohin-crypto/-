import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Upload,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Task, Priority, TaskStatus } from '../../types';
import { ExcelService } from '../../services/excelService';

interface TasksViewProps {
  onOpenTaskModal: (task?: Task) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenTaskModal }) => {
  const {
    tasks,
    deleteTask,
    duplicateTask,
    employees,
    clients,
    filterClientId,
    setFilterClientId,
    filterEmployeeId,
    setFilterEmployeeId,
    settings,
    setCurrentTab,
    taskStatuses,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [billableFilter, setBillableFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [sortBy, setSortBy] = useState<'deadline' | 'remaining' | 'priority' | 'status'>('deadline');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const todayStr = new Date().toISOString().substring(0, 10);

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || id;
  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name || id;

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        // Search
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const match =
            t.name.toLowerCase().includes(q) ||
            t.taskNumber.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q));
          if (!match) return false;
        }

        // Filters
        if (filterClientId !== 'all' && t.clientId !== filterClientId) return false;
        if (filterEmployeeId !== 'all' && t.assigneeId !== filterEmployeeId) return false;
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (billableFilter !== 'all') {
          const isB = billableFilter === 'billable';
          if (t.isBillable !== isB) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'deadline') {
          cmp = a.deadline.localeCompare(b.deadline);
        } else if (sortBy === 'remaining') {
          cmp = (a.remainingHours || 0) - (b.remainingHours || 0);
        } else if (sortBy === 'status') {
          cmp = a.status.localeCompare(b.status);
        } else if (sortBy === 'priority') {
          const order = { 'קריטית': 4, 'גבוהה': 3, 'רגילה': 2, 'נמוכה': 1 };
          cmp = (order[b.priority] || 0) - (order[a.priority] || 0);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [
    tasks,
    searchQuery,
    filterClientId,
    filterEmployeeId,
    statusFilter,
    priorityFilter,
    billableFilter,
    sortBy,
    sortOrder,
  ]);

  const handleExport = () => {
    ExcelService.exportTasksToExcel(filteredTasks, employees, clients);
  };

  const getDeadlineBadge = (task: Task) => {
    if (task.status === 'הושלם' || task.status === 'בוטל') {
      return (
        <span className="text-[11px] text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> הושלם
        </span>
      );
    }

    if (task.deadline < todayStr) {
      return (
        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1 shrink-0">
          <AlertOctagon className="w-3 h-3" /> איחור בדדליין ({task.deadline})
        </span>
      );
    }

    // Days difference
    const diff = Math.ceil(
      (new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff <= settings.upcomingDeadlineDays) {
      return (
        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" /> בעוד {diff} ימים ({task.deadline})
        </span>
      );
    }

    return (
      <span className="text-[11px] text-slate-500 font-mono">
        {task.deadline}
      </span>
    );
  };

  const kanbanStatuses = useMemo(() => {
    return taskStatuses
      .filter((s) => s.active)
      .sort((a, b) => a.order - b.order)
      .map((s) => s.name);
  }, [taskStatuses]);

  const getStatusBadgeStyle = (statusName: string) => {
    const conf = taskStatuses.find((s) => s.name === statusName);
    if (!conf) return 'bg-slate-100 text-slate-700';
    switch (conf.color) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'indigo':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'rose':
        return 'bg-rose-100 text-rose-800 border border-rose-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'cyan':
        return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
      case 'slate':
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  const getStatusDotColor = (statusName: string) => {
    const conf = taskStatuses.find((s) => s.name === statusName);
    switch (conf?.color) {
      case 'emerald':
        return 'bg-emerald-500';
      case 'blue':
        return 'bg-blue-600';
      case 'indigo':
        return 'bg-indigo-600';
      case 'amber':
        return 'bg-amber-500';
      case 'rose':
        return 'bg-rose-600';
      case 'purple':
        return 'bg-purple-600';
      case 'cyan':
        return 'bg-cyan-600';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div id="tasks-view" className="space-y-5 animate-in fade-in duration-200">
      {/* Action Bar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חיפוש משימה לפי שם, מספר או תיאור..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-medium"
          >
            <option value="all">כל הסטטוסים</option>
            {taskStatuses
              .filter((s) => s.active)
              .sort((a, b) => a.order - b.order)
              .map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-medium"
          >
            <option value="all">כל העדיפויות</option>
            <option value="קריטית">קריטית</option>
            <option value="גבוהה">גבוהה</option>
            <option value="רגילה">רגילה</option>
            <option value="נמוכה">נמוכה</option>
          </select>

          {/* Billable Filter */}
          <select
            value={billableFilter}
            onChange={(e) => setBillableFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-medium"
          >
            <option value="all">כל הסוגים</option>
            <option value="billable">Billable בלבד</option>
            <option value="non_billable">Non-Billable בלבד</option>
          </select>

          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              title="תצוגת טבלה"
              className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              title="תצוגת לוח (Kanban)"
              className={`p-1.5 rounded-lg ${viewMode === 'kanban' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Export Excel */}
          <button
            id="btn-export-tasks-excel"
            onClick={handleExport}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="ייצוא משימות לאקסל"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Task Statuses Settings */}
          <button
            id="btn-nav-task-statuses"
            onClick={() => setCurrentTab('taskStatuses')}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="ניהול והגדרת סטטוסים למשימות"
          >
            <Tag className="w-4 h-4 text-slate-600" />
            <span className="hidden sm:inline">ניהול סטטוסים</span>
          </button>

          {/* Import Excel */}
          <button
            id="btn-nav-import-tasks-excel"
            onClick={() => setCurrentTab('importExport')}
            className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="ייבוא משימות מקובץ Excel"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">ייבוא Excel</span>
          </button>

          {/* New Task Button */}
          <button
            id="btn-new-task"
            onClick={() => onOpenTaskModal()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>משימה חדשה</span>
          </button>
        </div>
      </div>

      {/* Mode A: Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3.5">מזהה</th>
                  <th className="p-3.5">שם המשימה</th>
                  <th className="p-3.5">לקוח</th>
                  <th className="p-3.5">אחראי</th>
                  <th className="p-3.5">עדיפות</th>
                  <th className="p-3.5">סטטוס</th>
                  <th className="p-3.5">שעות נותרות</th>
                  <th className="p-3.5">% ביצוע</th>
                  <th className="p-3.5">דדליין וסיכון</th>
                  <th className="p-3.5">סוג</th>
                  <th className="p-3.5 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600">{t.taskNumber}</td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{t.name}</div>
                      {t.delayReason && (
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-0.5 inline-block">
                          עיכוב: {t.delayReason}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600">{getClientName(t.clientId)}</td>

                    <td className="p-3.5">
                      <span className="font-medium text-slate-800">{getEmployeeName(t.assigneeId)}</span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          t.priority === 'קריטית'
                            ? 'bg-rose-100 text-rose-700'
                            : t.priority === 'גבוהה'
                            ? 'bg-amber-100 text-amber-800'
                            : t.priority === 'רגילה'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${getStatusBadgeStyle(
                          t.status
                        )}`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-slate-800">
                      {t.remainingHours} ש׳
                      <span className="text-[10px] text-slate-400 block font-normal">
                        מתוך {t.estimatedHours}ש׳
                      </span>
                    </td>

                    <td className="p-3.5">
                      <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden mb-1">
                        <div
                          className="bg-blue-600 h-full rounded-full"
                          style={{ width: `${t.completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{t.completionPercentage}%</span>
                    </td>

                    <td className="p-3.5">{getDeadlineBadge(t)}</td>

                    <td className="p-3.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                          t.isBillable
                            ? 'bg-emerald-50 text-emerald-700 font-semibold'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {t.isBillable ? 'Billable' : 'פנימי'}
                      </span>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenTaskModal(t)}
                          title="ערוך משימה"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateTask(t.id)}
                          title="שכפל משימה"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`האם למחוק את המשימה ${t.name}?`)) {
                              deleteTask(t.id);
                            }
                          }}
                          title="מחק משימה"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      לא נמצאו משימות התואמות לחיפוש או לסינון הנוכחי.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mode B: Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
          {kanbanStatuses.map((status) => {
            const statusTasks = filteredTasks.filter((t) => t.status === status);
            return (
              <div
                key={status}
                className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3 space-y-2.5 min-h-[400px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(status)}`}
                    />
                    <span className="font-bold text-xs text-slate-800">{status}</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                    {statusTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {statusTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onOpenTaskModal(t)}
                      className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-blue-600">{t.taskNumber}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            t.priority === 'קריטית'
                              ? 'bg-rose-100 text-rose-700'
                              : t.priority === 'גבוהה'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      <h5 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2">
                        {t.name}
                      </h5>

                      <div className="text-[11px] text-slate-500">
                        {getClientName(t.clientId)} | {getEmployeeName(t.assigneeId)}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-700">{t.remainingHours} ש׳ נותרו</span>
                        {getDeadlineBadge(t)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

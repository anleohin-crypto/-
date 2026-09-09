import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  User,
  Clock,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName } from '../../services/capacityEngine';
import { Task } from '../../types';

interface GanttViewProps {
  onSelectTask?: (task: Task) => void;
}

export const GanttView: React.FC<GanttViewProps> = ({ onSelectTask }) => {
  const {
    tasks,
    employees,
    clients,
    selectedMonth,
    setSelectedMonth,
    filterEmployeeId,
    setFilterEmployeeId,
  } = useApp();

  const [timeframe, setTimeframe] = useState<'month' | 'quarter'>('month');

  // Days in month calculation
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name || id;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterEmployeeId !== 'all' && t.assigneeId !== filterEmployeeId) return false;
      // Show tasks active in this month
      const startM = t.plannedStartDate.substring(0, 7);
      const endM = t.plannedEndDate.substring(0, 7);
      return startM <= selectedMonth && endM >= selectedMonth;
    });
  }, [tasks, filterEmployeeId, selectedMonth]);

  // Group tasks by Employee
  const tasksByEmployee = useMemo(() => {
    const map: Record<string, Task[]> = {};
    employees.forEach((emp) => {
      if (filterEmployeeId === 'all' || emp.id === filterEmployeeId) {
        map[emp.id] = filteredTasks.filter((t) => t.assigneeId === emp.id);
      }
    });
    return map;
  }, [employees, filteredTasks, filterEmployeeId]);

  // Calculate left and width percentages for Gantt bar
  const getTaskBarPosition = (task: Task) => {
    const start = new Date(task.plannedStartDate);
    const end = new Date(task.plannedEndDate);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month - 1, daysInMonth);

    // Clamp to current month bounds
    const effectiveStart = start < monthStart ? monthStart : start;
    const effectiveEnd = end > monthEnd ? monthEnd : end;

    const startDay = effectiveStart.getDate();
    const endDay = effectiveEnd.getDate();

    const leftPercent = ((startDay - 1) / daysInMonth) * 100;
    const widthPercent = Math.max(2, ((endDay - startDay + 1) / daysInMonth) * 100);

    return { left: `${leftPercent}%`, width: `${widthPercent}%` };
  };

  const getTaskColor = (task: Task) => {
    if (task.status === 'הושלם') return 'bg-emerald-500 text-white';
    if (task.status === 'מעוכב') return 'bg-rose-500 text-white';
    if (task.status === 'בביצוע') return 'bg-blue-600 text-white';
    if (task.priority === 'קריטית') return 'bg-amber-600 text-white';
    return 'bg-indigo-500 text-white';
  };

  return (
    <div id="gantt-view" className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">גאנט משימות ולוחות זמנים</h2>
          <p className="text-xs text-slate-500">פריסת משימות לפי עובדים על ציר הזמן של {getHebrewMonthName(selectedMonth)}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Employee Filter */}
          <select
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="all">כל העובדים ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Month Navigator */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-xs font-semibold">
            {['2026-09', '2026-10', '2026-11'].map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMonth === m
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {getHebrewMonthName(m).split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt Timeline Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Timeline Header Row */}
        <div className="flex border-b border-slate-200 bg-slate-100 text-xs text-slate-600 font-semibold select-none">
          <div className="w-56 p-3 shrink-0 border-l border-slate-200">
            עובד / משימה
          </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
            {daysArray.map((day) => {
              const dayDate = new Date(year, month - 1, day);
              const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6; // Friday / Saturday
              return (
                <div
                  key={day}
                  className={`text-center py-2 text-[10px] border-l border-slate-200 font-mono ${
                    isWeekend ? 'bg-slate-200/60 font-bold text-slate-400' : 'text-slate-700'
                  }`}
                  title={`${day}/${month}/${year}`}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Employees & Task Bars */}
        <div className="divide-y divide-slate-100">
          {Object.entries(tasksByEmployee).map(([empId, tasksList]) => {
            const empTasks = tasksList as Task[];
            const employee = employees.find((e) => e.id === empId);
            if (!employee) return null;

            return (
              <div key={empId} className="group">
                {/* Employee Row Header */}
                <div className="flex bg-slate-50/70 border-b border-slate-100">
                  <div className="w-56 p-2.5 shrink-0 border-l border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                        {employee.name.charAt(0)}
                      </div>
                      <span className="font-bold text-xs text-slate-900">{employee.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{empTasks.length} משימות</span>
                  </div>

                  {/* Day background grid */}
                  <div
                    className="flex-1 grid pointer-events-none"
                    style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                  >
                    {daysArray.map((day) => {
                      const isWeekend = new Date(year, month - 1, day).getDay() === 5 || new Date(year, month - 1, day).getDay() === 6;
                      return (
                        <div
                          key={day}
                          className={`border-l border-slate-100 ${isWeekend ? 'bg-slate-100/50' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Individual Tasks Rows for this Employee */}
                {empTasks.length === 0 ? (
                  <div className="flex py-2 text-xs text-slate-400 italic pr-6 bg-white">
                    אין משימות מתוכננות לחודש זה
                  </div>
                ) : (
                  empTasks.map((task) => {
                    const barPos = getTaskBarPosition(task);
                    return (
                      <div
                        key={task.id}
                        className="flex items-center hover:bg-slate-50/80 transition-colors border-b border-slate-100 relative py-1.5"
                      >
                        {/* Task Title Column */}
                        <div
                          className="w-56 px-3 shrink-0 border-l border-slate-200 truncate cursor-pointer"
                          onClick={() => onSelectTask && onSelectTask(task)}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-blue-600">
                              {task.taskNumber}
                            </span>
                            <span className="text-xs font-medium text-slate-800 truncate" title={task.name}>
                              {task.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {getClientName(task.clientId)} | {task.remainingHours} ש׳
                          </div>
                        </div>

                        {/* Gantt Bar Lane */}
                        <div className="flex-1 relative h-7 flex items-center px-1">
                          {/* Background day columns */}
                          <div
                            className="absolute inset-0 grid pointer-events-none"
                            style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}
                          >
                            {daysArray.map((day) => {
                              const isWeekend = new Date(year, month - 1, day).getDay() === 5 || new Date(year, month - 1, day).getDay() === 6;
                              return (
                                <div
                                  key={day}
                                  className={`border-l border-slate-100/60 h-full ${
                                    isWeekend ? 'bg-slate-100/40' : ''
                                  }`}
                                />
                              );
                            })}
                          </div>

                          {/* Task Bar */}
                          <div
                            style={{ left: barPos.left, width: barPos.width }}
                            onClick={() => onSelectTask && onSelectTask(task)}
                            className={`absolute h-6 rounded-md shadow-xs flex items-center justify-between px-2 text-[10px] font-semibold truncate cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${getTaskColor(
                              task
                            )}`}
                            title={`${task.name}\nהתחלה: ${task.plannedStartDate} | סיום: ${task.plannedEndDate}\nדדליין: ${task.deadline}\nשעות נותרות: ${task.remainingHours}`}
                          >
                            <span className="truncate">{task.name}</span>
                            <span className="font-mono text-[9px] shrink-0 mr-1 opacity-90">
                              {task.remainingHours}ש׳
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

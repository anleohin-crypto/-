import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  User,
  Clock,
  CalendarOff,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getHebrewMonthName } from '../../services/capacityEngine';
import { Task } from '../../types';

interface CalendarViewProps {
  onSelectTask?: (task: Task) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ onSelectTask }) => {
  const {
    tasks,
    absences,
    employees,
    selectedMonth,
    setSelectedMonth,
    filterEmployeeId,
    setFilterEmployeeId,
    settings,
  } = useApp();

  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Month grid calculation
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month, 0).getDate();

  // Create 35 or 42 grid cells (Sunday to Saturday)
  const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name || id;

  // Absences in selected month
  const monthAbsences = useMemo(() => {
    return absences.filter((a) => {
      if (filterEmployeeId !== 'all' && a.employeeId !== filterEmployeeId) return false;
      const startM = a.startDate.substring(0, 7);
      const endM = a.endDate.substring(0, 7);
      return startM <= selectedMonth && endM >= selectedMonth;
    });
  }, [absences, filterEmployeeId, selectedMonth]);

  // Tasks with deadlines or active in this month
  const monthTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterEmployeeId !== 'all' && t.assigneeId !== filterEmployeeId) return false;
      return t.deadline.startsWith(selectedMonth);
    });
  }, [tasks, filterEmployeeId, selectedMonth]);

  // Map events to day
  const eventsByDay = useMemo(() => {
    const map: Record<number, { tasks: Task[]; absences: typeof absences }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${month < 10 ? '0' + month : month}-${d < 10 ? '0' + d : d}`;

      const dayTasks = monthTasks.filter((t) => t.deadline === dateStr);
      const dayAbsences = monthAbsences.filter((a) => a.startDate <= dateStr && a.endDate >= dateStr);

      map[d] = { tasks: dayTasks, absences: dayAbsences };
    }
    return map;
  }, [daysInMonth, year, month, monthTasks, monthAbsences]);

  return (
    <div id="calendar-view" className="space-y-4 animate-in fade-in duration-200">
      {/* Calendar Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">לוח עבודה ותכנון חודשי</h2>
          <p className="text-xs text-slate-500">
            תצוגת דדליינים, שיבוצים והיעדרויות עבור {getHebrewMonthName(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700"
          >
            <option value="all">כל העובדים</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Month selector */}
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

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-bold text-xs text-slate-600 py-2.5">
          {daysOfWeek.map((dow, idx) => (
            <div key={dow} className={idx >= 5 ? 'text-slate-400' : ''}>
              {dow}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-200">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-28 bg-slate-50/50" />
          ))}

          {/* Actual days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const events = eventsByDay[dayNum] || { tasks: [], absences: [] };
            const dayDate = new Date(year, month - 1, dayNum);
            const isWeekend = dayDate.getDay() === 5 || dayDate.getDay() === 6;
            const hasDeadlines = events.tasks.length > 0;
            const hasAbsences = events.absences.length > 0;
            const isSelected = selectedDay === dayNum;
            const dateStr = `${year}-${month < 10 ? '0' + month : month}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
            const shortenedDay = settings.shortenedDays?.find((sd) => sd.date === dateStr);

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => setSelectedDay(dayNum)}
                className={`h-28 p-1.5 flex flex-col justify-between transition-colors cursor-pointer overflow-hidden ${
                  isWeekend
                    ? 'bg-slate-50/40'
                    : shortenedDay
                    ? 'bg-amber-50/30 hover:bg-amber-50/60'
                    : 'bg-white hover:bg-blue-50/30'
                } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                      hasDeadlines ? 'bg-blue-600 text-white' : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>

                  <div className="flex items-center gap-1">
                    {shortenedDay && (
                      <span
                        title={`יום מקוצר: ${shortenedDay.title} (${shortenedDay.workingHours} שעות)`}
                        className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1 rounded flex items-center gap-0.5"
                      >
                        <Clock className="w-2.5 h-2.5 text-amber-700" />
                        <span>{shortenedDay.workingHours}ש׳</span>
                      </span>
                    )}

                    {hasAbsences && (
                      <span
                        title="היעדרות עובד ביום זה"
                        className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded flex items-center gap-0.5"
                      >
                        <CalendarOff className="w-2.5 h-2.5" />
                        <span>{events.absences.length}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Day Content Badges */}
                <div className="space-y-1 overflow-hidden my-1">
                  {shortenedDay && (
                    <div
                      className="bg-amber-100/90 text-amber-900 border border-amber-300/80 text-[9px] px-1 py-0.5 rounded truncate font-bold flex items-center gap-1"
                      title={`${shortenedDay.title} (${shortenedDay.workingHours} שעות)`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0"></span>
                      <span className="truncate">{shortenedDay.title}</span>
                    </div>
                  )}

                  {events.tasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectTask) onSelectTask(t);
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-[10px] px-1 py-0.5 rounded truncate font-medium flex items-center justify-between"
                      title={`${t.taskNumber}: ${t.name}`}
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="font-mono text-[9px] text-blue-700">{t.remainingHours}ש׳</span>
                    </div>
                  ))}

                  {events.tasks.length > 2 && (
                    <div className="text-[10px] text-slate-500 font-medium text-center">
                      +{events.tasks.length - 2} נוספות
                    </div>
                  )}

                  {events.absences.slice(0, 1).map((a) => (
                    <div
                      key={a.id}
                      className="bg-amber-50 text-amber-900 border border-amber-200 text-[9px] px-1 py-0.5 rounded truncate"
                      title={`${getEmployeeName(a.employeeId)}: ${a.type}`}
                    >
                      {getEmployeeName(a.employeeId)} ({a.type})
                    </div>
                  ))}
                </div>

                <div className="text-[9px] text-slate-400 text-left font-mono">
                  {events.tasks.length > 0 && `${events.tasks.length} דדליינים`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details Panel */}
      {selectedDay && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="font-bold text-sm text-slate-900">
              פירוט פעילות ליום: {selectedDay} ב{getHebrewMonthName(selectedMonth)}
            </h4>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              סגור פירוט ✕
            </button>
          </div>

          {(() => {
            const dateStr = `${year}-${month < 10 ? '0' + month : month}-${selectedDay < 10 ? '0' + selectedDay : selectedDay}`;
            const sd = settings.shortenedDays?.find((s) => s.date === dateStr);
            if (!sd) return null;
            const standardDaily = settings.defaultDailyHours || settings.workingHoursPerDay || 9;
            const reduction = Math.max(0, standardDaily - sd.workingHours);
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">יום עבודה מקוצר: {sd.title}</span>
                    <span className="text-amber-700 block text-[11px]">
                      {sd.workingHours} שעות עבודה בפועל (קיזוז {reduction} שעות מתקן הברוטו החודשי)
                      {sd.notes ? ` • ${sd.notes}` : ''}
                    </span>
                  </div>
                </div>
                <span className="bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                  מועד מקוצר
                </span>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Day Tasks */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">דדליינים של משימות:</div>
              {eventsByDay[selectedDay]?.tasks.length === 0 ? (
                <div className="text-xs text-slate-400 italic">אין דדליינים ביום זה</div>
              ) : (
                <div className="space-y-1.5">
                  {eventsByDay[selectedDay]?.tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask && onSelectTask(t)}
                      className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-blue-600 ml-1">{t.taskNumber}</span>
                        <span className="font-semibold text-slate-900">{t.name}</span>
                        <div className="text-[11px] text-slate-500">
                          אחראי: {getEmployeeName(t.assigneeId)} | {t.status}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-800">{t.remainingHours} שעות</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Day Absences */}
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">היעדרויות עובדים:</div>
              {eventsByDay[selectedDay]?.absences.length === 0 ? (
                <div className="text-xs text-slate-400 italic">אין היעדרויות ביום זה</div>
              ) : (
                <div className="space-y-1.5">
                  {eventsByDay[selectedDay]?.absences.map((a) => (
                    <div
                      key={a.id}
                      className="p-2 rounded-lg border border-amber-200 bg-amber-50 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-amber-900">{getEmployeeName(a.employeeId)}</span>
                        <span className="text-amber-800 mr-2">({a.type})</span>
                        {a.notes && <div className="text-[11px] text-amber-700">{a.notes}</div>}
                      </div>
                      <span className="font-mono font-bold text-amber-800">{a.hours} שעות</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

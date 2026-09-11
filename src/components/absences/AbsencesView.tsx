import React, { useState, useMemo } from 'react';
import {
  CalendarOff,
  Plus,
  Trash2,
  Calendar,
  User,
  Clock,
  Check,
  X,
  AlertTriangle,
  Users,
  Sparkles,
  Search,
  Filter,
  Info,
  CheckSquare,
  Square,
  Sun,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Absence, AbsenceType, TeamWideAbsenceInput } from '../../types';

export const AbsencesView: React.FC = () => {
  const {
    absences,
    addAbsence,
    deleteAbsence,
    addTeamWideAbsence,
    deleteTeamWideAbsence,
    employees,
    selectedMonth,
    settings,
    absenceRequests,
    setCurrentTab,
  } = useApp();

  const pendingCount = absenceRequests.filter((r) => r.status === 'PENDING').length;

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    absenceId: string;
    collectiveId?: string;
    collectiveTitle?: string;
    employeeName: string;
    totalInGroup: number;
  } | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'team_wide' | 'individual' | AbsenceType>('all');
  const [filterMonthOnly, setFilterMonthOnly] = useState(false);

  // Single Absence Form State
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || '');
  const [type, setType] = useState<AbsenceType>('חופשה');
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [hours, setHours] = useState(9);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Team-wide Absence Form State
  const [teamTitle, setTeamTitle] = useState('הדממת חול המועד פסח');
  const [teamType, setTeamType] = useState<AbsenceType>('חופשה מרוכזת');
  const [teamStartDate, setTeamStartDate] = useState(new Date().toISOString().substring(0, 10));
  const [teamEndDate, setTeamEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [hoursMode, setHoursMode] = useState<'employee_daily_hours' | 'fixed_hours'>('employee_daily_hours');
  const [fixedHoursPerDay, setFixedHoursPerDay] = useState<number>(settings.workingHoursPerDay || 9);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(employees.filter(e => e.isActive).map(e => e.id));
  const [teamNotes, setTeamNotes] = useState('');
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const getEmployeeName = (id: string) => employees.find((e) => e.id === id)?.name || id;

  // Calculate working days according to the configured organization work week.
  const calculateWorkDays = (start: string, end: string) => {
    if (!start || !end || end < start) return 0;
    const configuredWorkDays = settings.workDaysOfWeek || [0, 1, 2, 3, 4];
    const dStart = new Date(start);
    const dEnd = new Date(end);
    let count = 0;
    const cur = new Date(dStart);
    while (cur <= dEnd) {
      const day = cur.getDay();
      if (configuredWorkDays.includes(day)) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  // Auto calculate hours for single absence
  const handleSingleDatesChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    const workDays = calculateWorkDays(start, end);
    const emp = employees.find((e) => e.id === employeeId);
    const dailyHours = emp?.dailyWorkHours || settings.workingHoursPerDay || 9;
    setHours(Math.max(1, workDays * dailyHours));
  };

  // Group team-wide absences
  const teamWideGroups = useMemo(() => {
    const map: Record<
      string,
      {
        collectiveId: string;
        title: string;
        type: AbsenceType;
        startDate: string;
        endDate: string;
        totalHours: number;
        employeeIds: string[];
        notes?: string;
      }
    > = {};

    absences.forEach((a) => {
      if (a.collectiveId) {
        if (!map[a.collectiveId]) {
          map[a.collectiveId] = {
            collectiveId: a.collectiveId,
            title: a.collectiveTitle || 'חופשה מרוכזת לצוות',
            type: a.type,
            startDate: a.startDate,
            endDate: a.endDate,
            totalHours: 0,
            employeeIds: [],
            notes: a.notes,
          };
        }
        map[a.collectiveId].totalHours += a.hours || 0;
        if (!map[a.collectiveId].employeeIds.includes(a.employeeId)) {
          map[a.collectiveId].employeeIds.push(a.employeeId);
        }
      }
    });

    return Object.values(map);
  }, [absences]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees for team modal
  const modalFilteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (!e.isActive) return false;
      if (departmentFilter !== 'all' && e.department !== departmentFilter) return false;
      return true;
    });
  }, [employees, departmentFilter]);

  // Working days for team modal
  const teamWorkDays = useMemo(() => {
    return calculateWorkDays(teamStartDate, teamEndDate);
  }, [teamStartDate, teamEndDate]);

  // Estimated total hours for team modal
  const teamEstimatedHours = useMemo(() => {
    return selectedEmpIds.reduce((sum, empId) => {
      const emp = employees.find((e) => e.id === empId);
      const daily =
        hoursMode === 'fixed_hours'
          ? fixedHoursPerDay || settings.workingHoursPerDay || 9
          : emp?.dailyWorkHours || settings.workingHoursPerDay || 9;
      return sum + teamWorkDays * daily;
    }, 0);
  }, [selectedEmpIds, teamWorkDays, hoursMode, fixedHoursPerDay, employees, settings]);

  // Filtered absences list
  const filteredAbsences = useMemo(() => {
    return absences.filter((a) => {
      // Search term
      if (searchTerm.trim()) {
        const empName = getEmployeeName(a.employeeId).toLowerCase();
        const term = searchTerm.toLowerCase();
        const matchesName = empName.includes(term);
        const matchesNotes = (a.notes || '').toLowerCase().includes(term);
        const matchesTitle = (a.collectiveTitle || '').toLowerCase().includes(term);
        if (!matchesName && !matchesNotes && !matchesTitle) return false;
      }

      // Filter type
      if (filterType === 'team_wide' && !a.isTeamWide && !a.collectiveId) return false;
      if (filterType === 'individual' && (a.isTeamWide || a.collectiveId)) return false;
      if (filterType !== 'all' && filterType !== 'team_wide' && filterType !== 'individual') {
        if (a.type !== filterType) return false;
      }

      // Filter month only
      if (filterMonthOnly) {
        const startM = a.startDate.substring(0, 7);
        const endM = a.endDate.substring(0, 7);
        if (startM > selectedMonth || endM < selectedMonth) return false;
      }

      return true;
    });
  }, [absences, searchTerm, filterType, filterMonthOnly, selectedMonth, employees]);

  // Quick preset loader for team vacations
  const applyPreset = (title: string, defaultType: AbsenceType = 'חופשה מרוכזת') => {
    setTeamTitle(title);
    setTeamType(defaultType);
  };

  // Submit single absence
  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setFormError('נא לבחור עובד');
      return;
    }
    if (endDate < startDate) {
      setFormError('תאריך סיום אינו יכול להיות מוקדם מתאריך ההתחלה');
      return;
    }
    if (hours <= 0) {
      setFormError('מספר שעות היעדרות חייב להיות גדול מאפס');
      return;
    }

    addAbsence({
      employeeId,
      type,
      startDate,
      endDate,
      hours,
      notes: notes || undefined,
      isPlanned: true,
    });

    setIsSingleModalOpen(false);
    setNotes('');
    setFormError(null);
  };

  // Submit team-wide absence
  const handleTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamTitle.trim()) {
      setTeamFormError('נא להזין שם / סיבה לחופשה המרוכזת');
      return;
    }
    if (teamEndDate < teamStartDate) {
      setTeamFormError('תאריך סיום אינו יכול להיות מוקדם מתאריך ההתחלה');
      return;
    }
    if (selectedEmpIds.length === 0) {
      setTeamFormError('יש לבחור לפחות עובד אחד');
      return;
    }
    if (teamWorkDays <= 0) {
      setTeamFormError('הטווח שנבחר כולל רק סופי שבוע. נא לבחור תאריכים הכוללים ימי עבודה (א׳-ה׳)');
      return;
    }

    const input: TeamWideAbsenceInput = {
      title: teamTitle.trim(),
      type: teamType,
      startDate: teamStartDate,
      endDate: teamEndDate,
      hoursCalculationMode: hoursMode,
      fixedHoursPerDay: hoursMode === 'fixed_hours' ? fixedHoursPerDay : undefined,
      employeeIds: selectedEmpIds,
      notes: teamNotes.trim() || undefined,
    };

    addTeamWideAbsence(input);
    setIsTeamModalOpen(false);
    setTeamNotes('');
    setTeamFormError(null);
  };

  const handleOpenTeamModal = () => {
    setSelectedEmpIds(employees.filter((e) => e.isActive).map((e) => e.id));
    setTeamStartDate(new Date().toISOString().substring(0, 10));
    setTeamEndDate(new Date().toISOString().substring(0, 10));
    setHoursMode('employee_daily_hours');
    setDepartmentFilter('all');
    setTeamFormError(null);
    setIsTeamModalOpen(true);
  };

  const getTypeBadgeClass = (t: AbsenceType) => {
    switch (t) {
      case 'חופשה מרוכזת':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'חופשה':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'מחלה':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'מילואים':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'חג':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleDeleteClick = (abs: Absence) => {
    if (abs.collectiveId) {
      // It's a team-wide absence
      const count = absences.filter((a) => a.collectiveId === abs.collectiveId).length;
      setDeleteConfirmTarget({
        absenceId: abs.id,
        collectiveId: abs.collectiveId,
        collectiveTitle: abs.collectiveTitle || abs.notes || 'חופשה מרוכזת',
        employeeName: getEmployeeName(abs.employeeId),
        totalInGroup: count,
      });
    } else {
      if (window.confirm(`האם למחוק דיווח היעדרות עבור ${getEmployeeName(abs.employeeId)}?`)) {
        deleteAbsence(abs.id);
      }
    }
  };

  return (
    <div id="absences-view" className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">היעדרויות, חופשות מרוכזות ומילואים</h2>
            <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-xs">
              {absences.length} דיווחים
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            היעדרויות מקוזזות אוטומטית מקיבולת הברוטו של העובדים ומעדכנות בזמן אמת את הניצולת ולוח הגאנט
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCurrentTab('absenceApproval')}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-2xs"
            title="מעבר לחלון אישור בקשות וניתוח השפעת היעדרות בזמן אמת"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>אישור בקשות</span>
            {pendingCount > 0 && (
              <span className="bg-rose-600 text-white font-mono text-2xs px-1.5 py-0.2 rounded-full font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setCurrentTab('myAbsences')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-slate-500" />
            <span>הגשת בקשה כעובד</span>
          </button>

          <button
            id="btn-add-team-absence"
            onClick={handleOpenTeamModal}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
            title="קביעת חופשה מרוכזת או הדממה לכלל הצוות בלחיצה אחת"
          >
            <Users className="w-4 h-4 text-purple-200" />
            <span>חופשה מרוכזת לצוות</span>
          </button>

          <button
            id="btn-add-single-absence"
            onClick={() => {
              setEmployeeId(employees[0]?.id || '');
              handleSingleDatesChange(
                new Date().toISOString().substring(0, 10),
                new Date().toISOString().substring(0, 10)
              );
              setFormError(null);
              setIsSingleModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>היעדרות אישית לעובד</span>
          </button>
        </div>
      </div>

      {/* Team-wide Vacations Management Banner / Active Groups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-800">
              חופשות מרוכזות והדממות מוגדרות ({teamWideGroups.length})
            </h3>
          </div>
          {teamWideGroups.length > 0 && (
            <span className="text-[11px] text-purple-700 font-medium">
              חופשות אלו חלות על מגוון עובדים במקביל ומופיעות בלוח העבודה
            </span>
          )}
        </div>

        {teamWideGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {teamWideGroups.map((group) => (
              <div
                key={group.collectiveId}
                className="bg-purple-50/50 border border-purple-200 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all relative group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h4 className="font-bold text-sm text-purple-950 truncate" title={group.title}>
                        {group.title}
                      </h4>
                      <span className="text-[10px] bg-purple-200/80 text-purple-900 px-1.5 py-0.5 rounded-sm font-semibold">
                        {group.type}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `האם למחוק את החופשה המרוכזת "${group.title}" עבור כל ${group.employeeIds.length} העובדים?`
                        )
                      ) {
                        deleteTeamWideAbsence(group.collectiveId);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors shrink-0"
                    title="מחק חופשה מרוכזת זו מכלל הצוות"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1 border-t border-purple-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">טווח תאריכים:</span>
                    <span className="font-mono font-semibold text-slate-800 dir-ltr text-[11px]">
                      {group.startDate} ➔ {group.endDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">עובדים נכללים:</span>
                    <span className="font-bold text-purple-900">
                      {group.employeeIds.length} עובדים
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">סה״כ שעות שקוזזו:</span>
                    <span className="font-mono font-bold text-rose-700">
                      -{group.totalHours} שעות
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-purple-50/80 via-blue-50/40 to-slate-50 border border-purple-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  סימון חופשות מרוכזות, הדממות וערבי חג
                </h4>
                <p className="text-[11px] text-slate-600">
                  ניתן לקבוע חופשה לכלל העובדים (חול המועד פסח, סוכות, ימי גיבוש או גשרים) בלחיצה אחת, עם קיזוז שעות אוטומטי בהתאם לשעות היומיות של כל עובד.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenTeamModal}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shrink-0 shadow-2xs transition-colors"
            >
              + הגדרת חופשה מרוכזת
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="חיפוש לפי שם עובד, סיבה או כותרת חופשה..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              הכל ({absences.length})
            </button>
            <button
              onClick={() => setFilterType('team_wide')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterType === 'team_wide'
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-purple-700 hover:bg-purple-100/50'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>חופשות מרוכזות ({absences.filter((a) => a.isTeamWide || a.collectiveId).length})</span>
            </button>
            <button
              onClick={() => setFilterType('individual')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'individual'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              היעדרויות אישיות ({absences.filter((a) => !a.isTeamWide && !a.collectiveId).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 select-none bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={filterMonthOnly}
              onChange={(e) => setFilterMonthOnly(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span>רק החודש הנבחר ({selectedMonth})</span>
          </label>
        </div>
      </div>

      {/* Absences Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="p-3.5">עובד</th>
                <th className="p-3.5">סוג היעדרות</th>
                <th className="p-3.5">מתאריך</th>
                <th className="p-3.5">עד תאריך</th>
                <th className="p-3.5">שעות לקיזוז</th>
                <th className="p-3.5">פרטים / שם חופשה</th>
                <th className="p-3.5 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAbsences.map((abs) => {
                const isCollective = !!(abs.isTeamWide || abs.collectiveId);
                const emp = employees.find((e) => e.id === abs.employeeId);

                return (
                  <tr
                    key={abs.id}
                    className={`transition-colors ${
                      isCollective ? 'bg-purple-50/20 hover:bg-purple-50/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCollective
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getEmployeeName(abs.employeeId).charAt(0)}
                      </div>
                      <div>
                        <div>{getEmployeeName(abs.employeeId)}</div>
                        {emp?.role && (
                          <div className="text-[10px] text-slate-400 font-normal">{emp.role}</div>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTypeBadgeClass(
                            abs.type
                          )}`}
                        >
                          {abs.type}
                        </span>

                        {isCollective && (
                          <span className="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>חופשה מרוכזת</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-slate-700">{abs.startDate}</td>
                    <td className="p-3.5 font-mono text-slate-700">{abs.endDate}</td>

                    <td className="p-3.5 font-mono font-bold text-rose-700">
                      -{abs.hours} שעות
                    </td>

                    <td className="p-3.5 text-slate-600">
                      {abs.collectiveTitle ? (
                        <div className="space-y-0.5">
                          <span className="font-semibold text-purple-950 bg-purple-100/60 px-2 py-0.5 rounded text-[11px] inline-block">
                            {abs.collectiveTitle}
                          </span>
                          {abs.notes && abs.notes !== abs.collectiveTitle && (
                            <div className="text-[11px] text-slate-500">{abs.notes}</div>
                          )}
                        </div>
                      ) : (
                        <span>{abs.notes || '-'}</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleDeleteClick(abs)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={isCollective ? 'מחק היעדרות (אישית או מרוכזת)' : 'מחק היעדרות'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredAbsences.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    לא נמצאו היעדרויות התואמות לחיפוש או לסינון הנוכחי.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team-Wide Absence Modal */}
      {isTeamModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsTeamModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-right border border-slate-200 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-purple-950">
                    הגדרת חופשה מרוכזת לכלל הצוות
                  </h3>
                  <p className="text-[11px] text-purple-700">
                    החלת הדממה, חול המועד או יום גיבוש על קיבולת העובדים בבת אחת
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTeamSubmit} className="p-5 space-y-4 text-xs">
              {teamFormError && (
                <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{teamFormError}</span>
                </div>
              )}

              {/* Quick Presets */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>בחירה מהירה מתבניות נפוצות:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('הדממת חול המועד פסח')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors"
                  >
                    🌴 פסח (חול המועד)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('הדממת חול המועד סוכות')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors"
                  >
                    🌿 סוכות (חול המועד)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('גשר יום העצמאות')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors"
                  >
                    🌟 גשר ערב חג / עצמאות
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('יום גיבוש ויציאת צוות', 'אחר')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors"
                  >
                    🚀 יום גיבוש צוות
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('חופשת סוף שנה ארגונית')}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border border-slate-200 transition-colors"
                  >
                    ❄️ חופשת סוף שנה
                  </button>
                </div>
              </div>

              {/* Title & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    שם החופשה / סיבה <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={teamTitle}
                    onChange={(e) => setTeamTitle(e.target.value)}
                    placeholder="לדוגמה: הדממת פסח / יום גיבוש"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">סיווג היעדרות</label>
                  <select
                    value={teamType}
                    onChange={(e) => setTeamType(e.target.value as AbsenceType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  >
                    <option value="חופשה מרוכזת">חופשה מרוכזת</option>
                    <option value="חופשה">חופשה</option>
                    <option value="חג">חג / ערב חג</option>
                    <option value="אחר">אחר</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">מתאריך</label>
                  <input
                    type="date"
                    required
                    value={teamStartDate}
                    onChange={(e) => setTeamStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">עד תאריך</label>
                  <input
                    type="date"
                    required
                    value={teamEndDate}
                    onChange={(e) => setTeamEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600">
                <span>ימי עבודה מחושבים בטווח לפי הגדרות המערכת:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">
                  {teamWorkDays} ימי עבודה
                </span>
              </div>

              {/* Hours calculation mode */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  אופן חישוב שעות לניכוי לכל עובד:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                      hoursMode === 'employee_daily_hours'
                        ? 'border-purple-500 bg-purple-50/60 text-purple-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="hoursMode"
                      checked={hoursMode === 'employee_daily_hours'}
                      onChange={() => setHoursMode('employee_daily_hours')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <div>לפי שעות יומיות של כל עובד</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        מותאם אישית לאחוזי המשרה של כל עובד
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border flex items-start gap-2 cursor-pointer transition-colors ${
                      hoursMode === 'fixed_hours'
                        ? 'border-purple-500 bg-purple-50/60 text-purple-950 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="hoursMode"
                      checked={hoursMode === 'fixed_hours'}
                      onChange={() => setHoursMode('fixed_hours')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <div>מספר שעות אחיד ליום לכולם</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        מתאים לערבי חג (למשל 4 שעות) או חצי יום
                      </div>
                    </div>
                  </label>
                </div>

                {hoursMode === 'fixed_hours' && (
                  <div className="mt-2 flex items-center gap-2 bg-purple-50/50 p-2 rounded-xl border border-purple-200">
                    <span className="text-slate-700 font-semibold">שעות ליום לכל עובד:</span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={fixedHoursPerDay}
                      onChange={(e) => setFixedHoursPerDay(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 font-bold font-mono text-center"
                    />
                    <span className="text-slate-500">שעות ליום</span>
                  </div>
                )}
              </div>

              {/* Employee Selection List */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">
                    בחירת עובדים ({selectedEmpIds.length} מתוך {employees.filter((e) => e.isActive).length} נבחרו):
                  </label>
                  <div className="flex items-center gap-2">
                    {departments.length > 0 && (
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[11px]"
                      >
                        <option value="all">כל המחלקות</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedEmpIds(employees.filter((e) => e.isActive).map((e) => e.id))
                      }
                      className="text-purple-600 hover:text-purple-800 text-[11px] font-semibold"
                    >
                      בחר הכל
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedEmpIds([])}
                      className="text-slate-500 hover:text-slate-700 text-[11px]"
                    >
                      נקה הכל
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 divide-y divide-slate-100 bg-slate-50/50">
                  {modalFilteredEmployees.map((emp) => {
                    const isSelected = selectedEmpIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-100 rounded-lg cursor-pointer select-none text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmpIds((prev) => [...prev, emp.id]);
                              } else {
                                setSelectedEmpIds((prev) => prev.filter((id) => id !== emp.id));
                              }
                            }}
                            className="rounded text-purple-600"
                          />
                          <span className="font-semibold text-slate-800">{emp.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {emp.role || emp.department}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">
                          {emp.dailyWorkHours || 9} שעות/יום
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">הערות נוספות (אופציונלי)</label>
                <input
                  type="text"
                  value={teamNotes}
                  onChange={(e) => setTeamNotes(e.target.value)}
                  placeholder="לדוגמה: הדממה ארגונית מוסכמת / תורנים יוחרגו"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              {/* Real-time Summary Box */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center justify-between text-purple-950 font-medium">
                <div>
                  <span className="font-bold">סיכום השפעה: </span>
                  <span>
                    {selectedEmpIds.length} עובדים × {teamWorkDays} ימי עבודה
                  </span>
                </div>
                <div className="font-bold text-rose-700 font-mono text-sm">
                  ~{teamEstimatedHours} שעות סה״כ
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={selectedEmpIds.length === 0}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>החל חופשה מרוכזת על הצוות</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Absence Modal */}
      {isSingleModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsSingleModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-base text-slate-900">דיווח היעדרות אישית לעובד</h3>
              <button onClick={() => setIsSingleModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="bg-rose-50 text-rose-800 p-2.5 rounded-lg border border-rose-200">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">עובד</label>
                <select
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    const emp = employees.find((x) => x.id === e.target.value);
                    const dailyHours = emp?.dailyWorkHours || settings.workingHoursPerDay || 9;
                    const workDays = calculateWorkDays(startDate, endDate);
                    setHours(Math.max(1, workDays * dailyHours));
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">סוג היעדרות</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as AbsenceType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                >
                  <option value="חופשה">חופשה</option>
                  <option value="מחלה">מחלה</option>
                  <option value="מילואים">מילואים</option>
                  <option value="חופשה מרוכזת">חופשה מרוכזת</option>
                  <option value="חג">חג / ערב חג</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">מתאריך</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => handleSingleDatesChange(e.target.value, endDate)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">עד תאריך</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => handleSingleDatesChange(startDate, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  שעות לקיזוז מהקיבולת
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={hours}
                  onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  מחושב לפי ימי העבודה המוגדרים במערכת
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">הערות / סיבה</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="לדוגמה: חופשה שנתית / אישור רופא"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  שמור היעדרות
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Team-Wide Absences */}
      {deleteConfirmTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeleteConfirmTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-right border border-slate-200 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">מחיקת היעדרות מחופשה מרוכזת</h3>
                <p className="text-xs text-slate-500">
                  היעדרות זו היא חלק מהחופשה המרוכזת "{deleteConfirmTarget.collectiveTitle}"
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              החופשה המרוכזת מוגדרת כעת עבור <strong>{deleteConfirmTarget.totalInGroup} עובדים</strong> בצוות.
              כיצד ברצונך לפעול?
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  deleteAbsence(deleteConfirmTarget.absenceId);
                  setDeleteConfirmTarget(null);
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs text-right flex items-center justify-between transition-colors"
              >
                <span>הסר את החופשה <strong>רק עבור {deleteConfirmTarget.employeeName}</strong></span>
                <span className="text-[11px] text-slate-500">(העובדים האחרים יישארו)</span>
              </button>

              {deleteConfirmTarget.collectiveId && (
                <button
                  type="button"
                  onClick={() => {
                    deleteTeamWideAbsence(deleteConfirmTarget.collectiveId!);
                    setDeleteConfirmTarget(null);
                  }}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs text-right flex items-center justify-between shadow-xs transition-colors"
                >
                  <span>מחק את החופשה המרוכזת <strong>לכלל הצוות ({deleteConfirmTarget.totalInGroup} עובדים)</strong></span>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="w-full py-2 text-center text-slate-500 hover:text-slate-700 text-xs font-medium pt-1"
              >
                ביטול ללא שינוי
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
